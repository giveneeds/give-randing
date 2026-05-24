// 2차 오케스트레이터 — 사용자가 텔레그램으로 후보를 채택한 직후 호출.
//
// 흐름:
//   1) 세션 + 채택된 자료 + 주제 로드 (status='phase2_running' 은 webhook 이 미리 잠금)
//   2) runDeepResearch — Reddit/Threads/X 에서 후킹 패턴·반응 한 번 더 추출
//   3) 추가 자료 리서치 + 말투 리서치 — 근거와 소셜 문장 감각 보강
//   4) convertItemToThreadDraft — 1차/2차/보강/말투 리서치 모두 컨텍스트로
//      7개 글 후보를 모두 thread_drafts 에 저장하고, 추천/점수 기록은 variant_review 에 남김
//   5) 선택되지 않은 1차 주제 후보들 메타 기록 (rejected_candidates)
//   6) 거버넌스 적용 내역 기록 (governance_applied — 어느 KB 가 주입됐는지 메타)
//   7) 마무리 보고 텍스트 작성 + 텔레그램 발송 + 세션 completed
//
// 실패해도 세션을 failed 로 마무리하고 텔레그램으로 알림.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { runDeepResearch } from './runDeepResearch.js';
import { runSupplementalResearch } from './runSupplementalResearch.js';
import { runToneResearch } from './runToneResearch.js';
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

  // webhook 이 이미 phase2_running 으로 잠갔으니 여기선 selected_item_id 만 보강(이미 같을 가능성 큼).
  await supabaseAdmin
    .from('planning_sessions')
    .update({ selected_item_id: selectedItemId, updated_at: new Date().toISOString() })
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

  let supplementalResearch = null;
  try {
    supplementalResearch = await runSupplementalResearch({ item, theme, deepResearch });
  } catch (e) {
    console.error('[finishPlanningSession] 보강 리서치 실패:', e.message);
  }

  let toneResearch = null;
  try {
    toneResearch = await runToneResearch({ item, theme, deepResearch });
  } catch (e) {
    console.error('[finishPlanningSession] 말투 리서치 실패:', e.message);
  }

  // 스레드 드래프트 생성 — 1차/2차/보강/말투 리서치 모두 주입.
  let draftId;
  let draftResult = null;
  try {
    draftResult = await convertItemToThreadDraft({
      itemId: selectedItemId,
      formatTypeHint: 'short_thread',
      extraContext: buildExtraContext({ deepResearch, supplementalResearch, toneResearch }),
    });
    draftId = draftResult.draftId;
  } catch (e) {
    return finalizeFailure(sessionId, '스레드 드래프트 생성 실패: ' + e.message);
  }

  // 의사결정 메타 채우기 — 보관함 카드 1장에서 다 보이게.
  const rejectedCandidates = buildRejectedCandidates(session.candidates_summary || {}, selectedItemId);
  const governanceApplied = buildGovernanceApplied(item.classification, theme);
  const selectionReason = buildSelectionReason(session.candidates_summary || {}, selectedItemId);
  const draftIds = Array.isArray(draftResult?.draftIds) && draftResult.draftIds.length > 0
    ? draftResult.draftIds
    : [draftId].filter(Boolean);

  const { data: existingDrafts } = await supabaseAdmin
    .from('thread_drafts')
    .select('id, research_context_used')
    .in('id', draftIds);

  for (const existingDraft of existingDrafts || []) {
    const existingResearchContext = existingDraft?.research_context_used && typeof existingDraft.research_context_used === 'object'
      ? existingDraft.research_context_used
      : {};
    await supabaseAdmin
      .from('thread_drafts')
      .update({
        planning_session_id: sessionId,
        selection_reason: selectionReason,
        rejected_candidates: rejectedCandidates,
        governance_applied: governanceApplied,
        research_context_used: {
          ...existingResearchContext,
          phase1: item.research_context || null,
          phase2_deep: deepResearch?.insights || null,
          deep_queries: deepResearch?.queries || [],
          supplemental_research: supplementalResearch ? {
            queries: supplementalResearch.queries || [],
            insights: supplementalResearch.insights || null,
            perplexity: supplementalResearch.perplexity || null,
          } : null,
          tone_research: toneResearch ? {
            queries: toneResearch.queries || [],
            insights: toneResearch.insights || null,
          } : null,
          generation_density_check: draftResult?.densityCheck || existingResearchContext.generation_density_check || null,
          generation_decision: existingResearchContext.generation_decision || draftResult?.generationDecision || null,
          variant_review: existingResearchContext.variant_review || draftResult?.variantReview || null,
        },
        auto_generated: true,
      })
      .eq('id', existingDraft.id);
  }

  // 마무리 보고서 발송.
  const completionText = composeCompletionMessage({
    item,
    theme,
    deepResearch,
    supplementalResearch,
    toneResearch,
    draftId,
    draftResult,
    candidatesSummary: session.candidates_summary,
  });
  const { sent, lastMessageId } = await sendPlainReport({ text: completionText, header: '✅ 콘텐츠 후보 생성 보고' });

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

function buildExtraContext({ deepResearch, supplementalResearch, toneResearch }) {
  if (!deepResearch?.insights && !supplementalResearch?.insights && !toneResearch?.insights) return null;
  const { hook_patterns, audience_reactions, adapted_angles } = deepResearch?.insights || {};
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

  const supplemental = supplementalResearch?.insights || {};
  if (supplemental.evidence_points?.length) {
    lines.push('', '[추가 자료 리서치 — 본문 보강 근거]');
    supplemental.evidence_points.forEach((p) => {
      lines.push(`- ${p.point}${p.how_to_use ? ` / 활용: ${p.how_to_use}` : ''}${p.source ? ` / 출처: ${p.source}` : ''}`);
    });
  }
  if (supplemental.content_additions?.length) {
    lines.push('', '[추가로 넣을 보강 내용]');
    supplemental.content_additions.forEach((x) => lines.push(`- ${x}`));
  }
  if (supplemental.missing_context?.length) {
    lines.push('', '[단정 금지/부족한 정보]');
    supplemental.missing_context.forEach((x) => lines.push(`- ${x}`));
  }

  const tone = toneResearch?.insights || {};
  if (tone.voice_patterns?.length) {
    lines.push('', '[3차 말투 리서치 — 소셜 문장 감각]');
    tone.voice_patterns.forEach((x) => lines.push(`- ${x}`));
  }
  if (tone.phrases_to_borrow?.length) {
    lines.push('', '[빌려올 수 있는 말투/표현]');
    tone.phrases_to_borrow.forEach((x) => lines.push(`- ${x}`));
  }
  if (tone.phrases_to_avoid?.length) {
    lines.push('', '[피해야 할 어색한 표현]');
    tone.phrases_to_avoid.forEach((x) => lines.push(`- ${x}`));
  }
  if (tone.reader_questions?.length) {
    lines.push('', '[독자가 속으로 물을 질문]');
    tone.reader_questions.forEach((x) => lines.push(`- ${x}`));
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
  const docs = ['threads-content-pattern-harness.md', 'content-logic/threads/*.md'];
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

function composeCompletionMessage({ item, theme, deepResearch, supplementalResearch, toneResearch, draftId, draftResult, candidatesSummary }) {
  const selTitle = candidatesSummary?.[item.id]?.recommended_title
    || candidatesSummary?.[item.id]?.title
    || item.normalized?.title
    || '(제목 없음)';
  const themeName = theme?.name || '(주제 미매핑)';
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr').replace(/\/+$/, '');
  const draftUrl = `${baseUrl}/admin/content-studio/thread-drafts/${draftId}`;

  const lines = [
    `정욱님, 선택한 주제 기준으로 글 후보를 모두 보관함에 저장했습니다.`,
    ``,
    `주제: ${themeName}`,
    `최종 제목 후보: ${selTitle}`,
    `원본 자료: ${item.post_url}`,
  ];

  const pillarCandidates = draftResult?.variantReview?.pillar_candidates || [];
  if (pillarCandidates.length > 0) {
    lines.push('', '먼저 잡은 기둥 후보:');
    pillarCandidates.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.content_pillar} · ${p.fit_score}/5`);
      if (p.why_this_pillar) lines.push(`   - ${p.why_this_pillar}`);
    });
  }

  const savedDrafts = Array.isArray(draftResult?.savedDrafts) ? draftResult.savedDrafts : [];
  if (savedDrafts.length > 0) {
    lines.push('', `저장된 글 후보 ${savedDrafts.length}개:`);
    savedDrafts.forEach((d) => {
      const url = `${baseUrl}/admin/content-studio/thread-drafts/${d.draftId}`;
      const meta = [
        d.content_pillar,
        d.content_treatment,
        d.explanation_style,
        d.format_type,
      ].filter(Boolean).join(' · ');
      lines.push(
        `${d.recommended ? '추천 ' : ''}후보 ${d.variant_id} · ${d.score || '?'}점${meta ? ` · ${meta}` : ''}`,
      );
      lines.push(url);
    });
    lines.push('', '점수는 참고용이고 최종 선택은 정욱님이 하면 됩니다. 낮은 점수 후보도 비교 기록으로 삭제하지 않고 보존했습니다.');
  }

  if (deepResearch?.insights?.hook_patterns?.length) {
    lines.push('', '2차 리서치 반영 — 자주 쓰이는 후킹 패턴:');
    deepResearch.insights.hook_patterns.slice(0, 3).forEach((h) => {
      lines.push(`- ${h.pattern}`);
    });
  }

  if (supplementalResearch?.insights?.evidence_points?.length) {
    lines.push('', '추가 자료 리서치 반영 — 보강 근거:');
    supplementalResearch.insights.evidence_points.slice(0, 3).forEach((p) => {
      lines.push(`- ${p.point}`);
    });
  }

  if (toneResearch?.insights?.voice_patterns?.length) {
    lines.push('', '3차 말투 리서치 반영 — 소셜 말투 감각:');
    toneResearch.insights.voice_patterns.slice(0, 3).forEach((p) => {
      lines.push(`- ${p}`);
    });
  }

  lines.push('', `대표 링크: ${draftUrl}`);
  lines.push(`보관함 카드에서 글 로직 회로, 7개 후보 심사, 기둥 판단 기록을 같이 볼 수 있습니다.`);

  return lines.join('\n');
}
