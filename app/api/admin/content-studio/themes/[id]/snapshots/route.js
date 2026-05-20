import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// GET /api/admin/content-studio/themes/[id]/snapshots — 주제별 리서치 스냅샷 이력
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

  const { data, error } = await supabaseAdmin
    .from('theme_research_snapshots')
    .select('id, theme_id, query, insights, result_count, model, cost_usd, snapshotted_at, results')
    .eq('theme_id', id)
    .order('snapshotted_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data || [] });
}
