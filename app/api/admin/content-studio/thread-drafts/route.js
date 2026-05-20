import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// GET /api/admin/content-studio/thread-drafts?status=&theme_id=&limit=&offset=
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const themeId = searchParams.get('theme_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  let query = supabaseAdmin
    .from('thread_drafts')
    .select(
      'id, agent_item_id, theme_id, channel, format_type, hook_pattern, tone_pattern, title, posts, cta, hashtags, status, published_at, published_url, risk_flags, generator_model, created_at, updated_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (themeId) query = query.eq('theme_id', themeId);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 주제명 매핑.
  const themeIds = [...new Set((data || []).map((r) => r.theme_id).filter(Boolean))];
  const themeMap = new Map();
  if (themeIds.length > 0) {
    const { data: themes } = await supabaseAdmin
      .from('content_themes')
      .select('id, name')
      .in('id', themeIds);
    for (const t of themes || []) themeMap.set(t.id, t);
  }
  const rows = (data || []).map((r) => ({ ...r, theme: r.theme_id ? themeMap.get(r.theme_id) || null : null }));

  return NextResponse.json({ rows, total: count || 0 });
}
