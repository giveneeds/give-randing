// 검토함의 agent_items 1건을 Threads 드래프트(thread_drafts) 로 변환.
// brief + research_context + 채널/주제 거버넌스 KB를 모두 LLM 에 컨텍스트로 주고,
// 겹치지 않는 여러 방향을 만들고, 자동 채점하되 모든 후보를 저장한다.
// 최종 선택은 사용자가 텔레그램/어드민에서 하도록 variant_review 에 기록을 남긴다.
//
// 매거진 본문 생성기와 별개. 스레드는 짧고 채널 톤이 강해서 독립 로직.

import fs from 'node:fs';
import path from 'node:path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';
import { buildKnowledgeContext } from '@/lib/knowledge/loader';
import { normalizePersona } from '@/lib/contentTaxonomy';
import { choosePillarStrategy, getContentPillars } from '@/lib/agent/contentPillarStrategy';
import { ontologyPrefix } from '@/lib/agent/contentOntology';

const PROMPT_VERSION = 'thread_v6_per_variant_loop_2026_05_28';

// 후보를 1개씩 생성하면서 강제로 다르게 만들기 위한 회전 풀.
// gpt-4o-mini 가 단일 호출로 N개 후보를 못 만들어서, 매 호출마다 hook/intent/pillar 를 바꿔 돌린다.
const HOOK_ROTATION = [
  'curiosity_gap',
  'confession_story',
  'provocation',
  'micro_humor',
  'pain_confession',
  'misconception_break',
  'proof_story',
];

const FALLBACK_INTENT_ROTATION = ['reach', 'relate', 'trust', 'convert', 'recycle'];

function readPerVariantConfig() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'content-pillars.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getIntentRotation() {
  const cfg = readPerVariantConfig();
  const rotation = Array.isArray(cfg?.defaultIntentRotation) ? cfg.defaultIntentRotation.filter(Boolean) : [];
  return rotation.length > 0 ? rotation : FALLBACK_INTENT_ROTATION;
}

function getPillarRotation(pillarCandidates) {
  const candidatePool = Array.isArray(pillarCandidates)
    ? pillarCandidates.map((c) => c?.content_pillar).filter((x) => typeof x === 'string')
    : [];
  if (candidatePool.length > 0) return candidatePool;
  const cfg = readPerVariantConfig();
  const fromConfig = Array.isArray(cfg?.defaultRotation) ? cfg.defaultRotation.filter(Boolean) : [];
  if (fromConfig.length > 0) return fromConfig;
  return Object.keys(getContentPillars());
}

/**
 * @param {{ itemId: string, formatTypeHint?: string, extraContext?: string|null, variantCount?: number }} args
 * @returns {Promise<{ draftId: string, draftIds: string[], postCount: number, model: string }>}
 */
export async function convertItemToThreadDraft({ itemId, formatTypeHint, extraContext, variantCount = 7 }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');
  const targetVariantCount = normalizeVariantCount(variantCount);

  const { data: item, error: itemErr } = await supabaseAdmin
    .from('agent_items')
    .select('id, theme_id, source, post_url, normalized, classification, summary, translation, research_context')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr || !item) throw new Error('아이템을 찾을 수 없음');

  const brief = item.classification || {};
  const summary = item.summary || {};
  const translation = item.translation || {};
  const rc = item.research_context || {};
  const originalTitle = translation.translated_title || item.normalized?.title || '';
  const originalText = translation.translated_text
    || item.normalized?.extracted_text
    || item.normalized?.text
    || item.normalized?.excerpt
    || summary.one_line_summary
    || '';

  // 주제 정보 (지식베이스 주입에 필요).
  let theme = null;
  if (item.theme_id) {
    const { data } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .eq('id', item.theme_id)
      .maybeSingle();
    theme = data || null;
  }
  const normalizedPersona = normalizePersona(theme?.target_persona || brief.suggested_persona || brief.target_persona || 'general');

  // 스레드 드래프트는 인기글 감사까지 포함해 후킹 패턴 학습을 강화 (enrich 보다 자료 다양).
  const knowledgeBlock = buildKnowledgeContext({
    topicCluster: theme?.target_topic_cluster || brief.suggested_topic_cluster,
    persona: normalizedPersona,
    channel: 'threads',
    includeAudit: true,
    contentTreatment: brief.content_treatment || brief.content_format || null,
    fomoMechanism: brief.fomo_mechanism || null,
    referenceQueryText: [
      theme?.name,
      brief.recommended_title,
      brief.content_angle,
      Array.isArray(brief.content_angles) ? brief.content_angles.join(' ') : '',
      brief.reader_problem,
      item.normalized?.title,
      originalText.slice(0, 500),
    ].filter(Boolean).join(' '),
  });

  // 밀도/기둥 판단은 회전 풀의 근거가 되도록 미리 1회 계산. LLM 단일 멀티후보 호출은 폐기.
  const pillarStrategy = choosePillarStrategy({ item, theme });
  const pillarCandidates = Array.isArray(pillarStrategy?.pillar_candidates)
    ? pillarStrategy.pillar_candidates.map(normalizePillarCandidate).filter(Boolean).slice(0, 3)
    : [];
  const pillarRotation = getPillarRotation(pillarCandidates);
  const intentRotation = getIntentRotation();

  const sharedContext = {
    originalTitle,
    originalText,
    brief,
    rc,
    normalizedPersona,
    knowledgeBlock,
    extraContext,
    formatTypeHint,
    itemId,
  };

  // 후보를 1개씩 순차 생성한다. priorVariants 가 누적돼야 다음 후보가 겹치지 않으므로 병렬이 아니라 순차 필수.
  const model = process.env.OPENAI_THREAD_MODEL || 'gpt-4o-mini';
  const generatedVariants = [];
  const priorVariants = [];
  let totalCost = null;

  // 병렬 생성 — 각 variant 에 hook/intent/pillar 를 미리 다르게 배정(rotation)하므로
  // 서로 안 봐도 차별화된다. 순차(이전 variant 회피) 대신 병렬로 maxDuration(300s) 안에 끝낸다.
  const variantTasks = [];
  for (let i = 0; i < targetVariantCount; i += 1) {
    variantTasks.push(generateSingleVariant({
      index: i,
      assignedHook: HOOK_ROTATION[i % HOOK_ROTATION.length],
      assignedIntent: intentRotation[i % intentRotation.length],
      assignedPillar: pillarRotation.length > 0 ? pillarRotation[i % pillarRotation.length] : null,
      priorVariants: [], // 병렬이라 이전 회피 불가 — rotation 배정이 차별화를 보장.
      model,
      ...sharedContext,
    }));
  }
  const variantResults = await Promise.all(variantTasks);
  for (const result of variantResults) {
    if (!result || !result.variant) continue;
    generatedVariants.push(result.variant);
    if (Number.isFinite(result.cost)) totalCost = (totalCost || 0) + result.cost;
  }

  if (generatedVariants.length === 0) {
    throw new Error('LLM 응답에 유효한 포스트가 없습니다.');
  }

  const cost = totalCost;
  const variantReview = buildPerVariantReview({
    variants: generatedVariants,
    targetVariantCount,
    pillarCandidates,
  });
  const variantsToSave = variantReview.variants;
  const recommendedVariant = variantReview.recommendedVariant || variantsToSave[0];

  // density_check 는 추천 후보의 신호로 채운다. 멀티후보 단일 호출이 없어졌으므로 추천 후보 기준으로 일관되게 작성.
  const densityCheck = normalizeDensityCheck(buildDensityCheckFromVariant(recommendedVariant, pillarStrategy));
  const insertRows = variantsToSave.map((variant) => {
    const posts = sanitizePosts(variant.posts);
    const generationDecision = buildGenerationDecision(variant, densityCheck);
    const riskFlags = buildRiskFlags(variant, generationDecision, posts);
    const resolvedFormat = VALID_FORMATS.has(variant.format_type)
      ? variant.format_type
      : chooseFallbackFormat({ formatTypeHint, generationDecision });

    return {
      agent_item_id: item.id,
      theme_id: item.theme_id || null,
      channel: 'threads',
      format_type: resolvedFormat,
      hook_pattern: typeof variant.hook_pattern === 'string' ? variant.hook_pattern : null,
      tone_pattern: typeof variant.tone_pattern === 'string' ? variant.tone_pattern : null,
      engagement_drivers: Array.isArray(variant.engagement_drivers) ? variant.engagement_drivers.filter((x) => typeof x === 'string') : [],
      title: buildVariantTitle(variant),
      posts,
      cta: typeof variant.cta === 'string' ? variant.cta : null,
      hashtags: Array.isArray(variant.hashtags) ? variant.hashtags.filter((x) => typeof x === 'string').slice(0, 10) : [],
      risk_flags: riskFlags,
      research_context_used: {
        generation_density_check: densityCheck,
        generation_decision: generationDecision,
        variant_review: {
          ...variantReview.metadata,
          saved_variant_id: variant.variant_id,
          human_selection_status: 'pending',
        },
      },
      status: 'draft',
      generator_model: model,
      generator_cost_usd: cost,
      generator_prompt_version: PROMPT_VERSION,
    };
  });

  const { data: drafts, error: insErr } = await supabaseAdmin
    .from('thread_drafts')
    .insert(insertRows)
    .select('id, title');
  if (insErr) throw new Error('드래프트 저장 실패: ' + insErr.message);

  const savedDrafts = (drafts || []).map((draft, idx) => ({
    draftId: draft.id,
    title: draft.title,
    variant_id: variantsToSave[idx]?.variant_id || idx + 1,
    recommended: variantsToSave[idx]?.variant_id === variantReview.metadata.recommended_variant_id,
    risk_flag_count: Array.isArray(variantsToSave[idx]?.risk_flags) ? variantsToSave[idx].risk_flags.length : null,
    content_pillar: variantsToSave[idx]?.content_pillar || null,
    content_treatment: variantsToSave[idx]?.content_treatment || null,
    explanation_style: variantsToSave[idx]?.explanation_style || null,
    format_type: variantsToSave[idx]?.format_type || null,
  }));
  const recommendedDraft = savedDrafts.find((d) => d.recommended) || savedDrafts[0];
  const recommendedDecision = buildGenerationDecision(recommendedVariant, densityCheck);
  const recommendedRiskFlags = buildRiskFlags(recommendedVariant, recommendedDecision, sanitizePosts(recommendedVariant.posts));

  return {
    draftId: recommendedDraft?.draftId,
    draftIds: savedDrafts.map((d) => d.draftId),
    savedDrafts,
    postCount: sanitizePosts(recommendedVariant.posts).length,
    model,
    densityCheck,
    generationDecision: recommendedDecision,
    variantReview: variantReview.metadata,
    riskFlags: recommendedRiskFlags,
  };
}

const VALID_FORMATS = new Set(['single_post', 'short_thread', 'resource_thread', 'mega_thread']);

// 이미 만든 후보를 다음 호출에 넘길 짧은 요약(제목 + 첫 문장 + 결론 한 줄)으로 압축.
function summarizeVariantForDedup(variant) {
  const posts = Array.isArray(variant?.posts) ? variant.posts : [];
  const firstBody = posts[0]?.body || '';
  const lastBody = posts[posts.length - 1]?.body || '';
  const firstSentence = firstBody.split(/[\n.!?。]/).map((s) => s.trim()).filter(Boolean)[0] || firstBody.slice(0, 60);
  const endingLine = lastBody.split(/[\n.!?。]/).map((s) => s.trim()).filter(Boolean).slice(-1)[0] || lastBody.slice(-60);
  return {
    variant_id: variant?.variant_id,
    title: typeof variant?.title === 'string' ? variant.title.slice(0, 60) : '',
    hook_pattern: variant?.hook_pattern || null,
    engagement_intent: variant?.engagement_intent || null,
    content_pillar: variant?.content_pillar || null,
    first_sentence: firstSentence.slice(0, 80),
    ending_line: endingLine.slice(0, 80),
  };
}

// density_check 를 추천 후보 + pillarStrategy 에서 합성. 별도 LLM 호출 없이 다운스트림 스키마를 채운다.
function buildDensityCheckFromVariant(variant, pillarStrategy) {
  const angle = pillarStrategy?.content_pillar_reason || '';
  const riskFlags = Array.isArray(variant?.risk_flags) ? variant.risk_flags : [];
  const thin = riskFlags.some((f) => typeof f === 'string' && f.includes('리서치 부족'));
  return {
    source_signal: pillarStrategy?.research_source_summary || '',
    old_friction: '',
    new_change: pillarStrategy?.writing_direction || '',
    giveneeds_angle: angle || (typeof variant?.angle === 'string' ? variant.angle : ''),
    misconception_to_break: '',
    practical_examples: [],
    research_sufficiency: thin ? 'thin' : 'enough',
    missing_info: [],
  };
}

// 후보 1개 생성. 매 호출은 assigned hook/intent/pillar 를 고정하고, priorVariants 와 겹치지 말라고 지시한다.
async function generateSingleVariant({
  index,
  assignedHook,
  assignedIntent,
  assignedPillar,
  priorVariants,
  model,
  originalTitle,
  originalText,
  brief,
  rc,
  normalizedPersona,
  knowledgeBlock,
  extraContext,
  formatTypeHint,
  itemId,
}) {
  const variantId = index + 1;
  const priorBlock = Array.isArray(priorVariants) && priorVariants.length > 0
    ? `[이미 만든 후보들 — 절대 겹치면 안 됨]\n${priorVariants.map((p, i) => `${i + 1}) hook=${p.hook_pattern || '?'} / intent=${p.engagement_intent || '?'} / pillar=${p.content_pillar || '?'}\n   제목: ${p.title}\n   첫 문장: ${p.first_sentence}\n   결론: ${p.ending_line}`).join('\n')}\n\n위 후보들과 hook·첫 문장·결론이 겹치면 실패다. 완전히 다른 각도로 써라.\n`
    : '';

  const sys = `${ontologyPrefix({ includeEnums: false })}너는 기브니즈(B2B 마케팅 에이전시)의 Threads 콘텐츠 작가다.
주 독자는 마케팅을 직접 판단해야 하는 작은 사업자/브랜드 운영자다. 원문/브리프가 특정 업종을 말할 때만 요식업 사장님·병의원 원장·자영업자로 좁힌다. 뉴스성/시사성 소재는 억지로 "자영업자 실무팁"으로 닫지 않아도 된다.

이번 호출은 후보 1개만 만든다. 반드시 아래 지정값을 따른다:
- hook_pattern = ${assignedHook}
- engagement_intent = ${assignedIntent}
- content_pillar = ${assignedPillar || '(소재에 맞게 직접 고름)'}

규칙:
- 검증 플래그(risk_flags): 다음에 해당하면 risk_flags 에 짧은 한국어 플래그를 넣는다 — 1인칭 경험 날조(가짜 "저도 해봤어요"), FOMO 과격 표현("망한다/끝이다"), 명백한 일반론(브랜드/숫자/장면 없음), 정보형 연결글 본문 부족. 해당 없으면 빈 배열.
- 기본은 single_post 다. 실행 단계가 3개 이상으로 명확히 나뉠 때만 연결글로 쪼갠다. 토막 여러 개로 나누지 말고 한 포스트에 흐름을 담는 걸 우선한다.
- Threads는 한 포스트에 최대 1000자. single_post 는 250~400자로, 짧은 문장(20자 이내) 여러 개를 줄바꿈으로 쌓아 한 포스트 안에서 도입→전개→마무리 흐름을 만든다. 한 문장만 길게 늘이지 않는다.
- 연결글의 1번 포스트는 설명문이 아니라 문을 여는 hook 이다. 80~220자를 우선하고, 짧게 궁금증/FOMO/오해 깨기를 만든 뒤 정보 설명은 2번 포스트부터 푼다.
- 연결글의 2번 이후 포스트는 역할에 따라 300~850자를 권장한다. 첫 포스트가 짧아도 전체 정보 밀도는 낮아지면 안 된다.
- 첫 포스트 첫 줄은 30자 이내. 결론을 다 말하지 말고 "왜?", "나도 놓친 건가?", "그래서 뭘 봐야 하지?"가 남아야 한다.
- 한 문장은 10~30자 사이에서 길이를 일부러 들쭉날쭉하게 쓴다. 10자로 툭 끊기도 하고, 20자 내외로 흘러가다, 가끔 30자로 한 번에 마무리하기도 한다. 사람이 말하듯 호흡과 완급이 느껴져야 한다.
- 모든 문장이 비슷한 길이(예: 다 20자 안팎)면 실패다. 짧은 문장을 더 많이 쓰되, 길이를 규칙적으로 만들지 말고 변칙적으로 섞는다. 줄바꿈을 자주 써서 빠르게 읽히게 한다.
- 위 [실제 발행된 Threads 글] 샘플이 있으면, 그 글들의 문장 길이 리듬·끊는 호흡을 그대로 흉내낸다. 글자 수를 세지 말고 그 호흡을 따라라.
- 전문 용어보다 현장어를 우선한다. 현장어는 돈/시간/화면/행동/감정 중 2개 이상이 보이는 문장이다(치환 예시는 아래 현장어 치환 테이블 참고).
- reader_problem은 보고서 문장이 아니라 현장에서 나오는 고민 문장으로 본문에 녹인다. 단, 과한 반말/유행어/비하 표현은 쓰지 않는다.
- 소비자언어는 쉬운 설명문이 아니라 실제 사람이 검색창에 치거나 옆 사람에게 묻는 말이다. 첫 3줄 안에 가능한 한 "주차 돼?", "지금 열었어?", "예약 되나?", "애 데리고 가도 돼?"처럼 실제 말투/검색어/장면을 넣는다.
- 초반에 "방문 직전 고객", "검색 의도", "구매 퍼널", "전환", "예약으로 이어지는 고객", "~할 가능성이 큽니다", "~하는 단계입니다" 같은 분석어를 쓰면 실패다.
- 사람이 실제로 잘 쓰지 않는 작문체를 생활어처럼 꾸미지 않는다. "아직 구경 중일 때가 많습니다", "진짜 오늘 나갈 사람은" 같은 어색한 설명문보다 실제 질문/검색어를 먼저 보여준다.
- 거버넌스에서 "사용하지 않는 표현" 으로 분류된 어휘는 절대 쓰지 않는다.
- 의료광고 영역이면 효과 보장 표현 금지, 진료 권유성 어휘 금지.
- engagement_intent 는 위에서 지정한 ${assignedIntent} 를 따른다. reach=유입(정보·체크리스트), trust=신뢰(사례·실패담), convert=전환(자료·진단), relate=관계(질문·공감), recycle=재활용(시리즈)다.
- content_pillar 는 위에서 지정한 값(${assignedPillar || '소재에 맞게 직접 선택'})을 따른다. 지정값이 소재와 정말 안 맞으면 가장 가까운 다른 기둥으로 바꿔도 되지만 이유가 분명해야 한다.
- content_pillar 는 방향판이다. 하네스의 주제 예시를 그대로 복사하지 말고, 원문/최신 audit/리서치에서 새 주제를 가져와 가장 맞는 기둥 후보에 배치한다.
- content_pillar 와 content_treatment 를 분리한다. 기둥은 글의 역할, treatment 는 푸는 문법이다.
- 주제는 플레이스에 앵커링하지 않는다. 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 스레드/숏폼, 블로그, 상세페이지, 요즘 되는 방식 관찰까지 열어둔다.
- 뉴스성 소재는 어느 기둥에서도 news_commentary 로 처리할 수 있다. 모든 소재를 체크리스트나 실행 가이드로 바꾸지 않는다.
- FOMO는 글 안에 녹이는 심리 장치다. 약하게 흉내만 내지 말고 분명하게 만든다. fomo_intensity 는 기본 clear 로 두고, 첫 포스트나 마무리에서 "놓침·격차·뒤처짐" 감정 하나를 선명하게 건드린다. 단 과격한 공포 문장(금지어 3번)은 여전히 금지 — 공포가 아니라 "나만 놓치는 것 같은 감각" 으로.
- fomo_reframe 은 표현 템플릿이 아니라 심리 구조다. quiet_gap, delayed_regret, rule_changed, insider_move, cost_leak, authority_signal, missed_timing, wrong_problem, comparison_gap 중 주제에 맞는 하나를 고른다.
- 좋은 FOMO는 "나만 놓치고 있을 수 있다", "잘하는 곳은 조용히 바꾸고 있다", "지금은 티 안 나지만 나중에 차이 난다", "왜 안 되는지 모른 채 돈/시간을 쓸 수 있다" 중 하나의 감정을 만든다. 단, 매번 같은 표현을 반복하지 않는다.
- news_commentary/opinion/case_note 에서는 "논란이 터졌습니다 → 여러분도 문구를 점검하세요" 같은 얕은 결론을 실패로 본다. 사건의 맥락, 사람들이 반응한 이유, 브랜드 운영자가 놓친 감각 중 최소 2개가 보여야 한다.
- 뉴스/사례 글은 브랜드명·캠페인명·날짜·문제 문구·소비자 반응 같은 확인된 신호 1~2개를 본문에 반드시 넣는다.
- 추상어 반복 금지: "고객은 이제", "존중받는 느낌", "브랜드가 놓치는 감정", "메시지를 조정해야 할 때" 같은 문장을 근거 없이 반복하지 않는다. 그러면 일반론으로 보고 실패다.
- 좋은 뉴스 코멘터리는 교훈을 먼저 말하지 않는다. "무슨 표현이 어떤 기억/감정을 건드렸고, 왜 의도보다 해석이 커졌는가"를 먼저 보여준 뒤 관점으로 닫는다.
- 이번 호출은 후보를 단 1개만 만든다. 아래 priorVariants 에 이미 만든 후보가 있으면 그것들과 hook·첫 문장·핵심 비유·CTA·번호 구조·결론을 절대 재사용하지 않는다.
- confession_story(고백 서사)는 반드시 3인칭 관찰로만 쓴다(금지어 4번 참고).
- provocation(도발)은 옵트인/약하게만 쓴다. 비하·과격 표현 없이 통념을 살짝 흔드는 정도다.
- micro_humor(가벼운 유머)는 가볍게만 쓴다. 억지 드립·말장난 남발은 실패다.
- 밀도 있는 글을 위해 source_signal, old_friction, new_change, giveneeds_angle, misconception_to_break 를 먼저 머릿속으로 정리한 뒤 본문을 쓴다.
- Threads 발행 레퍼런스가 있으면 "이런 식으로 구성되는구나"를 먼저 읽고 주제 선정과 구조 판단에 반영한다. 별도 DB에 저장된 분석값을 찾지 말고, 레퍼런스 원문/관찰 기록에서 첫 글 hook, 후속 포스트 역할, 저장/공유 장치를 감각적으로 빌린다.
- 단, 이미지 카드형 레퍼런스의 짧은 캡션은 텍스트 원고의 낮은 기준으로 삼지 않는다. 카드 OCR이 없는 표본은 "이미지 안 정보가 있을 수 있음"으로 보고, 우리 원고는 텍스트만으로도 이해될 만큼 맥락을 보강한다.
- 벤치마크가 "정보형 1/n 연속글 수집 미확정"이라고 표시하면 연속 포스트를 무조건 만들지 않는다. 주제가 정보형이면 납득에 필요한 기준/예시/맥락이 충분한지로 포스트 수를 정한다.
- practical_examples 는 "무엇을/어느 화면이나 도구에서/왜 하는지"가 보여야 한다. 근거 없는 "AI로 분석하세요", "콘텐츠를 만드세요" 류는 예시로 인정하지 않는다.
- practical_examples 는 practical_tip/checklist/resource_thread 에서 중요하다. news_commentary/opinion 에서는 0~1개여도 괜찮고, 대신 source_signal 과 giveneeds_angle 이 선명해야 한다.
- 원문·리서치에 없는 도구 기능, 효과, 성과를 만들지 않는다. 확인되지 않은 예시는 missing_info 에 넣고 본문에서는 낮춰 쓴다.
- 리소스가 부족하면 억지로 아는 척하지 말고 research_sufficiency='thin' 또는 'missing' 으로 두고 risk_flags 에 "리서치 부족"을 남긴다.
- format_type 은 자동으로 고른다. single_post 는 관찰/공감/짧은 오해 깨기, short_thread 는 실제 단계가 나뉠 때, resource_thread 는 도구·템플릿·예시 모음일 때만 쓴다.
- 포스트 수는 주제의 밀도로 결정한다. single_post 는 한 포스트 안에서 250~400자로 장면, 맥락, 관점, 마무리가 짧은 문장 여러 개로 서야 한다. short_thread 는 각 포스트 역할이 분리될 때만 쓴다. resource_thread 는 실제 예시/도구/문장/검색어가 5개 이상일 때만 쓴다.
- 절대 길이 기준: short_thread/resource_thread/mega_thread 중 explainer, practical_tip, checklist, case_note, news_commentary 는 전체 본문 합계 800자 이상을 기본으로 한다. 1번 hook 포스트를 제외한 각 후속 포스트는 ending 전까지 250자 이상을 우선한다. 60~100자짜리 요약 포스트 여러 개는 실패다.
- 리서치가 얇아도 60~100자 포스트로 때우지 않는다. 모르는 부분은 낮춰 쓰되, 확인된 맥락·예시·기준·반론을 충분히 풀어 single_post 500자 또는 연결글 총 800자 기준을 맞춘다.
- 새 개념/뉴스/기술 정보글은 5~7개 포스트까지 허용한다. "이게 뭐냐 → 왜 나왔냐 → 실제 사례 → 어디에 쓰냐 → 무엇을 봐야 하냐"가 필요하면 짧게 압축하지 않는다.
- 정보글은 문답지처럼 쓰지 않는다. 독자가 속으로 물을 법한 질문 흐름을 자연스러운 설명문/대화형 문장으로 녹인다.
- 제목/원문에 에이전틱 AI, 제로클릭 커머스, 자율 마케팅처럼 독자가 모를 개념이 있으면 반드시 초반에 쉬운 말로 풀어준다. 단, "Q. / A." 형식은 쓰지 않는다.
- 짧게 쓰는 기준은 "한 관점으로 충분해서"다. 길게 쓰는 기준은 "납득에 필요한 장면과 기준이 여럿이라"다. 같은 결론을 늘리기 위해 나누면 실패다.
- 각 포스트에는 role 이 있어야 한다. hook/problem, context, mistake, criterion, example, action, ending 중 하나로 설명할 수 없으면 그 포스트는 만들지 않는다.
- 1,2,3 식 번호 매기기는 기본값이 아니다. 단계·체크리스트·리소스 목록이 명확할 때만 쓴다.
- 리서치가 얇거나 한 문장 관점이 강한 소재는 어느 기둥이든 single_post 를 우선하고, 짧은 문장과 줄바꿈으로 끝낼 수 있다.
- CTA는 기본값이 아니다. 본문과 이어지지 않으면 ending_type='none' 으로 닫는다.
- 단, engagement_intent 가 relate 면 본문과 자연스럽게 이어지는 질문으로 마무리해 댓글/대화를 유도한다(ending_type='question'). 이건 억지 상담 CTA(diagnostic_comment/soft_dm)와 다르다.
- 상담형 CTA는 diagnostic_comment 또는 soft_dm 목적일 때만 쓴다. "업종/지역 남겨주세요" 반복 문구는 피한다.
- 본문에 광고/기브니즈 자기소개는 안 한다. CTA가 필요할 때도 가볍게만 둔다.
- 광고티 X, 실무 적용 가능한 인사이트 중심. 전문 용어가 나오면 돈/시간/화면/행동/감정이 보이는 말로 치환한다.
- 첫 2줄에는 타깃이 겪는 실제 상황이나 말투가 보여야 한다. 연결글이면 첫 포스트에서 결론을 다 말하지 않는다.
- 이번 입력의 브랜드/사건/표현을 지워도 성립하는 일반론이면 실패다. 본문만 읽어도 왜 이 소재에서 나온 글인지 보여야 한다.
- 글은 하나의 날선 주장(이 사람만의 관점) 을 향해 끝까지 간다. "그래서 무슨 말을 하려는 건지" 가 한 문장으로 분명해야 한다. 양쪽 다 맞는 말("AI는 좋지만 사람도 중요")로 닫지 않는다.
- "차별점을 찾아라", "우리 언어로 바꿔라" 같은 실행 불가능한 추상 조언은 금지한다. 대신 구체 예시 하나를 보여준다 (예: "이 문구를 → 이렇게" 처럼 before/after, 또는 실제 입력값/화면/장면 한 개).
- 독자가 실제 겪는 장면 하나(검색하는 순간, 막막한 고민, 했던 실수)를 넣어 감정이 닿게 한다. 설명만 나열하지 않는다.
- 리서치가 얇으면 단정적 글 대신 관찰형/질문형으로 낮추고 risk_flags 에 "리서치 부족"을 포함한다.

[언어 감각 — Before/After 쌍으로 익혀라. 규칙이 아니라 차이를 느껴라]
(각 GOOD 안의 " / " 는 줄바꿈을 의미한다. 실제 출력에서는 줄을 바꿔 쓴다.)

PAIR 1 — 첫 줄 훅:
BAD: "메타 광고 성과를 높이기 위한 3가지 핵심 전략을 알아보겠습니다." → 결론을 다 말했다. 멈출 이유가 없다.
GOOD: "광고비는 그대로인데 / 전화가 줄었다면." → 상황만 던졌다. 이유가 없어서 다음 줄을 읽는다.

PAIR 2 — 독자 문제:
BAD: "고객 전환율이 낮아 마케팅 효율이 저하되는 문제가 발생합니다." → 분석 보고서 문장. 자기 얘기로 안 읽힌다.
GOOD: "플레이스는 보는데 / 예약 버튼까지 안 간다. / 보고 나가는 거다." → 오늘 겪은 일이다.

PAIR 3 — FOMO:
BAD: "지금 당장 하지 않으면 경쟁에서 뒤처지고 결국 폐업으로 이어질 수 있습니다." → 과격 공포. 한 번 놀라면 무뎌진다.
GOOD: "잘 되는 곳은 조용히 바꾸고 있다. / 말을 안 할 뿐이지." → 공포가 아니라 뒤처짐의 감각.

PAIR 4 — 결론 닫기:
BAD: "결국 AI는 도구일 뿐이고, 중요한 것은 브랜드의 본질적인 가치입니다." → 어디에나 붙는 문장. 이 글만의 이유가 없다.
GOOD: "AI가 초안을 써도 / 첫 댓글을 직접 달면 저장률이 달라진다. / 그 타이밍이 사람을 느끼게 하는 거의 유일한 신호라서." → 이 글이 아니면 못 나오는 마무리.

PAIR 5 — confession_story:
BAD: "저도 처음엔 광고비를 300만원 날렸어요." → 봇이 지어낸 1인칭. 발각되면 신뢰 붕괴.
GOOD: "어떤 클리닉 원장님이 6개월 광고비를 날린 뒤 / 처음으로 랜딩 화면을 바꿨다. / 그달 예약이 1.8배 됐다." → 3인칭 관찰. 신뢰는 지킨다.

PAIR 6 — 문장 리듬:
BAD: "광고 소재와 랜딩 페이지의 메시지 일관성을 확보하는 것이 전환율 향상에 중요한 역할을 합니다." → 한 문장이 너무 길어 멈춘다.
GOOD: "광고에서 본 말이랑 / 들어와서 본 첫 화면이 / 다른 얘기를 하고 있으면. / 클릭은 와도 / 전화가 안 온다." → 5줄로 쪼개 리듬이 생긴다.

[현장어 치환 테이블 — 왼쪽(분석어)을 본문에 쓰지 말고 오른쪽(현장어)으로 바꾼다]
| 분석어 | 현장어 |
| --- | --- |
| 전환율이 낮다 | 광고비는 나가는데 전화가 안 온다 |
| 퍼널이 끊긴다 | 플레이스는 보는데 예약 버튼까지 안 간다 |
| 고객 여정 | 손님이 검색하다 떠나는 구간 |
| ROAS 최적화 | 광고비 쓴 만큼 돌아오는지 확인 |
| 콘텐츠 최적화 | 보고 넘기지 않게 고치는 것 |
| 타겟 세그먼트 | 우리 가게를 고를 사람 |
| 브랜드 포지셔닝 | 손님 머릿속에 남는 한마디 |

[출력 전 자가 점검 — 아래를 모두 통과해야 출력한다]
□ 첫 줄 30자 이내 + 결론 미완성
□ 하나의 주장(core angle)을 끝까지 유지
□ PAIR 4 BAD 처럼 "어디에나 붙는 결론"으로 닫지 않음
□ confession 이면 PAIR 5 처럼 3인칭
□ 현장어 치환 테이블의 분석어가 본문에 없음
□ 문장 길이 들쭉날쭉(PAIR 6)
□ FOMO 면 PAIR 3 처럼 공포 아닌 뒤처짐 감각
□ risk_flags 점검

${knowledgeBlock ? `[참조 지식·거버넌스]\n${knowledgeBlock}\n\n` : ''}출력 형식: JSON 만. 후보 1개 객체만 반환한다(variants 배열·scores 없음). 형식:
{
  "title": "내부 식별용 짧은 라벨 (40자 이내)",
  "angle": "이 후보만의 다른 해석 방향",
  "content_pillar": "${assignedPillar || 'cost_before_spend | do_today | current_observation | trend_plain | content_showcase'}",
  "content_treatment": "news_commentary | practical_tip | checklist | explainer | case_note | opinion | fomo_reframe",
  "engagement_intent": "${assignedIntent}",
  "hook_pattern": "${assignedHook}",
  "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning",
  "fomo_mechanism": "quiet_gap | delayed_regret | rule_changed | insider_move | cost_leak | authority_signal | missed_timing | wrong_problem | comparison_gap | none",
  "fomo_intensity": "none | subtle | clear",
  "fomo_expression": "none | hook_only | body_context | ending_reframe",
  "ending_type": "none | save | question | soft_dm | diagnostic_comment",
  "format_type": "single_post | short_thread | resource_thread",
  "explanation_style": "scene | conversational_explainer | checklist | case_breakdown | resource_list | opinion_note | comparison",
  "posts": [
    { "index": 1, "body": "..." }
  ],
  "cta": "CTA가 있을 때만 작성. 없으면 빈 문자열",
  "hashtags": ["#브랜드마케팅"],
  "risk_flags": ["1인칭 경험 날조 위험" 등 검증 플래그, 없으면 빈 배열]
}`;

  const user = `원문 제목: ${originalTitle}
원문 발췌:
${originalText.slice(0, 1500)}

[브리프]
페르소나: ${normalizedPersona}
토픽: ${brief.suggested_topic_cluster || '(미지정)'}
추천 제목: ${brief.recommended_title || '(없음)'}
독자 문제: ${brief.reader_problem || '(없음)'}
왜 지금: ${brief.why_now || '(없음)'}
핵심 앵글: ${brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '') || '(없음)'}
실용 takeaway: ${brief.practical_takeaway || '(없음)'}
실행 단계: ${(Array.isArray(brief.execution_steps) ? brief.execution_steps.join(' / ') : '(없음)')}
적합도: ${typeof brief.fit_score === 'number' ? Math.round(brief.fit_score * 100) + '%' : '?'}

${rc?.pain_points?.length ? `[리서치에서 관찰된 운영자 페인포인트]\n${rc.pain_points.join(' / ')}\n` : ''}${rc?.viral_hooks?.length ? `[자주 쓰이는 후킹]\n${rc.viral_hooks.map((h) => `${h?.pattern}${h?.example ? ' (예: ' + h.example + ')' : ''}`).join('\n')}\n` : ''}
${extraContext ? `${extraContext}\n` : ''}
${priorBlock}요청 (후보 ${variantId}번):
- 위 브리프·리서치를 반영해 format_type 을 직접 고른다. ${formatTypeHint ? `힌트는 ${formatTypeHint} 이지만, 소재에 맞지 않으면 바꿔도 된다.` : '힌트가 없으면 single_post/short_thread/resource_thread 중 가장 자연스러운 형식을 고른다.'}
- 한 포스트는 최대 1000자다. single_post 는 250~400자로 쓰되 문장은 20자 이내로 짧게 끊는다. 정보형 연결글은 전체 본문 합계 800자 이상으로 쓴다. 연결글의 1번 포스트는 80~220자의 hook 을 우선하고, 2번 이후 포스트에서 정보 밀도를 채운다.
- 지정된 hook_pattern=${assignedHook}, engagement_intent=${assignedIntent}, content_pillar=${assignedPillar || '(직접 선택)'} 를 글의 각도로 분명히 드러낸다.
- 첫 3줄은 실제 사람이 쓰는 말/검색어/장면/호기심으로 시작한다. "키워드", "퍼널", "전환", "고객 의도" 같은 분석어로 시작하지 않는다.
- FOMO는 fomo_intensity(none/subtle/clear)와 fomo_expression(none/hook_only/body_context/ending_reframe)로 자연스럽게 녹인다. 과격한 공포 문장은 금지.
- 출력은 후보 1개 JSON 객체만.`;

  let parsed = null;
  let cost = null;
  try {
    const { content, raw } = await callOpenAI({
      stage: 'thread_draft_variant',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.7 },
    });
    parsed = JSON.parse(content);
    if (raw?.usage) {
      const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 }, 'gpt-4o': { in: 2.5, out: 10 } };
      const p = PRICE[model];
      if (p) cost = ((raw.usage.prompt_tokens || 0) * p.in + (raw.usage.completion_tokens || 0) * p.out) / 1_000_000;
    }
  } catch (e) {
    return null;
  }

  // 단일 후보 객체를 기존 normalizeVariant 로 정제. variant_id 는 합성.
  let variant = normalizeVariant({ ...parsed, variant_id: variantId }, index);
  if (!variant) return null;

  // 하드 품질 실패(너무 짧음/얇음)면 이 후보 1개만 1회 재생성 시도.
  const hardIssues = collectSingleVariantIssues(variant);
  if (hardIssues.length > 0) {
    try {
      const retryUser = `${user}\n\n[직전 시도 문제]\n${hardIssues.join(' / ')}\n위 문제를 고쳐서 다시 후보 1개를 만든다. single_post 는 250자 이상(문장은 20자 이내로 짧게), 정보형 연결글은 총 800자 이상, 후속 포스트는 각 250자 이상으로 쓴다.`;
      const { content } = await callOpenAI({
        stage: 'thread_draft_variant_retry',
        itemId,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: retryUser },
        ],
        model,
        params: { response_format: { type: 'json_object' }, temperature: 0.6 },
      });
      const retryParsed = JSON.parse(content);
      const retried = normalizeVariant({ ...retryParsed, variant_id: variantId }, index);
      if (retried && collectSingleVariantIssues(retried).length < hardIssues.length) {
        variant = retried;
      }
    } catch {
      // 재생성 실패 시 원래 후보를 risk_flag 와 함께 유지.
    }
  }

  return { variant, cost };
}

// 후보 1개의 하드 품질 이슈를 문자열 배열로 수집(재생성 판단용). 기존 길이/밀도 헬퍼 재사용.
function collectSingleVariantIssues(variant) {
  const posts = Array.isArray(variant?.posts) ? variant.posts : [];
  const issues = [];
  if (posts.length === 0) {
    issues.push('유효한 posts 없음');
    return issues;
  }
  const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
  if (variant.format_type === 'single_post' && (posts[0]?.body?.length || 0) < 500) {
    issues.push(`single_post 500자 미만 (${posts[0]?.body?.length || 0}자)`);
  }
  const minTotalChars = minimumTotalCharsForVariant(variant);
  if (totalChars < minTotalChars) {
    issues.push(`최소 본문량 미달 (${totalChars}/${minTotalChars}자)`);
  }
  if (posts.length > 1 && posts.some((p, postIdx) => isThinContinuationPost({ post: p, postIdx, posts, variant }))) {
    issues.push('후속 포스트 정보 밀도 부족');
  }
  if (looksGenericAiFiller(posts)) {
    issues.push('AI식 일반론/구체 신호 부족');
  }
  return issues;
}

// 1개씩 생성된 후보들을 기존 변환 코드가 기대하던 variantReview 모양으로 조립.
function buildPerVariantReview({ variants, targetVariantCount, pillarCandidates }) {
  const list = (Array.isArray(variants) ? variants : []).map((v, idx) => ({
    ...v,
    variant_id: Number.isFinite(Number(v?.variant_id)) ? Number(v.variant_id) : idx + 1,
  }));

  const riskFlagCount = (v) => (Array.isArray(v?.risk_flags) ? v.risk_flags.length : 0);
  // verdict: 검증 플래그 0=pass, 1~2=hold, 3+=fail. (별도 LLM 검수 없이 risk_flags 기반)
  const verdictOf = (v) => { const n = riskFlagCount(v); return n === 0 ? 'pass' : (n <= 2 ? 'hold' : 'fail'); };
  // 추천 = risk_flags 가 가장 적은 후보(동률이면 첫 번째) = pass 우선.
  const recommended = [...list].sort((a, b) => riskFlagCount(a) - riskFlagCount(b))[0] || list[0];
  const verdictCounts = { pass: 0, hold: 0, fail: 0 };
  list.forEach((v) => { verdictCounts[verdictOf(v)] += 1; });

  return {
    variants: list,
    recommendedVariant: recommended,
    metadata: {
      mode: 'per_variant_loop',
      requested_variant_count: targetVariantCount,
      selection_stage: 'user_pending',
      all_variants_preserved: true,
      variant_count: list.length,
      pillar_candidates: Array.isArray(pillarCandidates) ? pillarCandidates : [],
      recommended_variant_id: recommended?.variant_id,
      // Legacy key kept so older admin surfaces can still highlight the recommended candidate.
      selected_variant_id: recommended?.variant_id,
      recommendation_reason: '후보 중 검증 플래그(risk_flags)가 가장 적어 먼저 검토하기 좋음. 최종 선택은 사용자가 한다.',
      variants: list.map((v) => ({
        variant_id: v.variant_id,
        title: v.title,
        angle: v.angle,
        differentiation_note: v.differentiation_note,
        content_pillar: v.content_pillar,
        pillar_candidate_rank: v.pillar_candidate_rank,
        content_treatment: v.content_treatment,
        engagement_intent: v.engagement_intent,
        hook_pattern: v.hook_pattern,
        ending_type: v.ending_type,
        fomo_mechanism: v.fomo_mechanism,
        fomo_intensity: v.fomo_intensity,
        fomo_expression: v.fomo_expression,
        format_decision: v.format_decision,
        format_type: v.format_type,
        recommended_length: v.recommended_length,
        explanation_style: v.explanation_style,
        risk_flags: v.risk_flags,
        verdict: verdictOf(v),
        preview: (Array.isArray(v.posts) ? v.posts : []).map((p) => p.body).join('\n\n').slice(0, 600),
      })),
      quality_review: {
        total_candidates: list.length,
        pass_count: verdictCounts.pass,
        hold_count: verdictCounts.hold,
        fail_count: verdictCounts.fail,
      },
      variant_notes: list
        .filter((v) => v.variant_id !== recommended?.variant_id)
        .map((v) => ({
          variant_id: v.variant_id,
          note: '추천 후보와 비교해 검증 플래그 또는 자연스러움이 다름. 삭제하지 않고 보존.',
        })),
    },
  };
}

function sanitizePosts(postsArr) {
  return (Array.isArray(postsArr) ? postsArr : []).slice(0, 8).map((p, i) => ({
    index: typeof p.index === 'number' ? p.index : i + 1,
    body: typeof p.body === 'string' ? p.body.slice(0, 1000) : '',
    char_count: typeof p.body === 'string' ? p.body.length : 0,
  })).filter((p) => p.body);
}

function buildVariantTitle(variant) {
  const label = `후보 ${variant.variant_id}`;
  const title = typeof variant.title === 'string' && variant.title.trim()
    ? variant.title.trim()
    : label;
  return title.startsWith(label) ? title.slice(0, 120) : `${label} · ${title}`.slice(0, 120);
}

function buildRiskFlags(variant, generationDecision, posts) {
  const riskFlags = Array.isArray(variant.risk_flags) ? variant.risk_flags.filter((x) => typeof x === 'string') : [];
  if (generationDecision.research_sufficiency !== 'enough' && !riskFlags.includes('리서치 부족')) {
    riskFlags.push('리서치 부족');
  }
  if (variant.format_type === 'single_post' && posts[0]?.body?.length < 500 && !riskFlags.includes('single_post 500자 미만')) {
    riskFlags.push('single_post 500자 미만');
  }
  const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
  if (totalChars < minimumTotalCharsForVariant(variant) && !riskFlags.includes('총 본문 정보량 부족')) {
    riskFlags.push('총 본문 정보량 부족');
  }
  if (posts.length > 1 && posts.some((p, idx) => isThinContinuationPost({ post: p, postIdx: idx, posts, variant })) && !riskFlags.includes('후속 포스트 정보 밀도 부족')) {
    riskFlags.push('후속 포스트 정보 밀도 부족');
  }
  if (looksGenericAiFiller(posts) && !riskFlags.includes('AI식 일반론')) {
    riskFlags.push('AI식 일반론');
  }
  return riskFlags;
}

function normalizeDensityCheck(input) {
  const obj = input && typeof input === 'object' ? input : {};
  const examples = Array.isArray(obj.practical_examples)
    ? obj.practical_examples.map((ex) => {
        if (typeof ex === 'string') {
          return { action: ex, evidence: '', confidence: 'low' };
        }
        if (!ex || typeof ex !== 'object') {
          return { action: '', evidence: '', confidence: 'low' };
        }
        return {
          action: typeof ex.action === 'string' ? ex.action : '',
          evidence: typeof ex.evidence === 'string' ? ex.evidence : '',
          confidence: ['high', 'medium', 'low'].includes(ex.confidence) ? ex.confidence : 'low',
        };
      }).filter((ex) => ex.action)
    : [];

  return {
    source_signal: typeof obj.source_signal === 'string' ? obj.source_signal : '',
    old_friction: typeof obj.old_friction === 'string' ? obj.old_friction : '',
    new_change: typeof obj.new_change === 'string' ? obj.new_change : '',
    giveneeds_angle: typeof obj.giveneeds_angle === 'string' ? obj.giveneeds_angle : '',
    misconception_to_break: typeof obj.misconception_to_break === 'string' ? obj.misconception_to_break : '',
    practical_examples: examples,
    research_sufficiency: ['enough', 'thin', 'missing'].includes(obj.research_sufficiency) ? obj.research_sufficiency : 'thin',
    missing_info: Array.isArray(obj.missing_info) ? obj.missing_info.filter((x) => typeof x === 'string') : [],
  };
}

function buildGenerationDecision(parsed, densityCheck) {
  const requiredFields = ['source_signal', 'old_friction', 'new_change', 'giveneeds_angle'];
  const missingRequired = requiredFields.filter((key) => !densityCheck[key]);
  const groundedExamples = densityCheck.practical_examples.filter((ex) => ex.action && ex.evidence);
  let researchSufficiency = densityCheck.research_sufficiency;
  const contentPillar = typeof parsed.content_pillar === 'string' ? parsed.content_pillar : null;
  const contentTreatment = typeof parsed.content_treatment === 'string' ? parsed.content_treatment : null;
  const commentaryCanBeThin = ['news_commentary', 'opinion'].includes(contentTreatment)
    && densityCheck.source_signal
    && densityCheck.giveneeds_angle;

  if (missingRequired.length > 0 || (!commentaryCanBeThin && groundedExamples.length < 3)) {
    researchSufficiency = researchSufficiency === 'missing' ? 'missing' : 'thin';
  }

  return {
    content_pillar: contentPillar,
    pillar_candidate_rank: Number.isFinite(Number(parsed.pillar_candidate_rank)) ? Number(parsed.pillar_candidate_rank) : null,
    content_treatment: contentTreatment,
    fomo_mechanism: typeof parsed.fomo_mechanism === 'string' ? parsed.fomo_mechanism : 'none',
    fomo_intensity: typeof parsed.fomo_intensity === 'string' ? parsed.fomo_intensity : 'none',
    fomo_expression: typeof parsed.fomo_expression === 'string' ? parsed.fomo_expression : 'none',
    format_type: typeof parsed.format_type === 'string' ? parsed.format_type : null,
    recommended_length: Number.isFinite(Number(parsed.recommended_length)) ? Number(parsed.recommended_length) : null,
    explanation_style: typeof parsed.explanation_style === 'string' ? parsed.explanation_style : null,
    format_decision: normalizeFormatDecision(parsed.format_decision),
    engagement_intent: typeof parsed.engagement_intent === 'string' ? parsed.engagement_intent : null,
    content_goal: typeof parsed.content_goal === 'string' ? parsed.content_goal : null,
    ending_type: typeof parsed.ending_type === 'string' ? parsed.ending_type : null,
    why_this_ending: typeof parsed.why_this_ending === 'string' ? parsed.why_this_ending : '',
    research_sufficiency: researchSufficiency,
    grounded_example_count: groundedExamples.length,
    missing_required_fields: missingRequired,
  };
}

function chooseFallbackFormat({ formatTypeHint, generationDecision }) {
  if (VALID_FORMATS.has(formatTypeHint)) return formatTypeHint;
  if (['news_commentary', 'opinion'].includes(generationDecision.content_treatment)) return 'single_post';
  if (generationDecision.content_goal === 'save' && generationDecision.grounded_example_count >= 2) return 'short_thread';
  return 'single_post';
}

function normalizeVariantCount(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return 7;
  return Math.max(1, Math.min(7, Math.round(n)));
}

function normalizePillarCandidate(input) {
  if (!input || typeof input !== 'object') return null;
  const score = Number(input.fit_score);
  return {
    content_pillar: typeof input.content_pillar === 'string' ? input.content_pillar : null,
    fit_score: Number.isFinite(score) ? Math.max(1, Math.min(5, score)) : 3,
    why_this_pillar: typeof input.why_this_pillar === 'string' ? input.why_this_pillar : '',
    risk_if_forced: typeof input.risk_if_forced === 'string' ? input.risk_if_forced : '',
  };
}

function normalizeVariant(input, idx) {
  if (!input || typeof input !== 'object') return null;
  const posts = Array.isArray(input.posts)
    ? input.posts.map((p, i) => ({
        index: typeof p.index === 'number' ? p.index : i + 1,
        body: typeof p.body === 'string' ? p.body.slice(0, 1000) : '',
      })).filter((p) => p.body)
    : [];
  if (posts.length === 0) return null;
  const { scores: _ignoredScores, score_reason: _ignoredScoreReason, ...rest } = input;
  const formatType = typeof input.format_type === 'string' ? input.format_type : null;
  const riskFlags = Array.isArray(input.risk_flags) ? input.risk_flags.filter((x) => typeof x === 'string') : [];
  const pushFlag = (flag) => { if (!riskFlags.includes(flag)) riskFlags.push(flag); };
  if (formatType === 'single_post' && (posts[0]?.body || '').length < 500) {
    pushFlag('single_post 500자 미만');
  }
  const totalChars = posts.reduce((sum, p) => sum + (p.body?.length || 0), 0);
  const tempVariant = { ...input, format_type: formatType, content_treatment: input.content_treatment };
  const minTotalChars = minimumTotalCharsForVariant(tempVariant);
  if (totalChars < minTotalChars) {
    pushFlag('총 본문 정보량 부족');
  }
  if (posts.length > 1 && posts.some((p, postIdx) => isThinContinuationPost({ post: p, postIdx, posts, variant: tempVariant }))) {
    pushFlag('후속 포스트 정보 밀도 부족');
  }
  if (looksGenericAiFiller(posts)) {
    pushFlag('AI식 일반론');
  }

  return {
    ...rest,
    variant_id: Number.isFinite(Number(input.variant_id)) ? Number(input.variant_id) : idx + 1,
    title: typeof input.title === 'string' ? input.title.slice(0, 120) : `후보 ${idx + 1}`,
    angle: typeof input.angle === 'string' ? input.angle : '',
    differentiation_note: typeof input.differentiation_note === 'string' ? input.differentiation_note : '',
    content_pillar: typeof input.content_pillar === 'string' ? input.content_pillar : null,
    pillar_candidate_rank: Number.isFinite(Number(input.pillar_candidate_rank)) ? Number(input.pillar_candidate_rank) : null,
    content_treatment: typeof input.content_treatment === 'string' ? input.content_treatment : null,
    fomo_mechanism: typeof input.fomo_mechanism === 'string' ? input.fomo_mechanism : 'none',
    fomo_intensity: typeof input.fomo_intensity === 'string' ? input.fomo_intensity : 'none',
    fomo_expression: typeof input.fomo_expression === 'string' ? input.fomo_expression : 'none',
    format_decision: normalizeFormatDecision(input.format_decision),
    format_type: formatType,
    recommended_length: Number.isFinite(Number(input.recommended_length)) ? Number(input.recommended_length) : posts.length,
    explanation_style: typeof input.explanation_style === 'string' ? input.explanation_style : null,
    hook_pattern: typeof input.hook_pattern === 'string' ? input.hook_pattern : null,
    tone_pattern: typeof input.tone_pattern === 'string' ? input.tone_pattern : null,
    engagement_intent: typeof input.engagement_intent === 'string' ? input.engagement_intent : null,
    content_goal: typeof input.content_goal === 'string' ? input.content_goal : null,
    ending_type: typeof input.ending_type === 'string' ? input.ending_type : null,
    posts,
    risk_flags: riskFlags,
  };
}

function requiresLongThread(variant) {
  const formatType = variant?.format_type;
  if (!['short_thread', 'resource_thread', 'mega_thread'].includes(formatType)) return false;
  return ['explainer', 'practical_tip', 'checklist', 'case_note', 'news_commentary'].includes(variant?.content_treatment);
}

function minimumTotalCharsForVariant(variant) {
  if (variant?.format_type === 'single_post') return 250;
  if (requiresLongThread(variant)) return 1100;
  return 800;
}

function minimumPostCharsForVariant(variant) {
  if (requiresLongThread(variant)) return 320;
  return 220;
}

function minimumHookCharsForThread() {
  return 80;
}

function isThinContinuationPost({ post, postIdx, posts, variant }) {
  if (!post || postIdx >= posts.length - 1) return false;
  const length = post.body?.length || 0;
  if (postIdx === 0 && posts.length > 1) {
    return length < minimumHookCharsForThread();
  }
  return length < minimumPostCharsForVariant(variant);
}

function looksGenericAiFiller(posts) {
  const text = (Array.isArray(posts) ? posts : [])
    .map((post) => post?.body || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return true;
  const totalChars = text.length;
  const genericHits = [
    /AI의 다양한 역할/,
    /어떻게 활용하고 계신가요/,
    /효율성을 높일 수 있습니다/,
    /지식을 쉽게 배울 수 있습니다/,
    /아이디어를 내고 초안을 작성/,
    /복잡한 작업을 자동화/,
    /마케팅 팀의 효율성/,
    /경험을 공유해보세요/,
  ].filter((pattern) => pattern.test(text)).length;
  const hasSpecificSignal = /[0-9]{2,}|CMTS|에피어|네이버|메타|구글|Threads|Reddit|X|플레이스|예약|리뷰|광고비|검색|캠페인|사례|고객/.test(text);
  return genericHits >= 2 || (totalChars < 450 && genericHits >= 1) || (totalChars < 650 && !hasSpecificSignal);
}

function normalizeFormatDecision(input) {
  const obj = input && typeof input === 'object' ? input : {};
  return {
    post_count_reason: typeof obj.post_count_reason === 'string' ? obj.post_count_reason : '',
    split_roles: Array.isArray(obj.split_roles) ? obj.split_roles.filter((x) => typeof x === 'string').slice(0, 8) : [],
    why_not_shorter: typeof obj.why_not_shorter === 'string' ? obj.why_not_shorter : '',
    why_not_longer: typeof obj.why_not_longer === 'string' ? obj.why_not_longer : '',
  };
}
