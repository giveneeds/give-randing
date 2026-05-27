import { getContentPillars } from './contentPillarStrategy.js';

const QUERY_SOURCE_TYPES = new Set(['naver_news', 'google_news', 'reddit', 'reddit_search', 'x_search']);

const DEFAULT_ROTATION = ['do_today', 'current_observation', 'trend_plain', 'cost_before_spend', 'content_showcase'];

const ENGLISH_PILLAR_TERMS = {
  cost_before_spend: ['marketing spend waste', 'ad performance audit', 'small business advertising mistakes'],
  do_today: ['AI marketing workflow', 'small business marketing tactics', 'marketing automation examples'],
  current_observation: ['consumer behavior trend', 'brand campaign backlash', 'social media marketing trend'],
  trend_plain: ['AI search marketing', 'platform change marketing', 'creator tools marketing trend'],
  content_showcase: ['ad creative examples', 'copywriting hook examples', 'content strategy examples'],
};

const KOREAN_EXCLUDE_TERMS = [
  '스포츠',
  '야구',
  '축구',
  '농구',
  '배구',
  '골프',
  'e스포츠',
  '선수',
  '구단',
  '정치',
  '선거',
  '연예',
  '드라마',
  '아이돌',
];

const OFF_TOPIC_PATTERNS = [
  /스포츠|야구|축구|농구|배구|골프|e스포츠|선수|구단|월드컵|올림픽/i,
  /정치|선거|국회의원|대통령|지사 후보|정당/i,
  /연예|드라마|아이돌|배우|가수|예능/i,
  /사건사고|범죄|살인|폭행|마약/i,
];

export function buildPillarDrivenSourceQueries(source, { linkedTheme = null, trigger = 'manual' } = {}) {
  if (!source || !QUERY_SOURCE_TYPES.has(source.source_type)) {
    return [{ source, query: source?.identifier || '', pillar: null, reason: 'non_query_source' }];
  }

  if (source.meta?.pillar_driven === false) {
    return [{ source, query: source.identifier, pillar: null, reason: 'pillar_driven_disabled' }];
  }

  const limitFromMeta = Number(source.meta?.pillar_query_limit);
  const limit = Number.isFinite(limitFromMeta) && limitFromMeta > 0
    ? Math.min(7, limitFromMeta)
    : (trigger === 'cron' ? 3 : 5);

  const pillars = getContentPillars();
  const pillarOrder = [
    ...DEFAULT_ROTATION.filter((key) => pillars[key]),
    ...Object.keys(pillars).filter((key) => !DEFAULT_ROTATION.includes(key)),
  ].slice(0, limit);

  const queries = pillarOrder.map((pillarKey) => {
    const pillar = pillars[pillarKey] || {};
    const query = buildQueryForSource({ source, linkedTheme, pillarKey, pillar });
    return {
      source: withIdentifierForQuery(source, query, pillarKey),
      query,
      pillar: pillarKey,
      reason: pillar.label || pillarKey,
    };
  });

  return dedupeQueries(queries);
}

export function isOffTopicCollectedItem(item) {
  const text = [
    item?.normalized?.title,
    item?.normalized?.extracted_text,
    item?.normalized?.meta_description,
    item?.raw_data?.keyword,
    item?.raw_data?.query,
  ].filter(Boolean).join(' ');
  if (!text) return false;
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(text));
}

function buildQueryForSource({ source, linkedTheme, pillarKey, pillar }) {
  const sourceType = source.source_type;
  const isSocial = ['reddit', 'reddit_search', 'x_search'].includes(sourceType);
  const base = pickBaseQuery({ source, linkedTheme, isSocial });
  const excludes = isSocial ? '' : KOREAN_EXCLUDE_TERMS.map((term) => `-${term}`).join(' ');

  if (isSocial) {
    const terms = ENGLISH_PILLAR_TERMS[pillarKey] || ENGLISH_PILLAR_TERMS.trend_plain;
    const socialSuffix = sourceType === 'x_search'
      ? '(AI marketing OR brand marketing OR creator tools OR consumer behavior)'
      : '(small business marketing OR AI marketing OR marketing automation OR growth strategy)';
    return compactQuery([base, terms.slice(0, 2).join(' OR '), socialSuffix]);
  }

  const researchAngles = Array.isArray(pillar.researchAngles) ? pillar.researchAngles.slice(0, 2) : [];
  const keywords = Array.isArray(pillar.threadKeywords) ? pillar.threadKeywords.slice(0, 3) : [];
  return compactQuery([
    base,
    pillar.label,
    researchAngles.join(' '),
    keywords.join(' '),
    '소상공인 마케팅 브랜드 운영 고객 행동 AI',
    excludes,
  ]);
}

function pickBaseQuery({ source, linkedTheme, isSocial }) {
  const themeKeyword = Array.isArray(linkedTheme?.research_keywords) ? linkedTheme.research_keywords[0] : null;
  if (isSocial) {
    return themeKeyword || linkedTheme?.name || source.identifier || 'small business marketing';
  }
  return themeKeyword || source.identifier || linkedTheme?.name || '마케팅';
}

function withIdentifierForQuery(source, query, pillarKey) {
  if (source.source_type !== 'reddit') {
    return {
      ...source,
      identifier: query,
      meta: {
        ...(source.meta || {}),
        generated_from_identifier: source.identifier,
        content_pillar_query: pillarKey,
      },
    };
  }

  const raw = String(source.identifier || '').trim();
  const subreddit = raw.includes(':') ? raw.split(':')[0] : raw || 'smallbusiness';
  return {
    ...source,
    identifier: `${subreddit}:${query}`,
    meta: {
      ...(source.meta || {}),
      query,
      generated_from_identifier: source.identifier,
      content_pillar_query: pillarKey,
    },
  };
}

function compactQuery(parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 480);
}

function dedupeQueries(queries) {
  const seen = new Set();
  return queries.filter((entry) => {
    const key = entry.query.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
