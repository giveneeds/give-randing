import { searchQuery } from '@/lib/research/searchProvider';
import { callOpenAI } from '@/lib/llm';

const TONE_DOMAINS = ['threads.com', 'threads.net', 'x.com', 'twitter.com', 'reddit.com'];

/**
 * Third research pass: how people phrase this topic in social contexts.
 * It feeds voice, rhythm, and wording guardrails into candidate generation.
 */
export async function runToneResearch({ item, theme, deepResearch }) {
  const brief = item.classification || {};
  const title = item.normalized?.title || '';
  const angle = brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '');
  const query = [
    angle,
    brief.reader_problem,
    deepResearch?.insights?.audience_reactions?.[0],
    title,
    theme?.name,
  ].filter(Boolean)[0] || '마케팅 반응 말투';

  const queries = [
    `${query} 반응 말투`,
    `${query} 사람들 댓글 질문`,
  ];

  const merged = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const { results } = await searchQuery(q, {
        includeDomains: TONE_DOMAINS,
        maxResults: 6,
      });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q });
      }
    } catch (e) {
      console.error(`[runToneResearch] 검색 "${q}" 실패:`, e.message);
    }
  }

  const insights = await extractToneInsights({ title, angle, results: merged });
  return { queries, results: merged, insights };
}

async function extractToneInsights({ title, angle, results }) {
  if (!results || results.length === 0) {
    return { voice_patterns: [], phrases_to_borrow: [], phrases_to_avoid: [], reader_questions: [], model: 'skip', cost_usd: null };
  }

  const sample = results.slice(0, 12).map((r, i) => (
    `[${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 320)}`
  )).join('\n\n');

  const sys = `너는 Threads/X/Reddit 말투 리서처다.
자료에서 사람들이 이 주제를 어떤 말투, 질문, 불만, 농담, 경계심으로 말하는지 뽑는다.
출력은 글쓰기 참고용이지 문장 복사용이 아니다.

JSON:
{
  "voice_patterns": ["..."],
  "phrases_to_borrow": ["..."],
  "phrases_to_avoid": ["..."],
  "reader_questions": ["..."]
}`;

  const user = `제목: ${title}
앵글: ${angle || '(없음)'}

소셜 검색 결과:
${sample}`;

  const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  try {
    const { content, raw } = await callOpenAI({
      stage: 'tone_research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.2 },
    });
    const obj = JSON.parse(content);
    return {
      voice_patterns: normalizeStringArray(obj.voice_patterns, 5),
      phrases_to_borrow: normalizeStringArray(obj.phrases_to_borrow, 8),
      phrases_to_avoid: normalizeStringArray(obj.phrases_to_avoid, 8),
      reader_questions: normalizeStringArray(obj.reader_questions, 6),
      model,
      cost_usd: raw?.usage ? estimateMiniCost(raw.usage) : null,
    };
  } catch (e) {
    console.error('[runToneResearch] LLM 실패:', e.message);
    return { voice_patterns: [], phrases_to_borrow: [], phrases_to_avoid: [], reader_questions: [], model, cost_usd: null };
  }
}

function normalizeStringArray(input, max) {
  return Array.isArray(input) ? input.filter((x) => typeof x === 'string' && x.trim()).slice(0, max) : [];
}

function estimateMiniCost(usage) {
  return (((usage.prompt_tokens || 0) * 0.15) + ((usage.completion_tokens || 0) * 0.6)) / 1_000_000;
}
