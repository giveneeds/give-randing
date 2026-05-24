import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_PATCH = [
  'title',
  'description',
  'is_enabled',
  'sort_order',
  'display_on_form_submit', // basic 모드 폼 제출 후 자료 카드 리스트 노출 여부
  'display_on_page_bottom', // 라이브 페이지 하단 '첨부 자료' 섹션 노출 여부
];

/**
 * PATCH /api/campaigns/[id]/resources/[resourceId]
 */
export async function PATCH(request, { params }) {
  const { id, resourceId } = await params;
  if (!id || !resourceId) {
    return NextResponse.json({ error: 'id 누락' }, { status: 400 });
  }
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const update = {};
    for (const k of ALLOWED_PATCH) {
      if (k in body) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 });
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('content_resources')
      .update(update)
      .eq('id', resourceId)
      .eq('campaign_id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ resource: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || '수정 실패' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id]/resources/[resourceId]
 */
export async function DELETE(request, { params }) {
  const { id, resourceId } = await params;
  if (!id || !resourceId) {
    return NextResponse.json({ error: 'id 누락' }, { status: 400 });
  }
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  try {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('content_resources')
      .select('file_url')
      .eq('id', resourceId)
      .eq('campaign_id', id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) {
      return NextResponse.json({ error: '리소스를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (existing.file_url) {
      const { error: rmErr } = await supabaseAdmin.storage
        .from('content-resources')
        .remove([existing.file_url]);
      if (rmErr) console.warn('storage remove failed', rmErr.message);
    }

    const { error: delErr } = await supabaseAdmin
      .from('content_resources')
      .delete()
      .eq('id', resourceId)
      .eq('campaign_id', id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || '삭제 실패' }, { status: 500 });
  }
}
