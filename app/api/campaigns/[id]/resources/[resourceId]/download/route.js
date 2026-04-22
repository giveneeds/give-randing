import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

/**
 * POST /api/campaigns/[id]/resources/[resourceId]/download
 * 인증된 사용자에게 60초짜리 서명 URL 발급 + resource_downloads 로그 기록.
 */
export async function POST(request, { params }) {
  const { id: campaignId, resourceId } = await params;
  if (!campaignId || !resourceId) {
    return NextResponse.json({ error: 'id 누락' }, { status: 400 });
  }

  const { user } = await createSupabaseFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  try {
    const { data: resource, error: rErr } = await supabaseAdmin
      .from('content_resources')
      .select('id, file_url, file_name, is_enabled, magazine_id, campaign_id')
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

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from('content-resources')
      .createSignedUrl(resource.file_url, 60, {
        download: resource.file_name,
      });
    if (sErr) throw sErr;

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
