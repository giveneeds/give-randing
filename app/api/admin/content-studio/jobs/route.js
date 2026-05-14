import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/content-studio/jobs
 *
 * 잡 실행 이력 목록. 시작 시각 내림차순.
 *
 * Query:
 *   limit  default 50, max 200
 *
 * 반환: { rows: agent_jobs[] }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_jobs')
      .select('id, started_at, finished_at, status, trigger, stats, error, created_at')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
