// 매일 cron 끝나면 그날 모은 자료들을 묶어 "정욱님, 오늘 ... " 톤의 자연어 보고서를 LLM 으로 작성.
// 보고서는 텔레그램 1차 메시지 본문 + planning_sessions 에 저장된다.
//
// 후보 1~N개를 한 묶음 1장으로 정리해 사용자가 자유 텍스트로 답할 수 있게 한다.
// (개별 카드 N장이 아니라 보고서 1장 — 사용자 비전대로)

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';
import { ensureSocialCandidates } from './ensureSocialCandidates.js';
import { choosePillarStrategy, selectPillarDrivenTopicCandidates } from './contentPillarStrategy.js';
import { normalizePersona } from '@/lib/contentTaxonomy';
import { ontologyPrefix } from '@/lib/agent/contentOntology';

const PROMPT_VERSION = 'planning_phase1_v1';

/**
 * @param {{ jobId: string }} args
 * @returns {Promise<{
 *   sessionId: string,
 *   reportText: string,
 *   candidateCount: number,
 *   skippedReason?: string,
 * }>}
 */
export async function composeDailyReport({ jobId }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  // 이 cron 사이클에서 수집된 collected 자료들 + 주제 매핑.
  let { data: items } = await supabaseAdmin
    .from('agent_items')
    .select('id, source, post_url, normalized, classification, summary, theme_id, research_context, collected_at')
    .eq('job_id', jobId)
    .eq('status', 'collected')
    .order('collected_at', { ascending: false })
    .limit(20);

  // 뉴스 쏠림 방지: 1차 제안에는 Reddit/X 해외 주제 후보를 각각 1개씩 추가한다.
  // 목적은 말투 수집이 아니라 해외 마케팅/AI 이슈와 콘텐츠 소재 발굴이다.
  // 실패해도 기본 보고서는 계속 진행한다.
  let socialSupplement = null;
  try {
    socialSupplement = await ensureSocialCandidates({ jobId, seedItems: items || [] });
    if (socialSupplement.inserted > 0) {
      const refreshed = await supabaseAdmin
        .from('agent_items')
        .select('id, source, post_url, normalized, classification, summary, theme_id, research_context, collected_at')
        .eq('job_id', jobId)
        .eq('status', 'collected')
        .order('collected_at', { ascending: false })
        .limit(24);
      items = refreshed.data || items;
    }
  } catch (e) {
    socialSupplement = { inserted: 0, errors: [e.message] };
  }

  items = await backfillRecentCandidateItems({ jobId, items: items || [], targetCount: 12 });

  if (!items || items.length === 0) {
    // 후보 없음 — 세션은 만들되 phase1_skipped 상태.
    const { data: session } = await supabaseAdmin
      .from('planning_sessions')
      .insert({ job_id: jobId, status: 'phase1_skipped', candidate_item_ids: [] })
      .select('id')
      .single();
    return {
      sessionId: session?.id,
      reportText: '',
      candidateCount: 0,
      skippedReason: '오늘 수집된 자료가 없습니다.',
    };
  }

  // 주제 이름 매핑.
  const themeIds = [...new Set(items.map((i) => i.theme_id).filter(Boolean))];
  const themeMap = new Map();
  if (themeIds.length > 0) {
    const { data: themes } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .in('id', themeIds);
    for (const t of themes || []) themeMap.set(t.id, t);
  }

  // LLM 보고서용 candidate 요약 — 1-based label 을 SSOT 로 부여.
  // 이 label 이 보고서 본문의 [후보 1]·parseUserDecision 의 매칭 키 둘 다 됨.
  const candidatePool = items.map((it, idx) => {
    const c = it.classification || {};
    const s = it.summary || {};
    const theme = themeMap.get(it.theme_id);
    const baseCandidate = {
      label: `[후보 ${idx + 1}]`,
      candidate_index: idx + 1,
      id: it.id,
      theme: theme?.name || '(주제 미매핑)',
      persona: normalizePersona(c.suggested_persona || c.target_persona || 'unknown'),
      topic_cluster: c.suggested_topic_cluster || null,
      fit_score: typeof c.fit_score === 'number' ? Math.round(c.fit_score * 100) / 100 : null,
      title: it.normalized?.title || '(제목 없음)',
      one_line: s.one_line_summary || c.reader_problem || null,
      recommended_title: c.recommended_title || null,
      content_angle: c.content_angle || (Array.isArray(c.content_angles) ? c.content_angles[0] : null),
      reader_problem: c.reader_problem || null,
      risk_flags: Array.isArray(c.risk_flags) ? c.risk_flags : [],
      source: it.source,
      source_role: ['reddit', 'reddit_search', 'x_search'].includes(it.source) ? 'overseas_topic_candidate' : 'collected_candidate',
      url: it.post_url,
      creative_brief: {
        topic_title: c.recommended_title || it.normalized?.title || null,
        reader_problem: c.reader_problem || null,
        core_angle: c.content_angle || (Array.isArray(c.content_angles) ? c.content_angles[0] : null),
        hook_candidate: null,        // 보고서 LLM 이 제안 (구조 저장은 후속 enrich 확장)
        evidence_needed: Array.isArray(c.content_angles) ? c.content_angles.slice(0, 3) : [],
      },
    };
    const pillarStrategy = choosePillarStrategy({ item: it, theme, candidate: baseCandidate });
    return {
      ...baseCandidate,
      ...pillarStrategy,
    };
  });
  const candidates = selectPillarDrivenTopicCandidates(candidatePool, { limit: 7 });

  if (candidates.length === 0) {
    const { data: session } = await supabaseAdmin
      .from('planning_sessions')
      .insert({ job_id: jobId, status: 'phase1_skipped', candidate_item_ids: [] })
      .select('id')
      .single();
    return {
      sessionId: session?.id,
      reportText: '',
      candidateCount: 0,
      skippedReason: '기둥 기준으로 제안할 수 있는 후보가 없습니다.',
    };
  }

  // 채택 후보들의 creative_brief 를 LLM 으로 날카롭게 다듬는다.
  // enrich 가 뱉은 generic 원본(content_angle 그대로) 을 "날선 콘셉트" 로 덮어써,
  // 이후 finishPlanningSession → Writer 가 받는 콘셉트의 척추를 단단히 만든다.
  await sharpenCreativeBriefs(candidates, { jobId });

  // 후보별 메타 캐시 — id 키 외에 candidate_index 도 함께 저장해 파서가 라벨로 매칭 가능.
  const candidatesSummary = Object.fromEntries(candidates.map((c) => [c.id, c]));

  const sys = `${ontologyPrefix({ includeEnums: true })}너는 기브니즈의 콘텐츠 운영 보조 에이전트다. 매일 아침 정욱님에게 오늘 모은 자료를 자연어로 보고한다.

톤:
- 인사이트 있는 PM 동료가 슬랙으로 짧게 보고하는 톤. 사무적이지만 따뜻함.
- 첫 줄은 "정욱님," 으로 시작.
- 자료를 단순 나열하지 않고 "이걸로 뭘 할 수 있고, 뭐가 부족한지" 의견 포함.
- 광고티·과장 X. 후보가 약하면 솔직하게 "기본 자료가 부족합니다", "후킹 포인트가 약합니다" 라고 말한다.
- 마지막에 정욱님께 질문 형태로 마무리 ("A로 가는 게 좋아 보이는데 어떠세요?" 또는 "다른 방향이 있으시면 알려주세요" 식).

구조:
1) 한 줄 헤드: 오늘 수집 풀에서 기둥별로 추려낸 "발행 콘셉트 후보" N건이 있고 어떤 흐름이 강한지
2) 후보 요약: 입력 JSON 에 주어진 label("[후보 1]" 등) 을 그대로 사용.
   - 무엇을 다루는 자료인지
   - 에이전트가 어떤 콘텐츠 기둥으로 판단했는지
   - 왜 그 기둥인지, 우리 타겟에 왜 의미 있는지 (fit_score, target_fit_summary, content_pillar_reason 활용)
   - 이걸로 어떤 첫 포스트/연속글 구조가 가능한지 (thread_reference_strategy 활용)
3) 약점/리스크 (있으면): 자료 부족, 후킹 약함, 동일 주제 중복 등
4) 추천 + 질문: 본인이 봤을 때 어느 후보가 좋은지 의견 + 정욱님 결정 요청

규칙 (중요):
- 입력 JSON 에 부여된 label 과 candidate_index 를 절대 바꾸지 말 것. 본문에는 그 label 을 그대로 적는다.
- 각 후보 첫 등장 시 "[후보 N] (id: <uuid>)" 형태로 id 도 함께 노출.
- 모든 후보를 보고서에 언급. 빠짐 없이.
- 각 후보마다 "기둥: <selected_content_pillar_label>" 과 "이유: <content_pillar_reason>" 을 짧게 노출한다. 사용자가 기둥을 고르는 구조가 아니라, 에이전트 판단을 확인하게 하는 목적이다.
- 후보는 "읽을 만한 스레드 콘셉트"로 보여준다. 단순히 "AI 활용법", "마케팅 전략" 같은 자료 제목을 반복하지 말고 첫 글에서 어떤 궁금증/FOMO/오해 깨기를 만들 수 있는지 말한다.
- thread_reference_strategy.first_post_hint 와 continuation_plan 이 있으면 후보마다 1문장으로 반영한다. 단, 실제 원고를 여기서 길게 쓰지 않는다.
- 첫 포스트가 짧고 강해야 한다는 원칙을 보고서에도 반영한다. "첫 글에서 결론을 다 말하지 않고, 후속 글에서 정보 밀도를 채운다"는 관점으로 후보를 설명한다.
- 후보는 이미 "기둥/전략 레인 선행 -> 레인별 주제 후보 선별" 방식으로 추려졌다. 따라서 기둥은 사후 태그가 아니라 이 후보가 발굴된 전략 레인으로 설명한다.
- "타겟 적합도"와 "작성 방향"도 후보 안에 자연스럽게 포함한다.
- source_role 이 overseas_topic_candidate 인 Reddit/X 후보는 "해외 주제 후보"로 본다. 별도 섹션으로 과하게 분리하지 말고 일반 후보 흐름 안에서 자연스럽게 설명하되 출처는 Reddit/X 임을 밝힌다.
- Reddit 후보 1개와 X 후보 1개가 있으면 반드시 둘 다 언급한다. 점수가 낮아도 해외 마케팅/AI 이슈, 실험 사례, 논쟁, 도구 활용법, 한국어로 재해석할 가치가 있는지 판단한다.
- Reddit/X 후보를 "말투 참고용"으로 축소하지 않는다. 1차 목적은 해외에서 이미 올라오는 주제와 이슈를 기브니즈 콘텐츠 소재로 가져오는 것이다.
- 출력은 마크다운 없이 일반 텍스트. 텔레그램 HTML 태그도 쓰지 말 것 (이후 단계에서 escape 적용).
- 600자~1200자 사이.

creative_brief 기준 (각 후보가 "발행 가능한 콘셉트"임을 보이려면):
좋은 후보 보고는 각 후보에 다음이 보여야 한다.
- topic_title: 편집 제목 (자료 원제 반복 X, 실제 글 제목처럼)
- reader_problem: 독자가 실제로 겪는 장면을 현장어로 (전환율·퍼널 같은 마케팅 용어 X)
- core_angle: 날선 주장 한 문장. 양비론·"둘 다 중요하다" 식 금지. 이 글만 할 수 있는 말.
- hook_candidate: 첫 줄 후보 1개. 30자 이내, 결론을 다 말하지 않음 (궁금증/긴장을 남김).
- evidence_needed: 이 주장을 받치려고 찾아야 할 근거.

[BAD] topic_title "마케팅 효율화를 위한 콘텐츠 전략" / reader_problem "타겟 세그먼트에 맞는 콘텐츠를 제작하지 못함" / core_angle "AI 도구 활용한 최적화가 중요" → 어느 업종·어느 달에 써도 맞는 말. 특정성 0.
[GOOD] topic_title "광고비는 그대로인데 전화가 줄었을 때 먼저 볼 것" / reader_problem "이번 달 광고는 켜뒀는데 문의 전화가 지난달 절반이다" / core_angle "광고 자체보다 광고 뒤에 뭐가 있는지가 결과를 가른다 — 소재와 랜딩 첫 화면이 다른 말을 하면 클릭은 와도 전화가 안 온다" / hook_candidate "광고비는 그대로인데 / 전화가 줄었다면." → 이 글이 아니면 나올 수 없는 문장.

- 각 후보를 보고할 때, 그 후보의 content_angle/reader_problem 을 바탕으로 hook_candidate(첫 줄 후보, 30자 이내, 결론 미완성) 1개를 직접 제안해 보고서에 포함하라. (입력 JSON 의 creative_brief.hook_candidate 는 null 이므로 네가 채운다.)

v2 텔레그램 후보 형식 — 기존 형식을 유지하되 가능하면 다음 정보가 한 후보 안에 보이게 한다:
[후보 N] topic_title
- 기둥·문법·의도 (selected_content_pillar_label / content_treatment / engagement_intent)
- 독자 문제: reader_problem (1줄, 현장어)
- 각도: core_angle (1줄, 날선 주장)
- 첫 줄 후보: hook_candidate (네가 제안한 30자 이내 첫 줄)
- 적합도: fit_score
(label·candidate_index 는 입력 그대로 — 절대 변경 금지.)
`;

  const user = `오늘 수집 풀 ${candidatePool.length}건 중 기둥/전략 레인 기준으로 선별한 주제 후보 ${candidates.length}건:

${JSON.stringify(candidates, null, 2)}

해외 주제 후보 삽입 결과:
${JSON.stringify(socialSupplement || {}, null, 2)}

위 후보들을 정리해서 정욱님께 자연어 보고서를 작성해 주세요.`;

  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  let reportText = '';
  try {
    const { content } = await callOpenAI({
      stage: 'planning_phase1_report',
      jobId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { temperature: 0.4 },
    });
    reportText = normalizeTelegramReportText(content || '');
  } catch (e) {
    reportText = `정욱님, 오늘 ${candidates.length}건 모았으나 보고서 생성 중 오류가 발생했습니다. 어드민에서 직접 확인 부탁드립니다. (사유: ${e.message})`;
  }

  // planning_sessions 행 생성. webhook 이 사용자 응답을 이 세션에 매핑한다.
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('planning_sessions')
    .insert({
      job_id: jobId,
      status: 'phase1_reported',
      candidate_item_ids: candidates.map((c) => c.id),
      candidates_summary: candidatesSummary,
      report_text_phase1: reportText,
    })
    .select('id')
    .single();
  if (sessErr) throw new Error('planning_session 저장 실패: ' + sessErr.message);

  return {
    sessionId: session.id,
    reportText,
    candidateCount: candidates.length,
  };
}

export { PROMPT_VERSION as PLANNING_PHASE1_PROMPT_VERSION };

async function backfillRecentCandidateItems({ jobId, items = [], targetCount = 12 }) {
  const rows = Array.isArray(items) ? [...items] : [];
  if (rows.length >= targetCount) return rows;

  const existingIds = new Set(rows.map((item) => item.id).filter(Boolean));
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('agent_items')
    .select('id, source, post_url, normalized, classification, summary, theme_id, research_context, collected_at')
    .neq('job_id', jobId)
    .in('status', ['collected', 'reviewed', 'approved'])
    .gte('collected_at', since)
    .order('collected_at', { ascending: false })
    .limit(30);
  if (error) return rows;

  for (const item of data || []) {
    if (!item?.id || existingIds.has(item.id)) continue;
    rows.push(item);
    existingIds.add(item.id);
    if (rows.length >= targetCount) break;
  }
  return rows;
}

function normalizeTelegramReportText(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// 채택 후보별 creative_brief 를 LLM 으로 다듬는다.
// enrich 의 generic content_angle/content_angles 를 그대로 쓰던 baseCandidate.creative_brief 를
// 날선 core_angle·현장어 reader_problem·구체 evidence_needed 로 덮어쓴다.
// 실패 시 기존 brief 유지(보고서 흐름은 계속).
// e2e 검증 스크립트도 같은 다듬기를 거치도록 export.
export async function sharpenCreativeBriefs(candidates, { jobId } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return;
  const payload = candidates.map((c) => ({
    id: c.id,
    label: c.label,
    title: c.title,
    content_angle: c.content_angle,
    reader_problem: c.reader_problem,
    persona: c.persona,
    source: c.source,
    theme: c.theme,
    selected_content_pillar: c.selected_content_pillar || null,
  }));

  const sys = `${ontologyPrefix({ includeEnums: false })}너는 기브니즈 콘텐츠의 "콘셉트 다듬기 + 기획 에이전트" 다. 각 후보를 "발행 가능한 날선 콘셉트" + "글이 독자에게 일으킬 변화" 로 다시 적는다. 자료 원제·enrich 분류값을 그대로 옮기지 말고 이 글로만 할 수 있는 말로 다듬어라.

각 후보마다 다음 8개 필드를 JSON 으로 출력한다.
[기존 5필드 — 콘셉트]
- topic_title: 자료 원제 반복 X. 이 글로 발행하면 실제로 붙을 제목 방향. 30자 이내.
- reader_problem: 독자(일반적인 마케터·운영자) 가 *지금 갖고 있는 고민* 1줄. 마케팅 용어(전환율·퍼널·고객 의도) 금지. "광고비는 그대로인데 전화가 줄었다", "콘텐츠 올려도 저장이 안 늘어난다" 같은 장면.
- core_angle: 이 글의 척추가 될 날선 주장 1문장. 양비론·"둘 다 중요" 금지. 어디 붙여도 맞는 결론이면 실패.
- hook_candidate: 첫 줄 후보 1개, 30자 이내, 결론을 다 말하지 않음.
- evidence_needed: 이 주장을 받칠 구체 근거 2~4개. "사례·트렌드" 같은 추상어 금지. 무엇을(수치·실제 도구 이름·실제 명령·Before→After) 찾을지 콕 집어라.

[신규 3필드 — 기획 (글이 독자에게 무엇을 일으키는가)]
- planning_purpose: 이 글의 목적. 다음 enum 중 1~2개 배열로. ["change","resolve","improve"]
  · change: 독자의 *관점이나 기준을 바꾸는* 글. "이렇게 봤었는데 → 이렇게 보면 다르게 보인다"
  · resolve: 독자의 *지금 갖고 있는 문제를 푸는* 글. "이 문제를 → 이 방법/도구로 해결"
  · improve: 독자가 *지금 하고 있는 걸 더 잘하게 만드는* 글. "지금 이렇게 하고 있다면 → 이걸 더 하면 좋다"
- reader_takeaway: 글을 읽고 난 뒤 독자 머릿속에 *남아야 할 것* 1문장. **prefix 라벨 강제** — "행동:" 또는 "관점:" 또는 "기준:" 으로 시작.
  · "행동: 광고 켜기 전 랜딩 첫 화면이 광고 카피와 같은 말을 하는지 한 줄로 점검한다"
  · "관점: 광고비 문제가 아니라 광고 뒤 화면 문제일 가능성을 먼저 본다"
  · "기준: 콘텐츠가 '좋다'는 기준을 도구 사용량이 아니라 저장 수로 다시 잡는다"
  ※ 추상("영감을 얻는다", "중요성을 깨닫는다") 금지. 행동·관점·기준 중 *구체* 만 통과.
- proof_anchor_type: 이 주장을 받칠 *증거의 형태*. 다음 enum 중 1~2개 배열로. ["numbers","case","workflow","comparison"]
  · numbers: 수치·통계·비율로 증명
  · case: 실제 사례(브랜드·계정·인물)로 증명
  · workflow: 워크플로우·도구 사용 단계로 증명
  · comparison: 정보 vs 기준, Before vs After 같은 대비로 증명

[BAD 콘셉트] core_angle "AI 도구 활용한 최적화가 중요" / reader_takeaway "행동: AI 시대를 준비한다" — 둘 다 어디 붙여도 맞는 말.
[GOOD 콘셉트] core_angle "AI 가 초안을 쓰는 지금, 마케터의 값어치는 어떤 초안을 버릴지 아는 판단에서 나온다" / planning_purpose ["change"] / reader_takeaway "기준: AI 카피를 채택하기 전에 '독자가 멈춰 읽을 단어 한 개' 가 있는지부터 본다" / proof_anchor_type ["case","comparison"] — 이 글만 할 수 있는 말 + 독자가 가져갈 행동 기준 명확.

출력은 JSON 만:
{"briefs":[{"id":"<원본 id 그대로>","topic_title":"...","reader_problem":"...","core_angle":"...","hook_candidate":"...","evidence_needed":["...","..."],"planning_purpose":["change"],"reader_takeaway":"기준: ...","proof_anchor_type":["numbers"]}]}`;

  const user = `다듬을 후보들:
${JSON.stringify(payload, null, 2)}

같은 id 를 유지하면서 5개 필드를 날카롭게 다시 적어라.`;

  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  try {
    const { content } = await callOpenAI({
      stage: 'planning_brief_sharpen',
      jobId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.4 },
    });
    const obj = JSON.parse(content);
    const briefs = Array.isArray(obj?.briefs) ? obj.briefs : [];
    const byId = new Map(briefs.filter((b) => b && b.id).map((b) => [String(b.id), b]));
    const VALID_PURPOSE = new Set(['change', 'resolve', 'improve']);
    const VALID_PROOF = new Set(['numbers', 'case', 'workflow', 'comparison']);
    for (const c of candidates) {
      const sharp = byId.get(String(c.id));
      if (!sharp) continue;
      const existing = (c.creative_brief && typeof c.creative_brief === 'object') ? c.creative_brief : {};
      const str = (v) => typeof v === 'string' && v.trim() ? v.trim() : null;
      const evidence = Array.isArray(sharp.evidence_needed)
        ? sharp.evidence_needed.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4)
        : (existing.evidence_needed || []);
      const planningPurpose = Array.isArray(sharp.planning_purpose)
        ? sharp.planning_purpose.filter((x) => typeof x === 'string' && VALID_PURPOSE.has(x)).slice(0, 2)
        : (Array.isArray(existing.planning_purpose) ? existing.planning_purpose : []);
      const proofAnchor = Array.isArray(sharp.proof_anchor_type)
        ? sharp.proof_anchor_type.filter((x) => typeof x === 'string' && VALID_PROOF.has(x)).slice(0, 2)
        : (Array.isArray(existing.proof_anchor_type) ? existing.proof_anchor_type : []);
      // reader_takeaway: "행동:" / "관점:" / "기준:" prefix 강제 — 없으면 prepend 시도, 그래도 없으면 null.
      let takeaway = str(sharp.reader_takeaway) || str(existing.reader_takeaway) || null;
      if (takeaway && !/^(행동|관점|기준)\s*[:：]/.test(takeaway)) {
        // prefix 누락 시 기본을 "행동:" 으로 — 그래도 의미는 살아 있음.
        takeaway = `행동: ${takeaway}`;
      }
      c.creative_brief = {
        topic_title: (str(sharp.topic_title) || existing.topic_title || null)?.slice(0, 80) || null,
        reader_problem: (str(sharp.reader_problem) || existing.reader_problem || null)?.slice(0, 200) || null,
        core_angle: (str(sharp.core_angle) || existing.core_angle || null)?.slice(0, 240) || null,
        hook_candidate: (str(sharp.hook_candidate) || existing.hook_candidate || null)?.slice(0, 60) || null,
        evidence_needed: evidence,
        planning_purpose: planningPurpose,
        reader_takeaway: takeaway?.slice(0, 240) || null,
        proof_anchor_type: proofAnchor,
      };
    }
  } catch (e) {
    // 다듬기 실패해도 generic brief 그대로 두고 보고서는 계속.
    console.error('[composeDailyReport] creative_brief sharpening 실패:', e.message);
  }
}
