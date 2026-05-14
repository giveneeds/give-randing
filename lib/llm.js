// LLM 클라이언트 — 현재는 OpenAI gpt-4o-mini 단일 경로.
// 모든 호출은 agent_ai_logs 에 자동 기록(서버 사이드 service_role 사용).

import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
 */
export async function enrichItem({ itemId, title, text, sourceLabel }) {
  const sample = `${title || ''} ${text || ''}`.slice(0, 800);
  const isKo = isLikelyKorean(sample);

  const sys = `너는 B2B 마케팅 콘텐츠 큐레이션 보조 에이전트다. 입력으로 들어온 콘텐츠를 다음 두 가지로 정제한다:
1) 한국어 요약 (summary): {one_line_summary, key_points[], why_it_matters}
2) 영어 원문이면 한국어 번역 (translation): {translated_title, translated_text}; 이미 한국어면 null
출력은 JSON 만.`;

  const user = `소스: ${sourceLabel || '(미상)'}
원문 언어: ${isKo ? 'ko (한국어)' : 'en (영어 또는 기타)'}
TITLE:
${title || ''}

TEXT:
${(text || '').slice(0, 1800)}

요청:
- one_line_summary: 한국어 한 문장 (40자 내외)
- key_points: 한국어 짧은 불릿 2~4개 (각 30자 이내)
- why_it_matters: 한국어로 마케터에게 왜 가치 있는지 1문장. 가치 미상이면 null
- translation: ${isKo ? 'null (이미 한국어)' : '{translated_title, translated_text} 한국어로'}

JSON 형태:
{
  "summary": { "one_line_summary": "...", "key_points": ["...","..."], "why_it_matters": "..." | null },
  "translation": { "translated_title": "...", "translated_text": "..." } | null
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

  return { summary, translation };
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
