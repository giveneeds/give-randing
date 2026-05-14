import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/content-studio/telegram-recipients
 * 반환: { rows: agent_telegram_recipients[] }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_telegram_recipients')
      .select('id, chat_id, username, display_name, active, profile_id, first_seen_at, activated_at, created_at')
      .order('first_seen_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
