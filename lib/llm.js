// LLM 클라이언트 — 현재는 OpenAI gpt-4o-mini 단일 경로.
// 모든 호출은 agent_ai_logs 에 자동 기록(서버 사이드 service_role 사용).

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { VALID_PERSONAS, CLUSTERS_BY_PERSONA } from '@/lib/contentTaxonomy';

const OPENAI_BASE = 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// gpt-4o-mini 가격 (USD per 1M tokens, 2025-09 기준).
const PRICE = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

function getKey() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY 미설정');
  return k;
}

function estimateCost(model, inTokens, outTokens) {
  const p = PRICE[model];
  if (!p) return null;
  return (inTokens * p.input + outTokens * p.output) / 1_000_000;
}

// 한국어 비중이 30% 이상이면 번역 skip 으로 판단.
function isLikelyKorean(text) {
  if (!text) return false;
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  return koreanChars / text.length > 0.3;
}

/**
 * OpenAI Chat Completions 호출 + agent_ai_logs 기록.
 * @param {object} args
 * @param {string} args.stage - 'translate' | 'summarize' | 'classify' | ...
 * @param {string} args.itemId - agent_items.id (옵션, 매핑용)
 * @param {string} args.jobId - agent_jobs.id (옵션)
 * @param {Array} args.messages - [{role, content}, ...]
 * @param {string} args.model - 기본 gpt-4o-mini
 * @param {object} args.params - OpenAI params (temperature 등)
 * @returns {Promise<{content, raw, logId}>}
 */
export async function callOpenAI({ stage, itemId, jobId, messages, model = DEFAULT_MODEL, params = {} }) {
  const startedAt = Date.now();
  const promptText = messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n');

  let response = null;
  let content = '';
  let inTokens = null;
  let outTokens = null;
  let error = null;

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getKey()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        ...params,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || `OpenAI ${res.status}`);
    }
    response = json;
    content = json.choices?.[0]?.message?.content || '';
    inTokens = json.usage?.prompt_tokens ?? null;
    outTokens = json.usage?.completion_tokens ?? null;
  } catch (e) {
    error = e.message;
  }

  const latencyMs = Date.now() - startedAt;
  const costUsd = inTokens != null && outTokens != null ? estimateCost(model, inTokens, outTokens) : null;

  let logId = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('agent_ai_logs')
      .insert({
        item_id: itemId || null,
        job_id: jobId || null,
        stage,
        model,
        prompt: promptText,
        response: content || null,
        input_tokens: inTokens,
        output_tokens: outTokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
        error,
      })
      .select('id')
      .maybeSingle();
    logId = data?.id || null;
  }

  if (error) throw new Error(error);
  return { content, raw: response, logId };
}

/**
 * 수집 시점 enrich — 한국어 요약(+필요시 번역) 한 번에.
 * 영어 콘텐츠면 translation 도 채워줌. 한국어 콘텐츠면 summary 만.
 * 한 번의 LLM 호출로 끝.
 *
 * @returns {Promise<{summary, translation}>}
 *   summary: {one_line_summary, key_points, why_it_matters}
 *   translation: {translated_title, translated_text, translated_summary, source_lang, translated_at, model} | null
 *   brief: {target_persona, topic_cluster, fit_score, relevance_reason, content_angles[], recommended_title, lead_magnet_idea, reader_problem, why_now, practical_takeaway, lead_magnet, generated_at, model} | null
 */
export async function enrichItem({ itemId, title, text, sourceLabel, researchContext, themeHint }) {
  const sample = `${title || ''} ${text || ''}`.slice(0, 800);
  const isKo = isLikelyKorean(sample);

  // 리서치 컨텍스트가 있으면 brief 의 content_angles 가 실제 페인포인트·바이럴 후킹 구조를 반영하도록 system 메시지에 주입.
  const researchBlock = researchContext && (researchContext.pain_points?.length || researchContext.viral_hooks?.length || researchContext.recommended_angles?.length) ? `

[리서치 컨텍스트 — 이 주제에 대해 SNS·뉴스에서 관찰된 현재 패턴]
- 사장님 페인포인트: ${(researchContext.pain_points || []).join(' / ')}
- 자주 쓰이는 바이럴 후킹: ${(researchContext.viral_hooks || []).map((h) => h?.pattern).filter(Boolean).join(' / ')}
- 추천 앵글 후보: ${(researchContext.recommended_angles || []).join(' / ')}
brief 의 content_angles, recommended_title, reader_problem 작성 시 위 페인포인트·후킹을 적극 반영할 것.` : '';

  // 주제·페르소나 힌트가 있으면 해당 KB·페르소나 프로필을 함께 주입.
  let knowledgeBlock = '';
  if (themeHint?.target_topic_cluster || themeHint?.target_persona) {
    try {
      const { buildKnowledgeContext } = await import('@/lib/knowledge/loader');
      const kb = buildKnowledgeContext({
        topicCluster: themeHint.target_topic_cluster,
        persona: themeHint.target_persona,
      });
      if (kb) knowledgeBlock = `\n\n[참조 지식베이스 — 표현·금지어·페르소나 톤 기준]\n${kb}`;
    } catch {
      // KB 로드 실패는 무시 — 일반 enrich 로 계속.
    }
  }

  // 기브니즈 타겟 정의 — 페르소나·토픽 클러스터는 매거진 발행 시 그대로 재사용.
  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 콘텐츠 기획 에이전트다.${researchBlock}${knowledgeBlock}
주 타겟 고객은 "고객 유입과 브랜드 신뢰를 고민하는 마케팅 운영자"다.
대표 업종은 요식업과 병의원이지만, 뉴스성/브랜드 사례 소재는 자영업자로 단정하지 말고 브랜드 운영자·마케터·콘텐츠 담당자까지 넓게 판단한다.

콘텐츠 톤:
- 독자가 바로 자기 업체에 적용해볼 수 있게 쉽게 풀어쓴다.
- 병의원은 신뢰/전문성/상담 전환을 더 중시한다.
- 요식업은 신뢰뿐 아니라 친근함, 가벼운 실행, 재방문 설계를 함께 중시한다.
- 너무 전문가 관점의 일반론보다 "지금 내 가게/병원에 어떻게 녹일까"가 보여야 한다.
- 리드마그넷은 꼭 필요할 때만 제안한다. 무리하게 체크리스트 PDF를 만들지 않는다.

입력 콘텐츠를 다음 3가지로 정제한다:

1) 한국어 요약 (summary): {one_line_summary, key_points[], why_it_matters}
2) 영어 원문이면 한국어 번역 (translation): {translated_title, translated_text}; 이미 한국어면 null
3) 콘텐츠 기획 브리프 (brief): 이 원문을 우리 타겟 대상 매거진/뉴스레터/블로그 글로 변환할 때 쓸 정보.
   - target_persona: "restaurant_owner" | "clinic_owner" | "brand_operator" | "marketer" | "small_brand_owner" | "general_reader" | "general" | "unknown"
     · general = 요식업/병의원 모두에 의미 있음. unknown = 어느 쪽에도 안 맞음.
     · brand_operator/marketer/small_brand_owner/general_reader = 업종보다 브랜드·마케팅 운영 관점이 더 중요한 소재.
   - business_contexts: ["restaurant" | "clinic" | "local_service" | "brand" | "marketing" | "general"] 중 1~3개.
   - topic_cluster: 페르소나에 맞는 클러스터 한 개 또는 null.
     · 요식업: place_visibility | review_trust | ad_efficiency | menu_offer | local_retention
     · 병의원: place_visibility | review_trust | ad_efficiency | service_page | local_acquisition
     · general/unknown 이면 null
   - fit_score: 0.0 ~ 1.0 (우리 타겟 적합도)
   - relevance_reason: 왜 이 타겟에 적합/부적합한지 한 문장 (한국어)
   - reader_problem: 독자가 겪는 문제. 뉴스성/관찰형 소재는 억지 실행 과제가 아니라 "브랜드가 어떤 맥락으로 읽히는지 감을 잡기 어렵다"처럼 인식 문제여도 된다.
   - why_now: 왜 지금 다뤄야 하는지. AI 변화, 광고비 낭비, 플랫폼 변화, 소비자 행동 변화 중 연결.
   - signal_type: "platform_visibility" | "paid_ads" | "consultation_conversion" | "content_marketing" | "ai_marketing" | "retention" | "service_page" | "case_study" | "consumer_behavior" | "trend" | "other"
   - content_angles: 한국어 기획 앵글 2~3개. 각 35자 내외, 이 원문으로 만들 수 있는 매거진 글 방향.
   - content_angle: 가장 추천하는 핵심 앵글 1개.
   - practical_takeaway: 읽고 나서 독자가 바로 적용/점검/학습할 수 있는 것 1문장.
   - execution_steps: 독자가 해볼 수 있는 실행 단계 2~4개. 너무 거창하지 않게.
   - tone_direction: "easy_practical" | "trust_expert" | "friendly_light" | "case_based"
   - recommended_title: 우리 타겟 대상 매거진 제목 후보 1개 (한국어, 40자 내외)
   - lead_magnet: 필요할 때만 객체로 제안. 필요 없으면 null.
     · type: "guidebook" | "template" | "audit_sheet" | "calculator" | "script_pack" | "calendar" | "benchmark_table" | "case_study" | "none"
     · title: 자료 제목
     · why_this_magnet: 왜 이 자료가 독자에게 도움이 되는지
     · sections: 자료에 들어갈 구성 2~5개
     · required_inputs: 독자가 채워야 할 입력값. 없으면 []
     · conversion_goal: "self_apply" | "consultation" | "education" | "none"
   - lead_magnet_idea: lead_magnet.title 을 짧게 복사. lead_magnet 이 null 이면 null.
   - approval_reason: 텔레그램에서 사람이 승인해야 할 이유 1문장.
   - risk_flags: 과장/전문성/규제/출처불명 등 주의점 배열. 없으면 [].

출력은 JSON 만. 가치 없는 콘텐츠면 brief 의 fit_score 를 낮게 매기고 그 이유를 relevance_reason 에 적어라.
일반론도 괜찮지만, 타깃과 적용 장면이 명확해야 한다.`;

  const user = `소스: ${sourceLabel || '(미상)'}
원문 언어: ${isKo ? 'ko (한국어)' : 'en (영어 또는 기타)'}
TITLE:
${title || ''}

TEXT:
${(text || '').slice(0, 1800)}

요청:
- summary.one_line_summary: 한국어 한 문장 (40자 내외)
- summary.key_points: 한국어 불릿 2~4개 (각 30자 이내)
- summary.why_it_matters: 한국어로 우리 타겟에게 왜 가치 있는지 1문장. 가치 미상이면 null
- translation: ${isKo ? 'null (이미 한국어)' : '{translated_title, translated_text} 한국어로'}
- brief: 위 시스템 메시지 정의대로 채울 것. 업종 특화 소재가 아니면 자영업자/요식업/병의원으로 단정하지 말고 브랜드·마케팅 운영자 관점에서 작성.

JSON 형태:
{
  "summary": { "one_line_summary": "...", "key_points": ["...","..."], "why_it_matters": "..." | null },
  "translation": { "translated_title": "...", "translated_text": "..." } | null,
  "brief": {
    "target_persona": "restaurant_owner" | "clinic_owner" | "brand_operator" | "marketer" | "small_brand_owner" | "general_reader" | "general" | "unknown",
    "business_contexts": ["restaurant", "clinic"],
    "topic_cluster": "..." | null,
    "fit_score": 0.7,
    "relevance_reason": "...",
    "reader_problem": "...",
    "why_now": "...",
    "signal_type": "content_marketing",
    "content_angles": ["...","...","..."],
    "content_angle": "...",
    "practical_takeaway": "...",
    "execution_steps": ["...","...","..."],
    "tone_direction": "easy_practical",
    "recommended_title": "...",
    "lead_magnet": {
      "type": "guidebook" | "template" | "audit_sheet" | "calculator" | "script_pack" | "calendar" | "benchmark_table" | "case_study" | "none",
      "title": "...",
      "why_this_magnet": "...",
      "sections": ["...","..."],
      "required_inputs": ["..."],
      "conversion_goal": "self_apply" | "consultation" | "education" | "none"
    } | null,
    "lead_magnet_idea": "..." | null,
    "approval_reason": "...",
    "risk_flags": []
  }
}`;

  let parsed = {};
  try {
    const { content } = await callOpenAI({
      stage: 'enrich',
      itemId,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      params: { response_format: { type: 'json_object' } },
    });
    parsed = JSON.parse(content);
  } catch {
    // 파싱 실패하면 빈 결과
    parsed = {};
  }

  const summary = parsed.summary && typeof parsed.summary === 'object'
    ? {
        one_line_summary: parsed.summary.one_line_summary || null,
        key_points: Array.isArray(parsed.summary.key_points) ? parsed.summary.key_points : [],
        why_it_matters: parsed.summary.why_it_matters || null,
      }
    : null;

  // brief 정규화 — enum/숫자 범위는 입력 신뢰하지 않고 sanitize.
  const VALID_PERSONA = VALID_PERSONAS;
  const VALID_CONTEXTS = ['restaurant', 'clinic', 'local_service', 'brand', 'marketing', 'general'];
  const VALID_SIGNAL_TYPES = [
    'platform_visibility',
    'paid_ads',
    'consultation_conversion',
    'content_marketing',
    'ai_marketing',
    'retention',
    'service_page',
    'case_study',
    'consumer_behavior',
    'trend',
    'other',
  ];
  const VALID_TONES = ['easy_practical', 'trust_expert', 'friendly_light', 'case_based'];
  const VALID_LEAD_TYPES = [
    'guidebook',
    'template',
    'audit_sheet',
    'calculator',
    'script_pack',
    'calendar',
    'benchmark_table',
    'case_study',
    'none',
  ];
  const VALID_CONVERSION_GOALS = ['self_apply', 'consultation', 'education', 'none'];
  const VALID_CLUSTERS_BY_PERSONA = CLUSTERS_BY_PERSONA;
  let brief = null;
  if (parsed.brief && typeof parsed.brief === 'object') {
    const b = parsed.brief;
    const persona = VALID_PERSONA.includes(b.target_persona) ? b.target_persona : 'unknown';
    const allowedClusters = VALID_CLUSTERS_BY_PERSONA[persona] || [];
    const cluster = allowedClusters.includes(b.topic_cluster) ? b.topic_cluster : null;
    const fit = typeof b.fit_score === 'number' ? Math.max(0, Math.min(1, b.fit_score)) : null;
    const contexts = Array.isArray(b.business_contexts)
      ? b.business_contexts.filter((x) => VALID_CONTEXTS.includes(x)).slice(0, 3)
      : [];
    const signalType = VALID_SIGNAL_TYPES.includes(b.signal_type) ? b.signal_type : 'other';
    const toneDirection = VALID_TONES.includes(b.tone_direction) ? b.tone_direction : 'easy_practical';
    const leadMagnet = b.lead_magnet && typeof b.lead_magnet === 'object' && b.lead_magnet.type !== 'none'
      ? {
          type: VALID_LEAD_TYPES.includes(b.lead_magnet.type) ? b.lead_magnet.type : 'guidebook',
          title: typeof b.lead_magnet.title === 'string' ? b.lead_magnet.title : null,
          why_this_magnet: typeof b.lead_magnet.why_this_magnet === 'string' ? b.lead_magnet.why_this_magnet : null,
          sections: Array.isArray(b.lead_magnet.sections) ? b.lead_magnet.sections.slice(0, 5).filter((x) => typeof x === 'string') : [],
          required_inputs: Array.isArray(b.lead_magnet.required_inputs) ? b.lead_magnet.required_inputs.slice(0, 5).filter((x) => typeof x === 'string') : [],
          conversion_goal: VALID_CONVERSION_GOALS.includes(b.lead_magnet.conversion_goal) ? b.lead_magnet.conversion_goal : 'self_apply',
        }
      : null;
    brief = {
      target_persona: persona,
      business_contexts: contexts.length > 0 ? contexts : (persona === 'general' ? ['restaurant', 'clinic'] : ['general']),
      topic_cluster: cluster,
      fit_score: fit,
      relevance_reason: typeof b.relevance_reason === 'string' ? b.relevance_reason : null,
      reader_problem: typeof b.reader_problem === 'string' ? b.reader_problem : null,
      why_now: typeof b.why_now === 'string' ? b.why_now : null,
      signal_type: signalType,
      content_angles: Array.isArray(b.content_angles) ? b.content_angles.slice(0, 3).filter((x) => typeof x === 'string') : [],
      content_angle: typeof b.content_angle === 'string' ? b.content_angle : null,
      practical_takeaway: typeof b.practical_takeaway === 'string' ? b.practical_takeaway : null,
      execution_steps: Array.isArray(b.execution_steps) ? b.execution_steps.slice(0, 4).filter((x) => typeof x === 'string') : [],
      tone_direction: toneDirection,
      recommended_title: typeof b.recommended_title === 'string' ? b.recommended_title : null,
      lead_magnet: leadMagnet,
      lead_magnet_idea: leadMagnet?.title || (typeof b.lead_magnet_idea === 'string' ? b.lead_magnet_idea : null),
      approval_reason: typeof b.approval_reason === 'string' ? b.approval_reason : null,
      risk_flags: Array.isArray(b.risk_flags) ? b.risk_flags.slice(0, 5).filter((x) => typeof x === 'string') : [],
      generated_at: new Date().toISOString(),
      model: DEFAULT_MODEL,
    };
  }

  let translation = null;
  if (!isKo && parsed.translation && typeof parsed.translation === 'object') {
    translation = {
      translated_title: parsed.translation.translated_title || null,
      translated_text: parsed.translation.translated_text || null,
      translated_summary: summary?.one_line_summary || null,
      source_lang: 'en',
      translated_at: new Date().toISOString(),
      model: DEFAULT_MODEL,
    };
  } else if (isKo) {
    translation = {
      translated_title: title || null,
      translated_text: text || null,
      translated_summary: summary?.one_line_summary || null,
      source_lang: 'ko',
      translated_at: new Date().toISOString(),
      model: 'skip',
    };
  }

  return { summary, translation, brief };
}

/**
 * 영어 → 한국어 번역. 본문이 이미 한국어로 보이면 source_lang='ko' 만 표기하고 원문 그대로 반환.
 * @returns {Promise<{translated_title, translated_text, translated_summary, source_lang, translated_at, model}>}
 */
export async function translateToKorean({ itemId, title, text, summary }) {
  const sample = `${title || ''} ${text || ''}`.slice(0, 500);
  if (isLikelyKorean(sample)) {
    return {
      translated_title: title || null,
      translated_text: text || null,
      translated_summary: summary || null,
      source_lang: 'ko',
      translated_at: new Date().toISOString(),
      model: 'skip',
    };
  }

  const sys = `너는 마케팅 콘텐츠 큐레이션을 위한 번역가다. 영어 원문을 자연스러운 한국어로 번역한다. 의역 OK, 마케팅 용어는 그대로 두어도 됨. JSON 만 출력.`;
  const user = `다음 항목을 한국어로 번역해 JSON 으로 반환하라. 키: translated_title, translated_text, translated_summary.\n\nTITLE:\n${title || ''}\n\nTEXT (발췌):\n${(text || '').slice(0, 2000)}\n\nSUMMARY:\n${summary || ''}`;

  const { content } = await callOpenAI({
    stage: 'translate',
    itemId,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    params: { response_format: { type: 'json_object' } },
  });

  let parsed;
  try { parsed = JSON.parse(content); } catch { parsed = {}; }

  return {
    translated_title: parsed.translated_title || null,
    translated_text: parsed.translated_text || null,
    translated_summary: parsed.translated_summary || null,
    source_lang: 'en',
    translated_at: new Date().toISOString(),
    model: DEFAULT_MODEL,
  };
}
