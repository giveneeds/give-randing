import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// GET /api/admin/content-studio/activity — 자동화 작동 현황 요약.
// 사용자 친화 데이터만 노출 — 잡/AI 로그는 노출하지 않고 카운트로만 추상화.
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7); startWeek.setHours(0, 0, 0, 0);

  const [todayItems, weekItems, recentJobs, draftMags, publishedMags, researchSnaps] = await Promise.all([
    supabaseAdmin.from('agent_items').select('id, status', { count: 'exact', head: true }).gte('collected_at', startToday.toISOString()),
    supabaseAdmin.from('agent_items').select('id, status', { count: 'exact', head: true }).gte('collected_at', startWeek.toISOString()),
    supabaseAdmin.from('agent_jobs').select('id, status, started_at, stats, error').order('started_at', { ascending: false }).limit(5),
    supabaseAdmin.from('magazines').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('magazines').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', startWeek.toISOString()),
    supabaseAdmin.from('theme_research_snapshots').select('id', { count: 'exact', head: true }).gte('snapshotted_at', startWeek.toISOString()),
  ]);

  // 최근 잡 중 에러가 있던 것만 별도 표시 (사용자 친화).
  const recentErrors = (recentJobs.data || [])
    .filter((j) => j.error || j.status === 'failed' || j.status === 'partial')
    .slice(0, 3)
    .map((j) => ({
      id: j.id,
      status: j.status,
      started_at: j.started_at,
      hint: (j.error || '').split('\n')[0]?.slice(0, 160) || null,
    }));

  // 다음 cron — KST 06:00 기준.
  const nextCron = (() => {
    const next = new Date();
    next.setHours(6, 0, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    return next.toISOString();
  })();

  return NextResponse.json({
    today: {
      collected: todayItems.count || 0,
    },
    week: {
      collected: weekItems.count || 0,
      published: publishedMags.count || 0,
      research_runs: researchSnaps.count || 0,
    },
    pending: {
      drafts: draftMags.count || 0,
    },
    recent_errors: recentErrors,
    next_cron: nextCron,
  });
}
