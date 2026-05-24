// 외부 검색 SaaS 래퍼 — 현재 Tavily 만 지원.
// 키워드 → SNS·뉴스 도메인 한정 결과 배열 반환.
//
// 무료 한도: 1000 검색/월 (https://docs.tavily.com).
// TAVILY_API_KEY 환경변수 필요.

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

const DEFAULT_INCLUDE_DOMAINS = [
  'threads.com',
  'threads.net',
  'reddit.com',
  'x.com',
  'twitter.com',
  'brunch.co.kr',
  'tistory.com',
  'medium.com',
];

function getKey() {
  const k = process.env.TAVILY_API_KEY;
  if (!k) throw new Error('TAVILY_API_KEY 미설정');
  return k;
}

/**
 * Tavily 검색 실행.
 * @param {string} query
 * @param {{ includeDomains?: string[], excludeDomains?: string[], maxResults?: number, searchDepth?: 'basic'|'advanced' }} opts
 * @returns {Promise<{ results: Array<{title, url, content, score, source_domain}>, raw: object }>}
 */
export async function searchQuery(query, opts = {}) {
  const body = {
    api_key: getKey(),
    query,
    search_depth: opts.searchDepth || 'basic',
    max_results: opts.maxResults || 10,
    exclude_domains: opts.excludeDomains || [],
    include_answer: false,
    include_raw_content: false,
  };
  if (Array.isArray(opts.includeDomains)) {
    body.include_domains = opts.includeDomains;
  } else if (opts.includeDomains !== null) {
    body.include_domains = DEFAULT_INCLUDE_DOMAINS;
  }

  const res = await fetch(TAVILY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results.map((r) => ({
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    score: typeof r.score === 'number' ? r.score : null,
    source_domain: safeDomain(r.url),
  })) : [];

  return { results, raw: data };
}

function safeDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}
