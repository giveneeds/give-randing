import { searchQuery } from '@/lib/research/searchProvider';
import { askPerplexity } from '@/lib/research/perplexityProvider';
import { callOpenAI } from '@/lib/llm';

/**
 * Additional material research after the user picks a topic.
 * This is separate from tone/SNS research: it looks for facts, examples, and missing context.
 */
export async function runSupplementalResearch({ item, theme, deepResearch }) {
  const brief = item.classification || {};
  const title = item.normalized?.title || '';
  const angle = brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '');
  const queries = buildSupplementalQueries({ title, angle, brief, theme, deepResearch });

  const merged = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const { results } = await searchQuery(q, {
        includeDomains: null,
        maxResults: 6,
        searchDepth: 'basic',
      });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q });
      }
    } catch (e) {
      console.error(`[runSupplementalResearch] 검색 "${q}" 실패:`, e.message);
    }
  }

  let perplexity = null;
  try {
    perplexity = await askPerplexity({
      query: queries[0] || title || angle,
      context: [
        title && `title: ${title}`,
        angle && `angle: ${angle}`,
        brief.reader_problem && `reader_problem: ${brief.reader_problem}`,
      ].filter(Boolean).join('\n'),
    });
  } catch (e) {
    perplexity = { skipped: true, reason: e.message };
  }

  const insights = await summarizeSupplementalResearch({ title, angle, results: merged, perplexity });
  return { queries, results: merged, perplexity, insights };
}

function buildSupplementalQueries({ title, angle, brief, theme, deepResearch }) {
  const seeds = [
    angle,
    brief.reader_problem,
    brief.why_now,
    deepResearch?.insights?.adapted_angles?.[0],
    title,
    theme?.name,
  ].filter(Boolean);
  const base = seeds[0] || '마케팅 트렌드';
  const second = seeds[1] || base;
  return [
    `${base} 사례 근거 최신`,
    `${second} 브랜드 마케팅 분석`,
  ].slice(0, 2);
}

async function summarizeSupplementalResearch({ title, angle, results, perplexity }) {
  const sample = [
    ...(results || []).slice(0, 10).map((r, i) => (
      `[검색 ${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 350)}\n${r.url}`
    )),
    ...(perplexity?.key_findings || []).map((finding, i) => `[Perplexity ${i + 1}] ${finding}`),
  ].join('\n\n');

  if (!sample) {
    return { evidence_points: [], content_additions: [], missing_context: [], model: 'skip', cost_usd: null };
  }

  const sys = `너는 기브니즈 콘텐츠 기획자의 보강 리서처다.
주제 초안에 들어갈 추가 사실, 사례, 맥락, 빠진 설명을 고른다.

출력:
- evidence_points: 본문에 넣을 수 있는 근거/사례 5개 이내
- content_additions: 초안 생성기에 전달할 보강 방향 5개 이내
- missing_context: 아직 단정하면 안 되는 정보 4개 이내
JSON만 출력.`;

  const user = `제목: ${title}
앵글: ${angle || '(없음)'}

수집 자료:
${sample}

JSON:
{
  "evidence_points": [{"point":"...","source":"...","how_to_use":"..."}],
  "content_additions": ["..."],
  "missing_context": ["..."]
}`;

  const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  try {
    const { content, raw } = await callOpenAI({
      stage: 'supplemental_research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.2 },
    });
    const obj = JSON.parse(content);
    const cost = raw?.usage ? estimateMiniCost(raw.usage) : null;
    return {
      evidence_points: Array.isArray(obj.evidence_points)
        ? obj.evidence_points.slice(0, 5).filter((x) => x && typeof x === 'object').map((x) => ({
            point: typeof x.point === 'string' ? x.point : '',
            source: typeof x.source === 'string' ? x.source : '',
            how_to_use: typeof x.how_to_use === 'string' ? x.how_to_use : '',
          }))
        : [],
      content_additions: Array.isArray(obj.content_additions) ? obj.content_additions.filter((x) => typeof x === 'string').slice(0, 5) : [],
      missing_context: Array.isArray(obj.missing_context) ? obj.missing_context.filter((x) => typeof x === 'string').slice(0, 4) : [],
      model,
      cost_usd: cost,
    };
  } catch (e) {
    console.error('[runSupplementalResearch] LLM 실패:', e.message);
    return { evidence_points: [], content_additions: [], missing_context: [], model, cost_usd: null };
  }
}

function estimateMiniCost(usage) {
  return (((usage.prompt_tokens || 0) * 0.15) + ((usage.completion_tokens || 0) * 0.6)) / 1_000_000;
}
