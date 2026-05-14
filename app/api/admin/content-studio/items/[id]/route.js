import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['collected', 'reviewed', 'approved', 'rejected', 'sent']);
const SELECT_COLS = 'id, job_id, source, source_account, post_id, post_url, posted_at, collected_at, normalized, classification, summary, translation, status, send_flag, reviewed_at, note, notified_at, notification_message_id, approved_via';

/**
 * PATCH /api/admin/content-studio/items/[id]
 *
 * 검수 액션. 허용 필드만 부분 업데이트.
 *
 * Body:
 *   { send_flag?: boolean, status?: string, note?: string }
 *
 * status를 'approved' 또는 'rejected'로 변경 시 approved_via='admin' 자동 기록.
 * status가 'approved'면 send_flag=true도 자동 (Phase 2 매거진 입력 풀).
 */
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const patch = {};
  if (typeof body.send_flag === 'boolean') patch.send_flag = body.send_flag;
  if (typeof body.status === 'string' && ALLOWED_STATUSES.has(body.status)) {
    patch.status = body.status;
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = auth.user.id;
    if (body.status === 'approved' || body.status === 'rejected') {
      patch.approved_via = 'admin';
    }
    if (body.status === 'approved' && body.send_flag === undefined) {
      patch.send_flag = true;
    }
  }
  if (typeof body.note === 'string') patch.note = body.note.slice(0, 2000);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드 없음' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_items')
      .update(patch)
      .eq('id', id)
      .select(SELECT_COLS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });
    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
