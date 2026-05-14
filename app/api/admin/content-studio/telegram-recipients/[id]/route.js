import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const COLS = 'id, chat_id, username, display_name, active, profile_id, first_seen_at, activated_at, created_at';

/**
 * PATCH /api/admin/content-studio/telegram-recipients/[id]
 * Body: { active?, display_name? }
 *
 * active=true 로 처음 변경되면 activated_at 자동 기록.
 */
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const patch = {};
  if (typeof body.active === 'boolean') {
    patch.active = body.active;
    if (body.active) patch.activated_at = new Date().toISOString();
  }
  if (body.display_name !== undefined) {
    patch.display_name = body.display_name ? String(body.display_name).slice(0, 200) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드 없음' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_telegram_recipients')
      .update(patch)
      .eq('id', id)
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: '대상 없음' }, { status: 404 });
    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content-studio/telegram-recipients/[id]
 */
export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 });

  try {
    const { error } = await supabaseAdmin.from('agent_telegram_recipients').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
