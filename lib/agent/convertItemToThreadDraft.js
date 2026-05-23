// 검토함의 agent_items 1건을 Threads 드래프트(thread_drafts) 로 변환.
// brief + research_context + 채널/주제 거버넌스 KB를 모두 LLM 에 컨텍스트로 주고,
// 겹치지 않는 7개 방향을 만들고, 자동 채점 후 1개 최종안을 저장.
//
// 매거진 본문 생성기와 별개. 스레드는 짧고 채널 톤이 강해서 독립 로직.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';
import { buildKnowledgeContext } from '@/lib/knowledge/loader';

const PROMPT_VERSION = 'thread_v3_7variants_2026_05_23';

/**
 * @param {{ itemId: string, formatTypeHint?: string, extraContext?: string|null }} args
 * @returns {Promise<{ draftId: string, postCount: number, model: string }>}
 */
export async function convertItemToThreadDraft({ itemId, formatTypeHint, extraContext }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

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
  const originalText = translation.translated_text || item.normalized?.extracted_text || '';

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

  // 스레드 드래프트는 인기글 감사까지 포함해 후킹 패턴 학습을 강화 (enrich 보다 자료 다양).
  const knowledgeBlock = buildKnowledgeContext({
    topicCluster: theme?.target_topic_cluster || brief.suggested_topic_cluster,
    persona: theme?.target_persona || brief.suggested_persona,
    channel: 'threads',
    includeAudit: true,
  });

  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 Threads 콘텐츠 작가다.
주 타겟은 요식업 사장님·병의원 원장. 광고티가 강하면 안 되지만, 사장님이 자기 가게/병원에 적용해볼 수 있는 실용적 조언이 보여야 한다.

규칙:
- 각 포스트는 500자 이내. 한글 줄바꿈 활용.
- 첫 포스트는 강한 hook(부정형 자기진단/조건+약속/숫자/통념 거스르기/희소성 등). 첫 줄은 30자 이내.
- 전문 용어보다 현장어를 우선한다. 현장어는 돈/시간/화면/행동/감정 중 2개 이상이 보이는 문장이다.
- 예: "전환율이 낮다"보다 "광고비는 나가는데 전화가 안 온다", "퍼널이 끊긴다"보다 "플레이스는 보는데 예약 버튼까지 안 간다"처럼 쓴다.
- 원문/브리프의 전문 용어는 생활어로 바꾼다. 퍼널=손님이 빠져나가는 지점, ROAS=광고비 쓴 만큼 돌아오는지, 최적화=보고 넘기지 않게 고치는 것.
- reader_problem은 보고서 문장이 아니라 현장에서 나오는 고민 문장으로 본문에 녹인다. 단, 과한 반말/유행어/비하 표현은 쓰지 않는다.
- 거버넌스에서 "사용하지 않는 표현" 으로 분류된 어휘는 절대 쓰지 않는다.
- 의료광고 영역이면 효과 보장 표현 금지, 진료 권유성 어휘 금지.
- 먼저 content_pillar 와 content_goal 을 정한 뒤 글을 쓴다.
- content_pillar 는 방향판이다. 하네스의 주제 예시를 그대로 복사하지 말고, 원문/최신 audit/리서치에서 새 주제를 가져와 가장 맞는 기둥에 배치한다.
- content_pillar 와 content_treatment 를 분리한다. 기둥은 글의 역할, treatment 는 푸는 문법이다.
- 주제는 플레이스에 앵커링하지 않는다. 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 스레드/숏폼, 블로그, 상세페이지, 요즘 되는 방식 관찰까지 열어둔다.
- 뉴스성 소재는 어느 기둥에서도 news_commentary 로 처리할 수 있다. 모든 소재를 체크리스트나 실행 가이드로 바꾸지 않는다.
- 한 번에 서로 겹치지 않는 7개 후보를 만든 뒤 채점하고, 가장 자연스러운 1개를 고른다.
- 7개 후보는 content_treatment, hook, 문장 리듬, 결론 방식이 서로 달라야 한다. 같은 말을 형식만 바꿔 반복하면 실패다.
- 후보끼리 첫 문장, 핵심 비유, CTA, 번호 구조를 재사용하지 않는다.
- 밀도 있는 글을 위해 source_signal, old_friction, new_change, giveneeds_angle, misconception_to_break, practical_examples 를 먼저 정리한 뒤 본문을 쓴다.
- practical_examples 는 "무엇을/어느 화면이나 도구에서/왜 하는지"가 보여야 한다. 근거 없는 "AI로 분석하세요", "콘텐츠를 만드세요" 류는 예시로 인정하지 않는다.
- practical_examples 는 practical_tip/checklist/resource_thread 에서 중요하다. news_commentary/opinion 에서는 0~1개여도 괜찮고, 대신 source_signal 과 giveneeds_angle 이 선명해야 한다.
- 원문·리서치에 없는 도구 기능, 효과, 성과를 만들지 않는다. 확인되지 않은 예시는 missing_info 에 넣고 본문에서는 낮춰 쓴다.
- 리소스가 부족하면 억지로 아는 척하지 말고 research_sufficiency='thin' 또는 'missing' 으로 두고 risk_flags 에 "리서치 부족"을 남긴다.
- format_type 은 자동으로 고른다. single_post 는 관찰/공감/짧은 오해 깨기, short_thread 는 실제 단계가 나뉠 때, resource_thread 는 도구·템플릿·예시 모음일 때만 쓴다.
- 1,2,3 식 번호 매기기는 기본값이 아니다. 단계·체크리스트·리소스 목록이 명확할 때만 쓴다.
- 리서치가 얇거나 한 문장 관점이 강한 소재는 어느 기둥이든 single_post 를 우선하고, 짧은 문장과 줄바꿈으로 끝낼 수 있다.
- CTA는 기본값이 아니다. 본문과 이어지지 않으면 ending_type='none' 으로 닫는다.
- 상담형 CTA는 diagnostic_comment 또는 soft_dm 목적일 때만 쓴다. "업종/지역 남겨주세요" 반복 문구는 피한다.
- 본문에 광고/기브니즈 자기소개는 안 한다. CTA가 필요할 때도 가볍게만 둔다.

${knowledgeBlock ? `[참조 지식·거버넌스]\n${knowledgeBlock}\n\n` : ''}출력 형식: JSON 만. 형식:
{
  "density_check": {
    "source_signal": "수집/원문에서 발견한 핵심 신호",
    "old_friction": "이전에는 무엇이 귀찮거나 어려웠는가",
    "new_change": "이번에 무엇이 달라졌는가",
    "giveneeds_angle": "기브니즈 관점으로 번역한 한 줄",
    "misconception_to_break": "깨고 싶은 흔한 오해",
    "practical_examples": [
      { "action": "오늘 해볼 수 있는 구체 행동", "evidence": "어떤 원문/리서치 신호에서 나온 예시인지", "confidence": "high | medium | low" }
    ],
    "research_sufficiency": "enough | thin | missing",
    "missing_info": ["부족한 정보"]
  },
  "variants": [
    {
      "variant_id": 1,
      "title": "내부 식별용 짧은 라벨 (40자 이내)",
      "angle": "이 후보만의 다른 해석 방향",
      "differentiation_note": "다른 6개와 겹치지 않는 지점",
      "content_pillar": "cost_before_spend | do_today | current_observation | trend_plain | content_showcase",
      "content_treatment": "news_commentary | practical_tip | checklist | explainer | case_note | opinion",
      "content_goal": "save | comment | share | viewpoint | dm",
      "ending_type": "none | save | question | soft_dm | diagnostic_comment",
      "why_this_ending": "본문 흐름과 마무리 방식이 맞는 이유",
      "format_type": "single_post | short_thread | resource_thread",
      "hook_pattern": "curiosity_gap | pain_confession | resource_promise | misconception_break | proof_story | question | anxiety_reframe",
      "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning",
      "engagement_drivers": ["save_value" | "share_value" | "identity" | "curiosity" | "free_resource" | "proof" | "anxiety_relief"],
      "posts": [
        { "index": 1, "body": "..." }
      ],
      "cta": "CTA가 있을 때만 작성. 없으면 빈 문자열",
      "hashtags": ["#사장님마케팅"],
      "risk_flags": ["과장 위험" 등 주의점, 없으면 빈 배열],
      "scores": {
        "topic_fit": 1,
        "audience_empathy": 1,
        "naturalness": 1,
        "non_overlap": 1,
        "format_fit": 1,
        "usefulness_or_viewpoint": 1,
        "brand_safety": 1,
        "overall": 1
      },
      "score_reason": "왜 이 점수인지 한 문장"
    }
  ],
  "selected_variant_id": 1,
  "selection_reason": "7개 중 이 후보를 고른 이유",
  "rejected_variant_notes": [
    { "variant_id": 2, "reason": "탈락 이유" }
  ]
}`;

  const user = `원문 제목: ${originalTitle}
원문 발췌:
${originalText.slice(0, 1500)}

[브리프]
페르소나: ${brief.suggested_persona || 'general'}
토픽: ${brief.suggested_topic_cluster || '(미지정)'}
추천 제목: ${brief.recommended_title || '(없음)'}
독자 문제: ${brief.reader_problem || '(없음)'}
왜 지금: ${brief.why_now || '(없음)'}
핵심 앵글: ${brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '') || '(없음)'}
실용 takeaway: ${brief.practical_takeaway || '(없음)'}
실행 단계: ${(Array.isArray(brief.execution_steps) ? brief.execution_steps.join(' / ') : '(없음)')}
적합도: ${typeof brief.fit_score === 'number' ? Math.round(brief.fit_score * 100) + '%' : '?'}

${rc?.pain_points?.length ? `[리서치에서 관찰된 현재 사장님 페인포인트]\n${rc.pain_points.join(' / ')}\n` : ''}${rc?.viral_hooks?.length ? `[자주 쓰이는 후킹]\n${rc.viral_hooks.map((h) => `${h?.pattern}${h?.example ? ' (예: ' + h.example + ')' : ''}`).join('\n')}\n` : ''}
${extraContext ? `${extraContext}\n` : ''}
원문 출처: ${item.post_url}

요청:
- 위 브리프와 리서치를 반영해 format_type 을 직접 고른다. ${formatTypeHint ? `힌트는 ${formatTypeHint} 이지만, 소재에 맞지 않으면 바꿔도 된다.` : '힌트가 없으면 single_post/short_thread/resource_thread 중 가장 자연스러운 형식을 고른다.'}
- 먼저 서로 겹치지 않는 7개 후보를 만든다. 7개 후보는 관점, treatment, 길이, hook, 결론 방식이 달라야 한다.
- 각 후보를 1~5점으로 채점한다. overall 은 평균이 아니라 "실제로 발행해도 어색하지 않은가"를 최우선으로 판단한다.
- 최종 selected_variant_id 는 overall 이 높고, 자영업자 입장에서 억지스럽지 않으며, 원문과 기둥/처리방식이 잘 맞는 1개만 고른다.
- 광고티 X, 실무 적용 가능한 인사이트 중심.
- 전문 용어가 나오면 돈/시간/화면/행동/감정이 보이는 말로 치환한다.
- 첫 2줄에는 타깃이 겪는 실제 상황이나 말투가 보여야 한다.
- content_pillar 를 먼저 고른다. 플레이스에만 고정하지 말고 메타 광고, AI 활용, 소재 제작, 콘텐츠 기준, 요즘 되는 방식 관찰도 선택지로 둔다.
- content_treatment 도 함께 고른다. 뉴스성/시사성 소재는 어느 기둥이든 news_commentary 로 풀 수 있다.
- 뉴스성/시사성 소재는 "무슨 일이 있었나 → 왜 사람들이 반응했나 → 지금 장사/마케팅이 얼마나 민감한 시대인가" 정도로 끝내도 된다.
- 하네스의 주제 예시는 템플릿이 아니라 씨앗이다. 그대로 반복하지 말고 이번 입력에서 새 주제를 만든다.
- 본문 작성 전에 density_check 를 채운다. practical_tip/checklist/resource_thread 는 practical_examples 가 중요하지만, news_commentary/opinion 은 source_signal/giveneeds_angle 이 선명하면 짧게 써도 된다.
- practical_examples 는 action/evidence/confidence 를 가진 객체 배열로 작성한다. evidence 가 비어 있으면 그 예시는 부족한 예시다.
- research_sufficiency 가 thin/missing 이면 단정적인 글 대신 관찰형/질문형으로 낮추고 risk_flags 에 "리서치 부족"을 포함한다.
- 1,2,3 식 포스트 분리는 실행 단계나 목록 가치가 있을 때만 쓴다. 뉴스 코멘터리나 한 문장 관점은 single_post 1개로 끝내도 된다.
- CTA는 content_goal 과 ending_type 에 맞을 때만 쓴다. 저장형/코멘터리형 글에는 상담 CTA를 붙이지 않는다.
- 7개 후보가 서로 비슷해지면 실패다. 같은 결론을 다른 말로 반복하지 말고, 아예 다른 콘텐츠 처리 방식을 섞는다.
- 출력은 JSON 만.`;

  const model = process.env.OPENAI_THREAD_MODEL || 'gpt-4o-mini';
  let parsed = null;
  let cost = null;
  try {
    const { content, raw } = await callOpenAI({
      stage: 'thread_draft',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.5 },
    });
    parsed = JSON.parse(content);
    if (raw?.usage) {
      const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 }, 'gpt-4o': { in: 2.5, out: 10 } };
      const p = PRICE[model];
      if (p) cost = ((raw.usage.prompt_tokens || 0) * p.in + (raw.usage.completion_tokens || 0) * p.out) / 1_000_000;
    }
  } catch (e) {
    throw new Error('LLM 생성 실패: ' + e.message);
  }

  const variantReview = normalizeVariantReview(parsed);
  const selectedVariant = variantReview.selectedVariant || parsed;

  // sanitize posts.
  const postsArr = Array.isArray(selectedVariant.posts) ? selectedVariant.posts : [];
  const posts = postsArr.slice(0, 8).map((p, i) => ({
    index: typeof p.index === 'number' ? p.index : i + 1,
    body: typeof p.body === 'string' ? p.body.slice(0, 600) : '',
    char_count: typeof p.body === 'string' ? p.body.length : 0,
  })).filter((p) => p.body);

  if (posts.length === 0) {
    throw new Error('LLM 응답에 유효한 포스트가 없습니다.');
  }

  const densityCheck = normalizeDensityCheck(parsed.density_check);
  const generationDecision = buildGenerationDecision(selectedVariant, densityCheck);
  const riskFlags = Array.isArray(selectedVariant.risk_flags) ? selectedVariant.risk_flags.filter((x) => typeof x === 'string') : [];
  if (generationDecision.research_sufficiency !== 'enough' && !riskFlags.includes('리서치 부족')) {
    riskFlags.push('리서치 부족');
  }

  const resolvedFormat = VALID_FORMATS.has(selectedVariant.format_type)
    ? selectedVariant.format_type
    : chooseFallbackFormat({ formatTypeHint, generationDecision });

  const insertRow = {
    agent_item_id: item.id,
    theme_id: item.theme_id || null,
    channel: 'threads',
    format_type: resolvedFormat,
    hook_pattern: typeof selectedVariant.hook_pattern === 'string' ? selectedVariant.hook_pattern : null,
    tone_pattern: typeof selectedVariant.tone_pattern === 'string' ? selectedVariant.tone_pattern : null,
    engagement_drivers: Array.isArray(selectedVariant.engagement_drivers) ? selectedVariant.engagement_drivers.filter((x) => typeof x === 'string') : [],
    title: typeof selectedVariant.title === 'string' ? selectedVariant.title.slice(0, 120) : null,
    posts,
    cta: typeof selectedVariant.cta === 'string' ? selectedVariant.cta : null,
    hashtags: Array.isArray(selectedVariant.hashtags) ? selectedVariant.hashtags.filter((x) => typeof x === 'string').slice(0, 10) : [],
    risk_flags: riskFlags,
    research_context_used: {
      generation_density_check: densityCheck,
      generation_decision: generationDecision,
      variant_review: variantReview.metadata,
    },
    status: 'draft',
    generator_model: model,
    generator_cost_usd: cost,
    generator_prompt_version: PROMPT_VERSION,
  };

  const { data: draft, error: insErr } = await supabaseAdmin
    .from('thread_drafts')
    .insert(insertRow)
    .select('id')
    .single();
  if (insErr) throw new Error('드래프트 저장 실패: ' + insErr.message);

  return {
    draftId: draft.id,
    postCount: posts.length,
    model,
    densityCheck,
    generationDecision,
    variantReview: variantReview.metadata,
    riskFlags,
  };
}

const VALID_FORMATS = new Set(['single_post', 'short_thread', 'resource_thread', 'mega_thread']);

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
    content_treatment: contentTreatment,
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

function normalizeVariantReview(parsed) {
  const variants = Array.isArray(parsed?.variants)
    ? parsed.variants.map(normalizeVariant).filter(Boolean).slice(0, 7)
    : [];

  if (variants.length === 0) {
    return {
      selectedVariant: null,
      metadata: {
        mode: 'single_generation_fallback',
        variant_count: 0,
        selection_reason: 'LLM이 variants 배열을 반환하지 않아 단일 초안을 사용함.',
      },
    };
  }

  const requestedId = Number(parsed.selected_variant_id);
  const selected = variants.find((v) => v.variant_id === requestedId)
    || [...variants].sort((a, b) => (b.scores.overall || 0) - (a.scores.overall || 0))[0];

  return {
    selectedVariant: selected,
    metadata: {
      mode: 'seven_variant_selection',
      variant_count: variants.length,
      selected_variant_id: selected.variant_id,
      selection_reason: typeof parsed.selection_reason === 'string' ? parsed.selection_reason : selected.score_reason,
      selected_scores: selected.scores,
      variants: variants.map((v) => ({
        variant_id: v.variant_id,
        title: v.title,
        angle: v.angle,
        differentiation_note: v.differentiation_note,
        content_pillar: v.content_pillar,
        content_treatment: v.content_treatment,
        format_type: v.format_type,
        scores: v.scores,
        score_reason: v.score_reason,
        preview: v.posts.map((p) => p.body).join('\n\n').slice(0, 600),
      })),
      rejected_variant_notes: Array.isArray(parsed.rejected_variant_notes)
        ? parsed.rejected_variant_notes.slice(0, 6)
        : variants.filter((v) => v.variant_id !== selected.variant_id).map((v) => ({
            variant_id: v.variant_id,
            reason: '선택 후보보다 점수 또는 자연스러움이 낮음',
          })),
    },
  };
}

function normalizeVariant(input, idx) {
  if (!input || typeof input !== 'object') return null;
  const posts = Array.isArray(input.posts)
    ? input.posts.map((p, i) => ({
        index: typeof p.index === 'number' ? p.index : i + 1,
        body: typeof p.body === 'string' ? p.body.slice(0, 600) : '',
      })).filter((p) => p.body)
    : [];
  if (posts.length === 0) return null;

  return {
    ...input,
    variant_id: Number.isFinite(Number(input.variant_id)) ? Number(input.variant_id) : idx + 1,
    title: typeof input.title === 'string' ? input.title.slice(0, 120) : `후보 ${idx + 1}`,
    angle: typeof input.angle === 'string' ? input.angle : '',
    differentiation_note: typeof input.differentiation_note === 'string' ? input.differentiation_note : '',
    content_pillar: typeof input.content_pillar === 'string' ? input.content_pillar : null,
    content_treatment: typeof input.content_treatment === 'string' ? input.content_treatment : null,
    format_type: typeof input.format_type === 'string' ? input.format_type : null,
    posts,
    scores: normalizeVariantScores(input.scores),
    score_reason: typeof input.score_reason === 'string' ? input.score_reason : '',
  };
}

function normalizeVariantScores(scores) {
  const s = scores && typeof scores === 'object' ? scores : {};
  const keys = [
    'topic_fit',
    'audience_empathy',
    'naturalness',
    'non_overlap',
    'format_fit',
    'usefulness_or_viewpoint',
    'brand_safety',
    'overall',
  ];
  const out = {};
  for (const key of keys) {
    const n = Number(s[key]);
    out[key] = Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 3;
  }
  return out;
}
