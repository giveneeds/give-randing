import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// GET /api/admin/content-studio/themes — 주제 목록
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { data, error } = await supabaseAdmin
    .from('content_themes')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 주제의 최근 스냅샷 1건, 검토함 신규 카운트 같이 (단순화 위해 별도 쿼리)
  const themeIds = (data || []).map((t) => t.id);
  let latestByTheme = new Map();
  let pendingByTheme = new Map();
  if (themeIds.length > 0) {
    const [{ data: snaps }, { data: pending }] = await Promise.all([
      supabaseAdmin
        .from('theme_research_snapshots')
        .select('theme_id, snapshotted_at, result_count')
        .in('theme_id', themeIds)
        .order('snapshotted_at', { ascending: false }),
      supabaseAdmin
        .from('agent_items')
        .select('theme_id, status')
        .in('theme_id', themeIds)
        .eq('status', 'collected'),
    ]);
    for (const s of snaps || []) {
      if (!latestByTheme.has(s.theme_id)) latestByTheme.set(s.theme_id, s);
    }
    for (const p of pending || []) {
      pendingByTheme.set(p.theme_id, (pendingByTheme.get(p.theme_id) || 0) + 1);
    }
  }

  const rows = (data || []).map((t) => ({
    ...t,
    latest_snapshot_at: latestByTheme.get(t.id)?.snapshotted_at || null,
    latest_snapshot_results: latestByTheme.get(t.id)?.result_count || 0,
    pending_items: pendingByTheme.get(t.id) || 0,
  }));

  return NextResponse.json({ rows });
}

// POST /api/admin/content-studio/themes — 주제 생성
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  let body = {};
  try { body = await request.json(); } catch {}

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name 필수' }, { status: 400 });
  }

  const insert = {
    name: body.name,
    description: typeof body.description === 'string' ? body.description : null,
    target_persona: ['restaurant_owner', 'clinic_owner', 'general'].includes(body.target_persona) ? body.target_persona : 'general',
    target_topic_cluster: typeof body.target_topic_cluster === 'string' ? body.target_topic_cluster : null,
    research_keywords: Array.isArray(body.research_keywords) ? body.research_keywords.filter((x) => typeof x === 'string' && x.trim()) : [],
    collection_source_ids: Array.isArray(body.collection_source_ids) ? body.collection_source_ids : [],
    cadence_days: Number.isFinite(body.cadence_days) ? Math.max(1, body.cadence_days) : 7,
    active: body.active !== false,
    sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 100,
  };

  const { data, error } = await supabaseAdmin
    .from('content_themes')
    .insert(insert)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}
