// 2차 깊이 리서치 — 사용자가 채택한 자료의 주제·앵글에 대해 추가 맥락과 확산 포인트를 본다.
// 1차 리서치(theme_research_snapshots) 가 "이 주제 시장 페인포인트" 라면, 2차는
// "이 해외/국내 이슈를 어떤 콘텐츠 앵글로 가져올 수 있는가" 를 본다. 결과는 스레드 드래프트 생성기에 컨텍스트로 주입.

import { searchQuery } from '@/lib/research/searchProvider';
import { callOpenAI } from '@/lib/llm';
import { normalizePersona } from '@/lib/contentTaxonomy';

const SNS_DOMAINS = [
  'reddit.com',
  'x.com', 'twitter.com',
  'threads.com', 'threads.net',
  'brunch.co.kr',
];

const REQUIRED_SOCIAL_SEARCHES = [
  { label: 'reddit', domains: ['reddit.com'] },
  { label: 'x', domains: ['x.com', 'twitter.com'] },
];

/**
 * @param {{
 *   item: { classification: object, normalized: object, post_url: string },
 *   theme?: { name: string, target_persona: string, target_topic_cluster: string } | null,
 * }} args
 * @returns {Promise<{
 *   queries: string[],
 *   results: Array<{title, url, content, source_domain}>,
 *   insights: { hook_patterns: Array<{pattern, example}>, audience_reactions: string[], adapted_angles: string[] },
 *   model: string,
 *   cost_usd: number | null,
 * }>}
 */
export async function runDeepResearch({ item, theme }) {
  const brief = item.classification || {};
  const title = item.normalized?.title || '';
  const angle = brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '');
  const persona = normalizePersona(theme?.target_persona || brief.suggested_persona || brief.target_persona || 'general');

  // 검색 쿼리는 (1) 앵글 (2) 핵심 페인포인트 어휘 (3) 페르소나 한국어 명을 조합.
  const queries = buildQueries({ title, angle, persona, reader: brief.reader_problem });

  const merged = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const { results } = await searchQuery(q, { includeDomains: SNS_DOMAINS, maxResults: 6 });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q });
      }
    } catch (e) {
      // 검색 1개 실패해도 다음 쿼리 계속.
      console.error(`[runDeepResearch] 쿼리 "${q}" 실패:`, e.message);
    }
  }

  // Reddit/X 비중 보강: 통합 검색과 별개로 각 플랫폼 전용 검색을 한 번씩 추가한다.
  // 여기서도 핵심은 말투 수집보다 해외 마케팅/AI 맥락과 쓸만한 이슈 보강이다.
  for (const target of REQUIRED_SOCIAL_SEARCHES) {
    const q = `${queries[0] || title || angle} ${target.label === 'reddit' ? 'AI marketing reddit discussion OR marketing automation' : 'AI marketing OR marketing trend OR creator tools'}`;
    try {
      const { results } = await searchQuery(q, { includeDomains: target.domains, maxResults: 4 });
      for (const r of results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        merged.push({ ...r, source_keyword: q, required_social_source: target.label });
      }
    } catch (e) {
      console.error(`[runDeepResearch] ${target.label} 보강 쿼리 실패:`, e.message);
    }
  }

  // LLM 으로 후킹 패턴·반응 정리.
  const insights = await extractDeepInsights({
    title,
    angle,
    persona,
    results: merged,
  });

  return { queries, results: merged, insights, model: insights.model, cost_usd: insights.cost_usd };
}

// 전술 실행 자료 우선 — 한국어 1 + 영어 2 = 3개 (Tavily 1000회/월 한도 절약).
// SNS 도메인 한정이라 Reddit/X/Threads 실 사용자 발언이 잡힌다.
function buildQueries({ title, angle, persona, reader }) {
  const base = [];
  const personaWord = {
    general: '마케팅 운영자',
    unknown: '마케팅 운영자',
  }[persona] || '작은 사업자 브랜드 운영자';

  const enKey = englishKeyFromAngle(angle, title);

  // 한국어 1개 — 국내 SNS 실 사용자 후기·수치 우선
  if (angle) base.push(`${angle} 실제 사용자 후기 수치 사례`);
  else if (reader) base.push(`${reader} 실제 후기 사례`);
  else base.push(`${personaWord} 실전 후기 수치`);

  // 영어 2개 — 해외 SNS 의 워크플로우/Before·After
  base.push(`reddit OR twitter ${enKey} actual workflow ROI numbers`);
  base.push(`${enKey} before after metrics case study practitioner`);

  return base.slice(0, 3);
}

function englishKeyFromAngle(angle, title) {
  const text = `${angle || ''} ${title || ''}`;
  const tokens = (text.match(/[A-Za-z][A-Za-z0-9+&\-]{2,}/g) || [])
    .filter((t, i, arr) => t.length >= 3 && arr.indexOf(t) === i);
  if (tokens.length >= 2) return tokens.slice(0, 4).join(' ');
  if (tokens.length === 1) return `${tokens[0]} marketing`;
  return 'marketing tactic workflow';
}

async function extractDeepInsights({ title, angle, persona, results }) {
  if (!results || results.length === 0) {
    return { hook_patterns: [], audience_reactions: [], adapted_angles: [], model: 'skip', cost_usd: null };
  }

  const sample = results.slice(0, 12).map((r, i) => (
    `[${i + 1}] (${r.source_domain || '?'}) ${r.title}\n${(r.content || '').slice(0, 350)}`
  )).join('\n\n');

  const sys = `너는 기브니즈 콘텐츠 작가의 2차 리서처다. 채택된 자료/앵글과 관련해 Reddit·X·Threads·웹에서 추가로 가져올 해외 마케팅/AI 이슈, 확산 포인트, 보강 맥락을 추출한다.

추출 항목:
- source_signal: 이 주제가 지금 왜 중요한가. 최근 기사·공식 발표·이슈·플랫폼 변화 1~2개를 사실/날짜와 함께. "이 주제는 중요합니다" 류 일반문이면 실패.
- hook_patterns: 이 소재를 콘텐츠로 가져올 때 쓸 수 있는 후킹 패턴. 4개 이내. {pattern, example} 형태.
- audience_reactions: 이 주제에 사람들이 보이는 반응·반박·궁금증이 있으면 4개 이내. 없으면 억지로 만들지 않는다.
- adapted_angles: 해외 이슈/사례를 한국어 Threads 콘텐츠로 재해석할 때 권장하는 앵글 2~3개. 영어 요약만 하고 한국 맥락이 없으면 실패.
- missing_context: 아직 확인 못한 정보. Writer 가 낮춰 쓰도록. 없으면 빈 문자열.

근거(수치·사례)는 출처 없는 단정("연구에 따르면~")을 쓰지 않는다. 출력은 JSON 만.`;

  const user = `채택된 자료:
- 제목: ${title}
- 앵글: ${angle || '(없음)'}
- 타겟 페르소나: ${persona}

SNS 검색 결과:
${sample}

JSON 형태:
{
  "source_signal": "이 주제가 지금 나온 이유 (기사명·날짜·핵심 사실). 없으면 빈 문자열",
  "hook_patterns": [{"pattern": "...", "example": "..."}],
  "audience_reactions": ["...","..."],
  "adapted_angles": ["...","..."],
  "missing_context": "아직 확인 못한 정보. 없으면 빈 문자열"
}`;

  const model = process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini';
  let parsed = { hook_patterns: [], audience_reactions: [], adapted_angles: [] };
  let cost = null;

  try {
    const { content, raw } = await callOpenAI({
      stage: 'deep_research_insight',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.3 },
    });
    const obj = JSON.parse(content);
    parsed = {
      source_signal: typeof obj.source_signal === 'string' ? obj.source_signal.slice(0, 500) : '',
      hook_patterns: Array.isArray(obj.hook_patterns)
        ? obj.hook_patterns.slice(0, 4).filter((h) => h && typeof h === 'object').map((h) => ({
            pattern: typeof h.pattern === 'string' ? h.pattern : '',
            example: typeof h.example === 'string' ? h.example : '',
          }))
        : [],
      audience_reactions: Array.isArray(obj.audience_reactions)
        ? obj.audience_reactions.slice(0, 4).filter((x) => typeof x === 'string')
        : [],
      adapted_angles: Array.isArray(obj.adapted_angles)
        ? obj.adapted_angles.slice(0, 3).filter((x) => typeof x === 'string')
        : [],
      missing_context: typeof obj.missing_context === 'string' ? obj.missing_context.slice(0, 300) : '',
    };
    if (raw?.usage) {
      const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 } };
      const p = PRICE[model];
      if (p) cost = ((raw.usage.prompt_tokens || 0) * p.in + (raw.usage.completion_tokens || 0) * p.out) / 1_000_000;
    }
  } catch (e) {
    console.error('[runDeepResearch] LLM 실패:', e.message);
  }

  return { ...parsed, model, cost_usd: cost };
}
