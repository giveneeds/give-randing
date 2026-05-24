import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

/**
 * POST /api/campaigns/[id]/resources/[resourceId]/download
 *
 * 두 가지 인증 경로 지원:
 *   (1) Authorization 헤더의 Supabase JWT — 카카오 OAuth 로 로그인한 사용자
 *   (2) ?token=<uuid> 쿼리 파라미터 — basic 모드 폼 제출 직후 발급된 1회용 토큰
 *
 * 어느 한 쪽이라도 통과하면 60초짜리 서명 URL 을 발급한다.
 * resource_downloads 로그를 기록한다 (감사 추적).
 */
export async function POST(request, { params }) {
  const { id: campaignId, resourceId } = await params;
  if (!campaignId || !resourceId) {
    return NextResponse.json({ error: 'id 누락' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  // 인증 경로 분기: token 쿼리 우선, 없으면 JWT
  const { searchParams } = new URL(request.url);
  const downloadToken = searchParams.get('token');

  let user = null;            // OAuth 경로일 때만 설정
  let tokenLeadId = null;     // token 경로일 때만 설정
  let authPath = null;        // 'oauth' | 'token'

  if (downloadToken) {
    // (2) 1회용 토큰 검증
    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from('lead_download_tokens')
      .select('token, lead_id, campaign_id, used_at, expires_at')
      .eq('token', downloadToken)
      .maybeSingle();
    if (tErr) {
      return NextResponse.json({ error: '토큰 검증 실패' }, { status: 500 });
    }
    if (!tokenRow) {
      return NextResponse.json({ error: '유효하지 않은 다운로드 링크입니다.' }, { status: 401 });
    }
    if (tokenRow.campaign_id !== campaignId) {
      return NextResponse.json({ error: '캠페인이 일치하지 않는 토큰입니다.' }, { status: 403 });
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: '다운로드 링크가 만료되었습니다. 폼을 다시 제출해 주세요.' }, { status: 410 });
    }
    authPath = 'token';
    tokenLeadId = tokenRow.lead_id;
  } else {
    // (1) Supabase 인증 사용자
    const result = await createSupabaseFromRequest(request);
    user = result?.user || null;
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    authPath = 'oauth';
  }

  try {
    const { data: resource, error: rErr } = await supabaseAdmin
      .from('content_resources')
      .select('id, file_url, file_name, is_enabled, magazine_id, campaign_id, display_on_form_submit')
      .eq('id', resourceId)
      .eq('campaign_id', campaignId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!resource) {
      return NextResponse.json({ error: '리소스를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!resource.is_enabled) {
      return NextResponse.json({ error: '현재 다운로드할 수 없는 자료입니다.' }, { status: 403 });
    }
    // 토큰 경로는 "폼 제출 후 노출 허용" 자료만 허용
    if (authPath === 'token' && resource.display_on_form_submit === false) {
      return NextResponse.json({ error: '이 자료는 폼 제출 후 다운로드 대상이 아닙니다.' }, { status: 403 });
    }

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from('content-resources')
      .createSignedUrl(resource.file_url, 60, {
        download: resource.file_name,
      });
    if (sErr) throw sErr;

    // 토큰 첫 사용 시 used_at 기록 (감사용; 만료 전까지 동일 토큰으로 다른 자료도 다운로드 가능)
    if (authPath === 'token' && downloadToken) {
      try {
        await supabaseAdmin
          .from('lead_download_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', downloadToken)
          .is('used_at', null);
      } catch (markErr) {
        console.warn('token used_at mark failed (계속 진행):', markErr?.message);
      }
    }

    const userEmail = user?.email || user?.user_metadata?.email || null;
    const userAgent = request.headers.get('user-agent') || null;
    try {
      await supabaseAdmin.from('resource_downloads').insert({
        resource_id: resource.id,
        magazine_id: resource.magazine_id,
        campaign_id: resource.campaign_id,
        user_id: user?.id || null,
        delivery_method: authPath === 'token' ? 'token' : 'direct',
        status: 'completed',
        user_email: userEmail,
        user_agent: userAgent,
      });
    } catch (logErr) {
      console.warn('download log insert failed', logErr?.message);
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message || '다운로드 실패' }, { status: 500 });
  }
}
