import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

/**
 * POST /api/magazines/[id]/resources/[resourceId]/download
 * 인증된 사용자에게 60초짜리 서명 URL 발급 + resource_downloads 로그 기록.
 * body 없음. 인증 실패 시 401.
 */
export async function POST(request, { params }) {
  const { id: magazineId, resourceId } = await params;
  if (!magazineId || !resourceId) {
    return NextResponse.json({ error: 'id 누락' }, { status: 400 });
  }

  // Bearer 토큰으로 사용자 확인
  const { user } = await createSupabaseFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  try {
    // 리소스 검증: magazine 소속 + is_enabled
    const { data: resource, error: rErr } = await supabaseAdmin
      .from('content_resources')
      .select('id, file_url, file_name, is_enabled, magazine_id, campaign_id')
      .eq('id', resourceId)
      .eq('magazine_id', magazineId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!resource) {
      return NextResponse.json({ error: '리소스를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!resource.is_enabled) {
      return NextResponse.json({ error: '현재 다운로드할 수 없는 자료입니다.' }, { status: 403 });
    }

    // 서명 URL 발급 — Content-Disposition 에 원본 파일명 지정
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from('content-resources')
      .createSignedUrl(resource.file_url, 60, {
        download: resource.file_name,
      });
    if (sErr) throw sErr;

    // 다운로드 로그 기록 (실패해도 URL 은 반환 — 사용자 경험 우선)
    const userEmail = user.email || user.user_metadata?.email || null;
    const userAgent = request.headers.get('user-agent') || null;
    try {
      await supabaseAdmin.from('resource_downloads').insert({
        resource_id: resource.id,
        magazine_id: resource.magazine_id,
        campaign_id: resource.campaign_id,
        user_id: user.id,
        delivery_method: 'direct',
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
