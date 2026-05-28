// 파이프라인 리플레이 조회 — 한 planning_session 의 전체 발행 과정을 단계(steps) 배열로 재구성.
//
// 스키마 변경 없이, 이미 저장된 데이터로 각 단계 상태/산출물을 추론한다:
//   agent_jobs.stats           → 수집
//   planning_sessions          → 1차 보고 / 기둥 선택 / 후보 채택 / 심층 리서치 / 상태·에러
//   thread_drafts.research_context_used → 보강·말투 리서치 / density / variant_review
//   thread_drafts              → 글 생성 / 저장
//
// status 는 데이터 존재 여부 + 세션 상태로 추론: done | running | failed | skipped | pending

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { sessionId } = await params;

  const { data: session, error: sessErr } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, job_id, status, candidate_item_ids, candidates_summary, selected_item_id, user_decision_raw, selection_reason, report_text_phase1, report_text_phase2, deep_research_summary, error, decided_at, completed_at, created_at, updated_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });

  const { data: job } = await supabaseAdmin
    .from('agent_jobs')
    .select('id, started_at, finished_at, status, trigger, stats')
    .eq('id', session.job_id)
    .maybeSingle();

  const { data: drafts } = await supabaseAdmin
    .from('thread_drafts')
    .select('id, title, posts, status, hook_pattern, tone_pattern, format_type, research_context_used, published_at, created_at')
    .eq('planning_session_id', sessionId)
    .order('created_at', { ascending: true });
  const draftRows = drafts || [];

  let selectedItem = null;
  if (session.selected_item_id) {
    const { data: item } = await supabaseAdmin
      .from('agent_items')
      .select('id, source, post_url, normalized, classification, summary')
      .eq('id', session.selected_item_id)
      .maybeSingle();
    selectedItem = item || null;
  }

  const steps = buildSteps({ session, job, draftRows, selectedItem });

  return NextResponse.json({
    session: {
      id: session.id,
      job_id: session.job_id,
      status: session.status,
      error: session.error || null,
      created_at: session.created_at,
      completed_at: session.completed_at,
    },
    selected_item: selectedItem
      ? {
          id: selectedItem.id,
          source: selectedItem.source,
          post_url: selectedItem.post_url,
          title: selectedItem.classification?.recommended_title || selectedItem.normalized?.title || null,
        }
      : null,
    steps,
    drafts: draftRows.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      format_type: d.format_type,
      hook_pattern: d.hook_pattern,
      tone_pattern: d.tone_pattern,
      post_count: Array.isArray(d.posts) ? d.posts.length : 0,
      preview: Array.isArray(d.posts) ? (d.posts[0]?.body?.slice(0, 120) || '') : '',
    })),
  });
}

function buildSteps({ session, job, draftRows, selectedItem }) {
  const isRunning = session.status === 'phase2_running';
  const isCompleted = session.status === 'completed';
  const isFailed = session.status === 'failed';
  const isAwaitingSelection = session.status === 'phase1_reported' || session.status === 'awaiting_decision';
  const selected = !!session.selected_item_id;

  // phase2 컨텍스트는 모든 draft 가 공유 — 첫 draft 에서 추출.
  const rc = draftRows.find((d) => d.research_context_used)?.research_context_used || {};
  const supplemental = rc.supplemental_research || null;
  const tone = rc.tone_research || null;
  const density = rc.generation_density_check || null;
  const variantReview = rc.variant_review || null;
  const deep = session.deep_research_summary || rc.phase2_deep || null;

  const candidates = session.candidates_summary && typeof session.candidates_summary === 'object'
    ? Object.values(session.candidates_summary)
    : [];

  // phase2 진행 중일 때 "현재 진행 단계"를 하나만 running 으로 표시하기 위한 추적.
  let runningClaimed = false;
  const phase2Status = (hasData) => {
    if (hasData) return 'done';
    if (isFailed) return 'skipped';
    if (isCompleted) return 'skipped'; // 완료됐는데 데이터 없으면 해당 단계는 건너뜀(리서치 실패 등).
    if (isRunning && !runningClaimed) { runningClaimed = true; return 'running'; }
    return 'pending';
  };

  const steps = [];

  // 1. 수집
  const stats = job?.stats || {};
  steps.push({
    key: 'collection',
    label: '수집',
    status: job ? 'done' : 'skipped',
    summary: job
      ? `소스에서 수집 ${stats.collected ?? '?'}건 · 스킵 ${stats.skipped ?? '?'}건`
      : '수집 정보 없음',
    detail: { trigger: job?.trigger || null, stats, started_at: job?.started_at || null },
  });

  // 2. 1차 보고
  const reportText = session.report_text_phase1 || '';
  steps.push({
    key: 'report',
    label: '1차 보고',
    status: reportText ? 'done' : (session.status === 'phase1_skipped' ? 'skipped' : 'pending'),
    summary: reportText ? `후보 ${candidates.length || (session.candidate_item_ids?.length ?? 0)}개 추출` : '후보 없음',
    detail: { report_excerpt: reportText.slice(0, 600), candidate_count: candidates.length },
  });

  // 3. 기둥 선택
  const pillarRows = candidates
    .map((c) => ({
      title: c.recommended_title || c.title || '(제목 없음)',
      pillar: c.selected_content_pillar_label || c.selected_content_pillar || null,
      fit_score: typeof c.fit_score === 'number' ? Math.round(c.fit_score * 100) : null,
      reason: c.content_pillar_reason || null,
    }))
    .filter((p) => p.pillar);
  steps.push({
    key: 'pillar',
    label: '기둥 선택',
    status: pillarRows.length > 0 ? 'done' : (candidates.length > 0 ? 'done' : 'pending'),
    summary: pillarRows.length > 0 ? `후보별 콘텐츠 기둥·적합도 산정 (${pillarRows.length}개)` : '기둥 정보 없음',
    detail: { candidates: pillarRows },
  });

  // 4. 후보 채택
  steps.push({
    key: 'selection',
    label: '후보 채택',
    status: selected ? 'done' : (isAwaitingSelection ? 'pending' : (isFailed ? 'skipped' : 'pending')),
    summary: selected
      ? `채택: ${selectedItem?.classification?.recommended_title || selectedItem?.normalized?.title || '(제목 없음)'}`
      : '채택 대기 중',
    detail: {
      selected_title: selectedItem?.classification?.recommended_title || selectedItem?.normalized?.title || null,
      selection_reason: session.selection_reason || null,
      user_decision_raw: session.user_decision_raw || null,
      post_url: selectedItem?.post_url || null,
      decided_at: session.decided_at || null,
    },
  });

  // 5. 심층 리서치
  const hookPatterns = Array.isArray(deep?.hook_patterns) ? deep.hook_patterns : [];
  steps.push({
    key: 'deep_research',
    label: '심층 리서치',
    status: phase2Status(!!deep),
    summary: deep ? `해외/소셜 후킹 포인트 ${hookPatterns.length}개` : '심층 리서치 산출물 없음',
    detail: {
      hook_patterns: hookPatterns.slice(0, 5).map((h) => h.pattern || h),
      adapted_angles: Array.isArray(deep?.adapted_angles) ? deep.adapted_angles.slice(0, 5) : [],
    },
  });

  // 6. 보강 리서치
  const evidence = Array.isArray(supplemental?.insights?.evidence_points) ? supplemental.insights.evidence_points : [];
  steps.push({
    key: 'supplemental_research',
    label: '보강 리서치',
    status: phase2Status(!!supplemental),
    summary: supplemental ? `본문 보강 근거 ${evidence.length}개` : '보강 리서치 산출물 없음',
    detail: { evidence_points: evidence.slice(0, 5).map((p) => p.point || p) },
  });

  // 7. 말투 리서치
  const voice = Array.isArray(tone?.insights?.voice_patterns) ? tone.insights.voice_patterns : [];
  steps.push({
    key: 'tone_research',
    label: '말투 리서치',
    status: phase2Status(!!tone),
    summary: tone
      ? `한국 Threads 문장 감각 ${voice.length}개${tone.source_recency === 'stale' ? ' (참고 신뢰도 낮음)' : ''}`
      : '말투 리서치 산출물 없음',
    detail: {
      voice_patterns: voice.slice(0, 5),
      source_mode: tone?.source_mode || null,
      source_recency: tone?.source_recency || null,
    },
  });

  // 8. 글 생성
  steps.push({
    key: 'generation',
    label: '글 생성',
    status: draftRows.length > 0 ? 'done' : phase2Status(false),
    summary: draftRows.length > 0 ? `글 후보 ${draftRows.length}개 생성` : '생성 대기',
    detail: { variant_count: draftRows.length, density_check: density || null },
  });

  // 9. 품질 검수
  steps.push({
    key: 'quality_review',
    label: '품질 검수',
    status: variantReview ? 'done' : (draftRows.length > 0 ? 'done' : phase2Status(false)),
    summary: variantReview
      ? `추천 variant #${variantReview.recommended_variant_id ?? '?'}${variantReview.overall_pass === false ? ' · 재생성 보정 적용' : ''}`
      : '검수 정보 없음',
    detail: {
      recommended_variant_id: variantReview?.recommended_variant_id ?? null,
      overall_pass: variantReview?.overall_pass ?? null,
    },
  });

  // 10. 저장 완료
  const published = draftRows.filter((d) => d.status === 'published');
  steps.push({
    key: 'saved',
    label: '저장 완료',
    status: draftRows.length > 0 ? 'done' : phase2Status(false),
    summary: draftRows.length > 0
      ? `보관함에 ${draftRows.length}개 저장${published.length > 0 ? ` · ${published.length}개 발행됨` : ''}`
      : '저장 대기',
    detail: { draft_ids: draftRows.map((d) => d.id) },
  });

  return steps;
}
