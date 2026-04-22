import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_PATCH = ['title', 'description', 'is_enabled', 'sort_order'];

/**
 * PATCH /api/magazines/[id]/resources/[resourceId]
 * body: { title?, description?, is_enabled?, sort_order? }
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
      .eq('magazine_id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ resource: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || '수정 실패' }, { status: 500 });
  }
}

/**
 * DELETE /api/magazines/[id]/resources/[resourceId]
 * 스토리지 객체 → DB row 순으로 삭제.
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
      .eq('magazine_id', id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) {
      return NextResponse.json({ error: '리소스를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 스토리지 객체 먼저 삭제 (실패해도 DB 정리 계속 — 고아 파일은 후속 cleanup)
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
      .eq('magazine_id', id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || '삭제 실패' }, { status: 500 });
  }
}
