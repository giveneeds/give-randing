#!/usr/bin/env node
/*
 * Threads 검색 결과에서 정보형 연속글 레퍼런스를 자동 발굴해
 * config/threads-reference-urls.json 에 append 한다.
 *
 * 기준:
 * - 첫 게시물 60자 이상
 * - 의미 있는 같은 작성자 후속글 1개 이상
 * - 총 텍스트 900자 이상
 * - 같은 작성자 1개만 채택
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_AUDIT_CONFIG = path.join(ROOT, 'config', 'threads-audit.apify.json');
const DEFAULT_REFERENCE_CONFIG = path.join(ROOT, 'config', 'threads-reference-urls.json');

const DEFAULT_KEYWORDS = [
  '마케팅',
  'AI',
  '브랜드',
];

function todayKst() {
  return new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    auditConfig: DEFAULT_AUDIT_CONFIG,
    referenceConfig: DEFAULT_REFERENCE_CONFIG,
    date: todayKst(),
    limit: 15,
    searchMaxItems: 120,
    detailLimit: 60,
    fallbackAuthors: 6,
    rootMinChars: 60,
    totalMinChars: 900,
    minContinuations: 1,
    keywords: DEFAULT_KEYWORDS,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--audit-config') args.auditConfig = path.resolve(argv[++i]);
    else if (arg === '--reference-config') args.referenceConfig = path.resolve(argv[++i]);
    else if (arg === '--date') args.date = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--search-max-items') args.searchMaxItems = Number(argv[++i]);
    else if (arg === '--detail-limit') args.detailLimit = Number(argv[++i]);
    else if (arg === '--fallback-authors') args.fallbackAuthors = Number(argv[++i]);
    else if (arg === '--root-min-chars') args.rootMinChars = Number(argv[++i]);
    else if (arg === '--total-min-chars') args.totalMinChars = Number(argv[++i]);
    else if (arg === '--min-continuations') args.minContinuations = Number(argv[++i]);
    else if (arg === '--keywords') args.keywords = argv[++i].split(',').map((x) => x.trim()).filter(Boolean);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/collect-threads-references-search.js
  node scripts/collect-threads-references-search.js --limit 15 --keywords "총정리,추천 5개"
`);
      process.exit(0);
    }
  }
  return args;
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function actorIdToPath(actorId) {
  return String(actorId).replace('/', '~');
}

async function runApifyActor({ actorId, input, token, maxItems }) {
  const url = new URL(`https://api.apify.com/v2/acts/${actorIdToPath(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set('token', token);
  if (maxItems) url.searchParams.set('maxItems', String(maxItems));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    const runId = typeof json === 'object' ? json?.error?.message?.match(/run ID:\s*([A-Za-z0-9]+)/)?.[1] : null;
    if (runId) {
      const recovered = await recoverRunDatasetItems({ runId, token });
      if (recovered.length > 0) {
        console.warn(`[reference-search] recovered ${recovered.length} items from failed run ${runId}`);
        return recovered;
      }
    }
    throw new Error(`Apify ${res.status}: ${typeof json === 'string' ? json.slice(0, 500) : JSON.stringify(json).slice(0, 500)}`);
  }
  return Array.isArray(json) ? json : (json?.items || json?.data?.items || []);
}

async function recoverRunDatasetItems({ runId, token }) {
  try {
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const runJson = await runRes.json();
    const datasetId = runJson?.data?.defaultDatasetId;
    if (!datasetId) return [];
    const plainRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`);
    const plainItems = await plainRes.json();
    if (Array.isArray(plainItems) && plainItems.length > 0) return plainItems;
    const postsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&view=posts&clean=true`);
    const postsItems = await postsRes.json();
    return Array.isArray(postsItems) ? postsItems : [];
  } catch {
    return [];
  }
}

function getByPath(obj, pathText) {
  return pathText.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function firstValue(obj, paths) {
  for (const p of paths) {
    const value = getByPath(obj, p);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function canonicalUrl(url) {
  return String(url || '').replace('https://www.threads.net/', 'https://www.threads.com/').split('?')[0];
}

function textOf(post) {
  return String(firstValue(post || {}, [
    'text',
    'text_content',
    'caption',
    'content',
    'body',
    'postText',
    'post_text',
    'root_post.text',
  ]) || '').trim();
}

function authorOf(post) {
  return String(firstValue(post || {}, [
    'author.username',
    'author.userName',
    'author.handle',
    'username',
    'user.username',
    'profile.username',
  ]) || '').replace(/^@/, '');
}

function urlOf(post) {
  return canonicalUrl(firstValue(post || {}, ['url', 'postUrl', 'post_url', 'permalink', 'link']));
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function isMeaningfulContinuation(entry) {
  const text = compactText(entry?.text || entry);
  if (text.length >= 140) return true;
  if (/^(\d+[/.)]|[①②③④⑤⑥⑦⑧⑨⑩]|[가-힣A-Za-z0-9 ]{2,24}\s*[:：])/.test(text) && text.length >= 60) return true;
  if (/(이유|방법|예시|정리|체크|단계|핵심|문제|자동화|데이터|연동|비교|사례|추천|도구|자료)/.test(text) && text.length >= 80) return true;
  return false;
}

function normalizeSearchItems(items, keyword) {
  return (items || []).map((item) => ({
    raw: item,
    text: textOf(item),
    author: authorOf(item),
    url: urlOf(item),
    keyword,
  })).filter((item) => item.url || item.text);
}

function normalizeDetailItem(detailItem, fallback = {}) {
  const root = detailItem?.root_post || detailItem?.rootPost || detailItem?.post || detailItem?.root || detailItem || {};
  const rootText = textOf(root) || fallback.text || '';
  const rootAuthor = authorOf(root) || fallback.author || '';
  const sourceUrl = urlOf(root) || urlOf(detailItem) || fallback.url || '';
  const comments = Array.isArray(detailItem?.comments)
    ? detailItem.comments
    : (Array.isArray(detailItem?.replies) ? detailItem.replies : []);
  const flat = [];
  for (const entry of comments) {
    if (entry?.comment) flat.push(entry.comment);
    else flat.push(entry);
    if (Array.isArray(entry?.replies)) flat.push(...entry.replies);
  }
  const sameAuthor = flat
    .map((comment) => ({ author: authorOf(comment), text: textOf(comment), url: urlOf(comment) }))
    .filter((comment) => comment.text && rootAuthor && comment.author === rootAuthor);
  const meaningful = sameAuthor.filter(isMeaningfulContinuation);
  const totalChars = compactText(rootText).length + meaningful.reduce((sum, entry) => sum + compactText(entry.text).length, 0);
  return {
    source_url: sourceUrl,
    root_author: rootAuthor,
    root_text: rootText,
    root_text_chars: compactText(rootText).length,
    comments_count: flat.length,
    same_author_continuations: sameAuthor,
    meaningful_continuations: meaningful,
    total_text_chars: totalChars,
  };
}

function makeSearchInput(baseInput, keyword) {
  return {
    ...baseInput,
    mode: baseInput.mode || 'search',
    keywords: [keyword],
    search_filter: baseInput.search_filter || 'top',
    start_date: baseInput.start_date || '1 month',
    max_posts: Number(baseInput.max_posts || 10),
  };
}

async function collectSearchItems({ auditConfig, keywords, token, maxItems }) {
  const actorId = auditConfig.actorId || 'futurizerush/meta-threads-scraper';
  const all = [];
  try {
    const batchInput = {
      ...(auditConfig.input || {}),
      mode: auditConfig.input?.mode || 'search',
      keywords,
      search_filter: auditConfig.input?.search_filter || 'top',
      start_date: auditConfig.input?.start_date || '1 month',
      max_posts: Number(auditConfig.input?.max_posts || 10),
    };
    const raw = await runApifyActor({ actorId, input: batchInput, token, maxItems });
    all.push(...normalizeSearchItems(raw, 'batch_search'));
    if (all.length > 0) {
      return dedupeSearchItems(all);
    }
  } catch (error) {
    console.warn(`[reference-search] batch search failed: ${error.message}`);
  }
  for (const keyword of keywords) {
    const input = makeSearchInput(auditConfig.input || {}, keyword);
    try {
      const raw = await runApifyActor({ actorId, input, token, maxItems });
      all.push(...normalizeSearchItems(raw, keyword));
    } catch (error) {
      try {
        const fallback = { ...input, start_date: 'all', query: keyword, searchQueries: [keyword] };
        const raw = await runApifyActor({ actorId, input: fallback, token, maxItems });
        all.push(...normalizeSearchItems(raw, keyword));
      } catch (fallbackError) {
        console.warn(`[reference-search] keyword skipped "${keyword}": ${fallbackError.message}`);
      }
    }
  }
  return dedupeSearchItems(all);
}

async function collectUserFallbackItems({ auditConfig, seedItems, token, maxAuthors }) {
  const actorId = auditConfig.actorId || 'futurizerush/meta-threads-scraper';
  const authors = [...new Set(seedItems.map((item) => item.author).filter(Boolean))].slice(0, maxAuthors);
  const all = [];
  for (const author of authors) {
    const inputs = [
      { mode: 'user', username: author, max_posts: 10 },
      { mode: 'profile', username: author, max_posts: 12 },
      { mode: 'user', usernames: [author], max_posts: 12 },
    ];
    let collected = false;
    for (const input of inputs) {
      if (collected) break;
      try {
        const raw = await runApifyActor({ actorId, input, token });
        const normalized = normalizeSearchItems(raw, `user:${author}`);
        if (normalized.length > 0) {
          all.push(...normalized);
          collected = true;
        }
      } catch {
        // 다음 입력 형태로 폴백.
      }
    }
  }
  return dedupeSearchItems(all);
}

function dedupeSearchItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || `${item.author}:${item.text.slice(0, 80)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function collectDetails({ detailConfig, searchItems, token, limit }) {
  const actorId = detailConfig.actorId || 'trantus/threads-post-scraper';
  const urls = searchItems.map((item) => item.url).filter(Boolean).slice(0, limit);
  if (urls.length === 0) return [];
  const raw = await runApifyActor({
    actorId,
    input: { ...(detailConfig.input || {}), urls },
    token,
  });
  const fallbackMap = new Map(searchItems.map((item) => [canonicalUrl(item.url), item]));
  return raw.map((item) => {
    const normalized = normalizeDetailItem(item);
    return normalizeDetailItem(item, fallbackMap.get(canonicalUrl(normalized.source_url)) || {});
  });
}

function referenceFromDetail(detail, date) {
  const title = compactText(detail.root_text).slice(0, 60) || '정보형 연속글 레퍼런스';
  return {
    label: title,
    author: detail.root_author || '',
    url: canonicalUrl(detail.source_url),
    reference_type: 'structured_info_thread',
    topic: 'threads_reference_structure',
    source: 'apify_search',
    notes: `auto-collected ${date}; root ${detail.root_text_chars} chars; continuations ${detail.meaningful_continuations.length}; total ${detail.total_text_chars} chars`,
  };
}

function mergeReferences(existingConfig, additions) {
  const current = Array.isArray(existingConfig.references) ? existingConfig.references : [];
  const seenUrls = new Set(current.map((ref) => canonicalUrl(ref.url)));
  const merged = [...current];
  for (const ref of additions) {
    const url = canonicalUrl(ref.url);
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    merged.push(ref);
  }
  return { ...existingConfig, references: merged };
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN 미설정');
  const auditConfig = readJson(args.auditConfig, {});
  const referenceConfig = readJson(args.referenceConfig, { actorId: 'trantus/threads-post-scraper', input: { raw: false }, references: [] });

  const searchItems = await collectSearchItems({
    auditConfig,
    keywords: args.keywords,
    token: process.env.APIFY_TOKEN,
    maxItems: args.searchMaxItems,
  });
  const fallbackItems = await collectUserFallbackItems({
    auditConfig,
    seedItems: searchItems,
    token: process.env.APIFY_TOKEN,
    maxAuthors: args.fallbackAuthors,
  });
  const candidateItems = dedupeSearchItems([...searchItems, ...fallbackItems]);
  const details = await collectDetails({
    detailConfig: auditConfig.detailEnrichment || referenceConfig,
    searchItems: candidateItems,
    token: process.env.APIFY_TOKEN,
    limit: args.detailLimit,
  });

  const byAuthor = new Set();
  const selected = details
    .filter((detail) => detail.source_url)
    .filter((detail) => detail.root_text_chars >= args.rootMinChars)
    .filter((detail) => detail.meaningful_continuations.length >= args.minContinuations)
    .filter((detail) => detail.total_text_chars >= args.totalMinChars)
    .sort((a, b) => b.total_text_chars - a.total_text_chars)
    .filter((detail) => {
      const author = detail.root_author || canonicalUrl(detail.source_url);
      if (byAuthor.has(author)) return false;
      byAuthor.add(author);
      return true;
    })
    .slice(0, args.limit);

  const additions = selected.map((detail) => referenceFromDetail(detail, args.date));
  const nextConfig = mergeReferences(referenceConfig, additions);
  const debugPath = path.join(ROOT, 'docs', 'reference-data', `threads-reference-search-debug-${args.date}.json`);
  if (!args.dryRun) {
    fs.mkdirSync(path.dirname(debugPath), { recursive: true });
    writeJson(debugPath, { searchItems, fallbackItems, candidateItems, details, selected, additions });
    writeJson(args.referenceConfig, nextConfig);
  }

  console.log(JSON.stringify({
    searched_keywords: args.keywords.length,
    search_items: searchItems.length,
    fallback_items: fallbackItems.length,
    candidate_items: candidateItems.length,
    detail_items: details.length,
    selected: selected.length,
    appended: nextConfig.references.length - (referenceConfig.references || []).length,
    reference_config: args.referenceConfig,
    filters: {
      root_min_chars: args.rootMinChars,
      total_min_chars: args.totalMinChars,
      min_continuations: args.minContinuations,
      same_author_limit: 1,
    },
    debug_output: args.dryRun ? null : debugPath,
    selected_preview: additions.map((ref) => ({ author: ref.author, url: ref.url, notes: ref.notes })),
    dry_run: args.dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
