// 1회 cron(job_id) 기준 허브 조회 — 채택된 모든 후보 + 각 후보의 variants 한 화면.
// Phase 1: 허브 페이지 (/admin/content-studio/jobs/[jobId]) 에서 사용.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { jobId } = await params;

  // 1) job 메타 (있으면)
  const { data: job } = await supabaseAdmin
    .from('agent_jobs')
    .select('id, started_at, finished_at, status, trigger, stats')
    .eq('id', jobId)
    .maybeSingle();

  // 2) 이 job 의 모든 planning_session.
  const { data: sessions } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, status, user_decision_raw, candidates_summary, selected_item_id, thread_draft_id, decided_at, completed_at, created_at, error')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  // 3) 각 채택된 item 의 모든 thread_drafts (variant 포함).
  const selectedItemIds = (sessions || []).map((s) => s.selected_item_id).filter(Boolean);
  const sessionIds = (sessions || []).map((s) => s.id);

  let drafts = [];
  if (sessionIds.length > 0) {
    const { data: d } = await supabaseAdmin
      .from('thread_drafts')
      .select('id, agent_item_id, planning_session_id, title, posts, status, hook_pattern, tone_pattern, format_type, engagement_drivers, research_context_used, published_at, published_url, generator_prompt_version, created_at')
      .in('planning_session_id', sessionIds)
      .order('created_at', { ascending: true });
    drafts = d || [];
  }

  // 4) 채택된 item 메타 (제목용).
  let itemsById = {};
  if (selectedItemIds.length > 0) {
    const { data: items } = await supabaseAdmin
      .from('agent_items')
      .select('id, source, post_url, normalized, classification, summary')
      .in('id', selectedItemIds);
    for (const it of items || []) itemsById[it.id] = it;
  }

  // 5) 세션별로 묶기.
  const draftsBySession = {};
  for (const d of drafts) {
    const sid = d.planning_session_id;
    if (!sid) continue;
    if (!draftsBySession[sid]) draftsBySession[sid] = [];
    draftsBySession[sid].push(d);
  }

  const enrichedSessions = (sessions || []).map((s) => {
    const item = s.selected_item_id ? itemsById[s.selected_item_id] : null;
    return {
      ...s,
      selected_candidate: s.selected_item_id ? (s.candidates_summary || {})[s.selected_item_id] || null : null,
      item_title: item?.normalized?.title || null,
      item_source: item?.source || null,
      item_post_url: item?.post_url || null,
      item_recommended_title: item?.classification?.recommended_title || null,
      drafts: draftsBySession[s.id] || [],
    };
  });

  // 6) 폐기된 후보 — 가장 첫 session 의 candidates_summary 에 다 있음 (1차 보고에서 만들어진 7개 중 채택 안 된 것).
  const firstSession = sessions?.[0];
  const allCandidates = firstSession?.candidates_summary
    ? Object.values(firstSession.candidates_summary)
    : [];
  const acceptedIds = new Set(selectedItemIds);
  const rejected = allCandidates
    .filter((c) => c?.id && !acceptedIds.has(c.id))
    .sort((a, b) => (a.candidate_index || 999) - (b.candidate_index || 999));

  return NextResponse.json({
    job,
    sessions: enrichedSessions,
    rejected_candidates: rejected,
    stats: {
      total_sessions: sessions?.length || 0,
      accepted_candidates: selectedItemIds.length,
      total_drafts: drafts.length,
      published_drafts: drafts.filter((d) => d.status === 'published').length,
    },
  });
}
