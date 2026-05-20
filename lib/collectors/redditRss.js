// Reddit collector — 인증 없이 공개 subreddit/search RSS/JSON을 읽는다.
// 목적: 해외 소상공인/마케터의 실제 고민, AI 활용 사례, 마케팅 실행 신호를
// 기브니즈 콘텐츠 기획 브리프의 시장 신호로 가져오는 것.

const REDDIT_BASE = 'https://www.reddit.com';

function decodeHtml(input) {
  if (!input) return '';
  let text = String(input);
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    '#39': "'",
    nbsp: ' ',
  };

  for (let i = 0; i < 2; i += 1) {
    text = text
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, entity) => {
        const key = entity.toLowerCase();
        if (named[key]) return named[key];
        if (key.startsWith('#x')) {
          const code = parseInt(key.slice(2), 16);
          return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        if (key.startsWith('#')) {
          const code = parseInt(key.slice(1), 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return m;
      });
  }

  return text;
}

function stripHtml(input) {
  return decodeHtml(input)
    .replace(/<!--\s*SC_(?:OFF|ON)\s*-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = re.exec(block);
  return match ? decodeHtml(match[1]).trim() : null;
}

function pickAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*>`, 'i');
  const match = re.exec(block);
  return match ? decodeHtml(match[1]).trim() : null;
}

function parseAtom(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1];
    entries.push({
      id: pick(block, 'id'),
      title: pick(block, 'title'),
      content: pick(block, 'content'),
      author: pick(block, 'name'),
      link: pickAttr(block, 'link', 'href'),
      published: pick(block, 'published'),
      updated: pick(block, 'updated'),
      subreddit: pickAttr(block, 'category', 'term'),
    });
  }
  return entries;
}

function normalizeSubreddit(value) {
  return String(value || '')
    .trim()
    .replace(/^\/?r\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');
}

function normalizeSort(value, fallback = 'new') {
  const sort = String(value || fallback).toLowerCase();
  return ['new', 'hot', 'top', 'relevance', 'comments'].includes(sort) ? sort : fallback;
}

function normalizeTime(value) {
  const time = String(value || 'week').toLowerCase();
  return ['hour', 'day', 'week', 'month', 'year', 'all'].includes(time) ? time : 'week';
}

function normalizeFormat(value, opts = {}) {
  const format = String(value || '').toLowerCase();
  if (format === 'json' || format === 'rss') return format;
  if (
    opts.popular === true ||
    opts.min_score != null ||
    opts.min_comments != null ||
    opts.min_upvote_ratio != null ||
    opts.min_market_signal_score != null ||
    ['top', 'hot', 'comments'].includes(normalizeSort(opts.sort, 'new'))
  ) {
    return 'json';
  }
  return 'rss';
}

function parseIdentifier(identifier, opts = {}) {
  const raw = String(identifier || '').trim();
  if (!raw) throw new Error('Reddit identifier 누락');

  if (/^https?:\/\//i.test(raw)) {
    return { kind: 'url', raw, query: typeof opts.query === 'string' ? opts.query.trim() : '' };
  }

  const explicitQuery = typeof opts.query === 'string' ? opts.query.trim() : '';

  if (raw.includes(':')) {
    const [left, ...rest] = raw.split(':');
    const scope = left.trim().toLowerCase();
    const query = explicitQuery || rest.join(':').trim();
    if (!query) throw new Error('Reddit 검색어 누락');

    return {
      kind: scope === 'all' || scope === 'search' ? 'global_search' : 'subreddit_search',
      subreddit: scope === 'all' || scope === 'search' ? null : normalizeSubreddit(scope),
      query,
    };
  }

  return {
    kind: explicitQuery ? 'subreddit_search' : 'subreddit_listing',
    subreddit: normalizeSubreddit(raw),
    query: explicitQuery || null,
  };
}

function ensureRssUrl(url) {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith('.rss')) return parsed.toString();
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '.rss';
  return parsed.toString();
}

function buildRedditUrl(identifier, opts = {}) {
  const max = opts.max ?? 15;
  const sort = normalizeSort(opts.sort, 'new');
  const time = normalizeTime(opts.time);
  const parsed = parseIdentifier(identifier, opts);

  if (parsed.kind === 'url') {
    return ensureRssUrl(parsed.raw);
  }

  if (parsed.kind === 'global_search' || parsed.kind === 'subreddit_search') {
    const url = new URL(parsed.kind === 'global_search' ? '/search.rss' : `/r/${parsed.subreddit}/search.rss`, REDDIT_BASE);
    url.searchParams.set('q', parsed.query);
    url.searchParams.set('sort', sort);
    url.searchParams.set('t', time);
    url.searchParams.set('limit', String(max));
    if (parsed.kind === 'subreddit_search') url.searchParams.set('restrict_sr', '1');
    return url.toString();
  }

  const listing = ['new', 'hot', 'top'].includes(sort) ? sort : 'new';
  const url = new URL(`/r/${parsed.subreddit}/${listing}.rss`, REDDIT_BASE);
  url.searchParams.set('limit', String(max));
  if (listing === 'top') url.searchParams.set('t', time);
  return url.toString();
}

function buildRedditJsonUrl(identifier, opts = {}) {
  const max = opts.max ?? 15;
  const sort = normalizeSort(opts.sort, 'top');
  const time = normalizeTime(opts.time || 'month');
  const parsed = parseIdentifier(identifier, opts);

  if (parsed.kind === 'url') {
    const url = new URL(parsed.raw);
    url.pathname = url.pathname.replace(/\/+$/, '') + '.json';
    url.searchParams.set('limit', String(max));
    return url.toString();
  }

  if (parsed.kind === 'global_search' || parsed.kind === 'subreddit_search') {
    const url = new URL(parsed.kind === 'global_search' ? '/search.json' : `/r/${parsed.subreddit}/search.json`, REDDIT_BASE);
    url.searchParams.set('q', parsed.query);
    url.searchParams.set('sort', sort);
    url.searchParams.set('t', time);
    url.searchParams.set('limit', String(max));
    if (parsed.kind === 'subreddit_search') url.searchParams.set('restrict_sr', '1');
    return url.toString();
  }

  const listing = ['new', 'hot', 'top'].includes(sort) ? sort : 'top';
  const url = new URL(`/r/${parsed.subreddit}/${listing}.json`, REDDIT_BASE);
  url.searchParams.set('limit', String(max));
  if (listing === 'top') url.searchParams.set('t', time);
  return url.toString();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractPostId(entry) {
  if (entry.id) return entry.id;
  const match = /\/comments\/([^/]+)/.exec(entry.link || '');
  return match ? `t3_${match[1]}` : entry.link;
}

function cleanRedditText(content) {
  const text = stripHtml(content);
  return text
    .replace(/\s*submitted by\s+\/u\/\S+[\s\S]*$/i, '')
    .replace(/\s*\[link\]\s*\[comments\]\s*$/i, '')
    .trim();
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function computeMarketSignalScore(post, weights = {}) {
  const w = {
    score: 1,
    comments: 3,
    upvote_ratio: 10,
    crossposts: 2,
    ...weights,
  };

  return Math.round(
    numberOrZero(post.score) * numberOrZero(w.score) +
    numberOrZero(post.num_comments) * numberOrZero(w.comments) +
    numberOrZero(post.upvote_ratio) * numberOrZero(w.upvote_ratio) +
    numberOrZero(post.num_crossposts) * numberOrZero(w.crossposts)
  );
}

function passesPopularityThreshold(post, marketSignalScore, opts = {}) {
  const minScore = opts.min_score == null ? null : numberOrZero(opts.min_score);
  const minComments = opts.min_comments == null ? null : numberOrZero(opts.min_comments);
  const minUpvoteRatio = opts.min_upvote_ratio == null ? null : numberOrZero(opts.min_upvote_ratio);
  const minMarketSignalScore = opts.min_market_signal_score == null ? null : numberOrZero(opts.min_market_signal_score);

  if (minScore != null && numberOrZero(post.score) < minScore) return false;
  if (minComments != null && numberOrZero(post.num_comments) < minComments) return false;
  if (minUpvoteRatio != null && numberOrZero(post.upvote_ratio) < minUpvoteRatio) return false;
  if (minMarketSignalScore != null && marketSignalScore < minMarketSignalScore) return false;
  return true;
}

function normalizeJsonPost(post, context) {
  const title = stripHtml(post.title || '');
  const body = stripHtml(post.selftext || '');
  const permalink = post.permalink ? new URL(post.permalink, REDDIT_BASE).toString() : post.url;
  const postedAt = post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null;
  const postId = post.name || (post.id ? `t3_${post.id}` : permalink);
  const marketSignalScore = computeMarketSignalScore(post, context.scoreWeights);
  const text = body || stripHtml(post.url_overridden_by_dest || post.url || '');

  return {
    source: 'reddit',
    source_account: post.subreddit ? `r/${post.subreddit}` : null,
    post_id: `reddit:${postId}`.slice(0, 200),
    post_url: permalink,
    posted_at: postedAt,
    raw_data: {
      source_url: permalink,
      feed_url: context.url,
      reddit_id: postId,
      author: post.author || null,
      subreddit: post.subreddit || null,
      fetched_at: context.fetchedAt,
      identifier: context.identifier,
      query: context.query,
      purpose: context.purpose,
      ranking_basis: context.rankingBasis,
      metrics: {
        score: numberOrZero(post.score),
        ups: numberOrZero(post.ups),
        num_comments: numberOrZero(post.num_comments),
        upvote_ratio: numberOrZero(post.upvote_ratio),
        num_crossposts: numberOrZero(post.num_crossposts),
        subreddit_subscribers: numberOrZero(post.subreddit_subscribers),
        market_signal_score: marketSignalScore,
      },
    },
    normalized: {
      title,
      extracted_text: text,
      headings: [title],
      meta_description: text ? text.slice(0, 240) : null,
      published_at: postedAt,
    },
  };
}

async function collectRedditJson(identifier, opts = {}) {
  const max = opts.max ?? 15;
  const url = buildRedditJsonUrl(identifier, { ...opts, max });
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GiveneedsBot/1.0 (content market research; contact: giveneeds1@naver.com)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Reddit JSON ${res.status}`);

  const payload = await res.json();
  const posts = Array.isArray(payload?.data?.children)
    ? payload.data.children.map((child) => child?.data).filter(Boolean)
    : [];
  const parsed = parseIdentifier(identifier, opts);
  const query = opts.query || (parsed.query ?? null);
  const scoreWeights = opts.score_weights && typeof opts.score_weights === 'object' ? opts.score_weights : {};
  const context = {
    url,
    identifier,
    query,
    scoreWeights,
    fetchedAt: new Date().toISOString(),
    purpose: opts.purpose || 'market_signal_research',
    rankingBasis: {
      sort: normalizeSort(opts.sort, 'top'),
      time: normalizeTime(opts.time || 'month'),
      min_score: opts.min_score ?? null,
      min_comments: opts.min_comments ?? null,
      min_upvote_ratio: opts.min_upvote_ratio ?? null,
      min_market_signal_score: opts.min_market_signal_score ?? null,
      score_weights: {
        score: 1,
        comments: 3,
        upvote_ratio: 10,
        crossposts: 2,
        ...scoreWeights,
      },
    },
  };

  return posts
    .map((post) => ({ post, marketSignalScore: computeMarketSignalScore(post, scoreWeights) }))
    .filter(({ post, marketSignalScore }) => passesPopularityThreshold(post, marketSignalScore, opts))
    .sort((a, b) => (
      b.marketSignalScore - a.marketSignalScore ||
      numberOrZero(b.post.score) - numberOrZero(a.post.score) ||
      numberOrZero(b.post.num_comments) - numberOrZero(a.post.num_comments)
    ))
    .slice(0, max)
    .map(({ post }) => normalizeJsonPost(post, context))
    .filter((item) => item.normalized.title && item.post_url);
}

/**
 * @param {string} identifier
 *   예: "smallbusiness", "r/restaurateur", "smallbusiness:AI marketing", "all:restaurant marketing"
 * @param {{
 *   max?:number,
 *   sort?:string,
 *   time?:string,
 *   query?:string,
 *   purpose?:string,
 *   format?:'rss'|'json',
 *   popular?:boolean,
 *   min_score?:number,
 *   min_comments?:number,
 *   min_upvote_ratio?:number,
 *   min_market_signal_score?:number,
 *   score_weights?:Record<string, number>
 * }} opts
 */
export async function collectRedditRss(identifier, opts = {}) {
  const max = opts.max ?? 15;
  const format = normalizeFormat(opts.format, opts);
  if (format === 'json') {
    return collectRedditJson(identifier, { ...opts, max });
  }

  const url = buildRedditUrl(identifier, { ...opts, max });

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GiveneedsBot/1.0 (content market research; contact: giveneeds1@naver.com)',
      Accept: 'application/atom+xml, application/rss+xml, text/xml',
    },
  });
  if (!res.ok) throw new Error(`Reddit RSS ${res.status}`);

  const xml = await res.text();
  const entries = parseAtom(xml).slice(0, max);

  return entries
    .filter((entry) => entry.title && entry.link)
    .map((entry) => {
      const postId = extractPostId(entry);
      const text = cleanRedditText(entry.content);
      const title = stripHtml(entry.title);
      const subreddit = entry.subreddit || normalizeSubreddit(identifier.split(':')[0]);
      const publishedAt = parseDate(entry.published || entry.updated);

      return {
        source: 'reddit',
        source_account: subreddit ? `r/${subreddit}` : null,
        post_id: `reddit:${postId}`.slice(0, 200),
        post_url: entry.link,
        posted_at: publishedAt,
        raw_data: {
          source_url: entry.link,
          feed_url: url,
          reddit_id: postId,
          author: entry.author || null,
          subreddit: subreddit || null,
          fetched_at: new Date().toISOString(),
          identifier,
          query: opts.query || (identifier.includes(':') ? identifier.split(':').slice(1).join(':').trim() : null),
          purpose: opts.purpose || 'market_signal_research',
        },
        normalized: {
          title,
          extracted_text: text,
          headings: [title],
          meta_description: text ? text.slice(0, 240) : null,
          published_at: publishedAt,
        },
      };
    });
}
