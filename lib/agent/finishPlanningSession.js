// 2차 오케스트레이터 — 사용자가 텔레그램으로 후보를 채택한 직후 호출.
//
// 흐름:
//   1) planning_sessions 상태를 phase2_running 으로 갱신
//   2) 채택된 자료 + 주제 로드
//   3) runDeepResearch — Reddit/Threads/X 에서 후킹 패턴·반응 한 번 더 추출
//   4) convertItemToThreadDraft — 1차 리서치 + 2차 깊이 리서치 모두 컨텍스트로
//      (deepResearch 결과는 thread_drafts.research_context_used 에 저장)
//   5) 폐기된 후보들 메타 기록 (rejected_candidates)
//   6) 거버넌스 적용 내역 기록 (governance_applied — 어느 KB 가 주입됐는지 메타)
//   7) 마무리 보고 텍스트 작성 + 텔레그램 발송 + 세션 completed
//
// 실패해도 세션을 failed 로 마무리하고 텔레그램으로 알림.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { runDeepResearch } from './runDeepResearch.js';
import { sendPlainReport } from './sendPlanningMessage.js';
import { isPlaceRelatedCluster } from '@/lib/contentTaxonomy';
import { convertItemToThreadDraft } from './convertItemToThreadDraft.js';

/**
 * @param {{ sessionId: string, selectedItemId: string }} args
 * @returns {Promise<{ ok: boolean, draftId?: string, error?: string }>}
 */
export async function finishPlanningSession({ sessionId, selectedItemId }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  // 세션 로드.
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, candidate_item_ids, candidates_summary, telegram_chat_id, telegram_message_id_phase1')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessErr || !session) {
    return { ok: false, error: '세션을 찾을 수 없음' };
  }

  await supabaseAdmin
    .from('planning_sessions')
    .update({ status: 'phase2_running', selected_item_id: selectedItemId, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  // 채택된 자료 + 주제.
  const { data: item } = await supabaseAdmin
    .from('agent_items')
    .select('id, theme_id, source, post_url, normalized, classification, summary, research_context')
    .eq('id', selectedItemId)
    .maybeSingle();
  if (!item) return finalizeFailure(sessionId, '채택된 자료를 찾을 수 없음');

  let theme = null;
  if (item.theme_id) {
    const { data: t } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .eq('id', item.theme_id)
      .maybeSingle();
    theme = t;
  }

  // 2차 깊이 리서치 — SNS 후킹 패턴·반응.
  let deepResearch = null;
  try {
    deepResearch = await runDeepResearch({ item, theme });
    await supabaseAdmin
      .from('planning_sessions')
      .update({ deep_research_summary: deepResearch.insights, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (e) {
    // 2차 리서치 실패해도 스레드 생성은 계속 진행 (1차 컨텍스트만으로).
    console.error('[finishPlanningSession] deep research 실패:', e.message);
  }

  // 스레드 드래프트 생성 — 1차 brief + research_context + 2차 깊이 리서치 모두 주입.
  let draftId;
  try {
    const result = await convertItemToThreadDraft({
      itemId: selectedItemId,
      formatTypeHint: 'short_thread',
      extraContext: deepResearch ? buildExtraContext(deepResearch) : null,
    });
    draftId = result.draftId;
  } catch (e) {
    return finalizeFailure(sessionId, '스레드 드래프트 생성 실패: ' + e.message);
  }

  // 의사결정 메타 채우기 — 보관함 카드 1장에서 다 보이게.
  const rejectedCandidates = buildRejectedCandidates(session.candidates_summary || {}, selectedItemId);
  const governanceApplied = buildGovernanceApplied(item.classification, theme);
  const selectionReason = buildSelectionReason(session.candidates_summary || {}, selectedItemId);

  await supabaseAdmin
    .from('thread_drafts')
    .update({
      planning_session_id: sessionId,
      selection_reason: selectionReason,
      rejected_candidates: rejectedCandidates,
      governance_applied: governanceApplied,
      research_context_used: {
        phase1: item.research_context || null,
        phase2_deep: deepResearch?.insights || null,
        deep_queries: deepResearch?.queries || [],
      },
      auto_generated: true,
    })
    .eq('id', draftId);

  // 마무리 보고서 발송.
  const completionText = composeCompletionMessage({
    item,
    theme,
    deepResearch,
    draftId,
    candidatesSummary: session.candidates_summary,
  });
  const { sent, lastMessageId } = await sendPlainReport({ text: completionText, header: '✅ 콘텐츠 완성 보고' });

  await supabaseAdmin
    .from('planning_sessions')
    .update({
      status: 'completed',
      thread_draft_id: draftId,
      report_text_phase2: completionText,
      telegram_message_id_phase2: lastMessageId || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // 채택된 item 상태도 sent 로.
  await supabaseAdmin
    .from('agent_items')
    .update({ status: 'sent', send_flag: true, decided_at: new Date().toISOString() })
    .eq('id', selectedItemId);

  return { ok: true, draftId, completionDelivered: sent > 0 };
}

async function finalizeFailure(sessionId, errMsg) {
  await supabaseAdmin
    .from('planning_sessions')
    .update({ status: 'failed', error: errMsg, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  // 실패도 텔레그램으로 알린다 — 사용자가 모르고 기다리는 상황 방지.
  try {
    await sendPlainReport({
      text: `오늘 콘텐츠 완성 작업에 문제가 있었습니다. 어드민에서 확인 부탁드립니다.\n사유: ${errMsg}`,
      header: '⚠️ 작업 실패',
    });
  } catch {
    // 텔레그램 발송도 실패하면 로그만.
  }
  return { ok: false, error: errMsg };
}

function buildExtraContext(deepResearch) {
  if (!deepResearch?.insights) return null;
  const { hook_patterns, audience_reactions, adapted_angles } = deepResearch.insights;
  const lines = [];
  if (hook_patterns?.length) {
    lines.push('[2차 리서치 — SNS 후킹 패턴]');
    hook_patterns.forEach((h) => lines.push(`- ${h.pattern}${h.example ? ` (예: ${h.example})` : ''}`));
  }
  if (audience_reactions?.length) {
    lines.push('', '[독자 반응 패턴]');
    audience_reactions.forEach((r) => lines.push(`- ${r}`));
  }
  if (adapted_angles?.length) {
    lines.push('', '[조정된 앵글 후보]');
    adapted_angles.forEach((a) => lines.push(`- ${a}`));
  }
  return lines.join('\n');
}

function buildSelectionReason(candidatesSummary, selectedId) {
  const sel = candidatesSummary[selectedId];
  if (!sel) return '사용자 선택 (세부 메타 없음).';
  const parts = [];
  if (sel.theme) parts.push(`주제 "${sel.theme}"`);
  if (typeof sel.fit_score === 'number') parts.push(`적합도 ${Math.round(sel.fit_score * 100)}%`);
  if (sel.reader_problem) parts.push(`독자 문제 "${sel.reader_problem}"`);
  return `정욱님 채택. ${parts.join(' · ')}`;
}

function buildRejectedCandidates(candidatesSummary, selectedId) {
  return Object.values(candidatesSummary)
    .filter((c) => c.id !== selectedId)
    .map((c) => ({
      item_id: c.id,
      theme: c.theme,
      title: c.title,
      fit_score: c.fit_score,
      reason: 'phase1 에서 사용자가 선택하지 않음',
    }));
}

function buildGovernanceApplied(classification, theme) {
  const cluster = theme?.target_topic_cluster || classification?.suggested_topic_cluster;
  const persona = theme?.target_persona || classification?.suggested_persona;
  const docs = ['threads-content-pattern-harness.md'];
  if (isPlaceRelatedCluster(cluster)) {
    docs.push('place-marketing-knowledge-base.md', 'place-marketing-content-governance.md');
  }
  if (persona && persona !== 'unknown') {
    docs.push('content-personas.md');
  }
  return {
    applied_docs: docs,
    topic_cluster: cluster || null,
    persona: persona || null,
    risk_flags: Array.isArray(classification?.risk_flags) ? classification.risk_flags : [],
  };
}

function composeCompletionMessage({ item, theme, deepResearch, draftId, candidatesSummary }) {
  const selTitle = candidatesSummary?.[item.id]?.recommended_title
    || candidatesSummary?.[item.id]?.title
    || item.normalized?.title
    || '(제목 없음)';
  const themeName = theme?.name || '(주제 미매핑)';
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr').replace(/\/+$/, '');
  const draftUrl = `${baseUrl}/admin/content-studio/thread-drafts/${draftId}`;

  const lines = [
    `정욱님, 스레드 드래프트가 보관함에 들어갔습니다.`,
    ``,
    `주제: ${themeName}`,
    `최종 제목 후보: ${selTitle}`,
    `원본 자료: ${item.post_url}`,
  ];

  if (deepResearch?.insights?.hook_patterns?.length) {
    lines.push('', '2차 리서치 반영 — 자주 쓰이는 후킹 패턴:');
    deepResearch.insights.hook_patterns.slice(0, 3).forEach((h) => {
      lines.push(`- ${h.pattern}`);
    });
  }

  lines.push('', `보관함 카드에서 거버넌스 적용 내역과 폐기된 후보까지 한 번에 보실 수 있습니다.`);
  lines.push(`검토 후 발행 결정 부탁드립니다.`, '', `${draftUrl}`);

  return lines.join('\n');
}
