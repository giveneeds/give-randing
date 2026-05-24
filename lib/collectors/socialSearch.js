import { searchQuery } from '@/lib/research/searchProvider';

const PLATFORM_DOMAINS = {
  x_search: ['x.com', 'twitter.com'],
  reddit_search: ['reddit.com'],
};

/**
 * Search-backed social collector. Useful for X, which has no RSS collector here.
 *
 * @param {string} query
 * @param {{source?: 'x_search'|'reddit_search', max?: number, domains?: string[]}} opts
 */
export async function collectSocialSearch(query, opts = {}) {
  const source = opts.source || 'x_search';
  const domains = opts.domains || PLATFORM_DOMAINS[source] || PLATFORM_DOMAINS.x_search;
  const { results } = await searchQuery(query, {
    includeDomains: domains,
    maxResults: opts.max || 10,
  });

  return results
    .filter((result) => result.url)
    .map((result) => ({
      source,
      source_account: result.source_domain || domains[0],
      post_id: `${source}:${result.url}`.slice(0, 200),
      post_url: result.url,
      posted_at: null,
      raw_data: {
        source_url: result.url,
        domain: result.source_domain || null,
        fetched_at: new Date().toISOString(),
        query,
        score: result.score,
        purpose: 'social_search_collection',
      },
      normalized: {
        title: result.title || result.url,
        extracted_text: result.content || '',
        headings: result.title ? [result.title] : [],
        meta_description: result.content || null,
        published_at: null,
      },
    }));
}
