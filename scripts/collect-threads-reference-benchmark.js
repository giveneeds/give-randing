#!/usr/bin/env node
/*
 * 검증된 Threads 레퍼런스 URL을 상세 수집하고 benchmark 문서로 변환한다.
 *
 * 자동 Top 표본과 달리, 이 스크립트는 사용자가 직접 확인한 정보형 연속글 URL을
 * 품질 기준용 reference set 으로 축적하는 데 사용한다.
 *
 * 사용:
 * - node scripts/collect-threads-reference-benchmark.js
 * - node scripts/collect-threads-reference-benchmark.js --detail-json ./docs/reference-data/manual.json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_CONFIG = path.join(ROOT, 'config', 'threads-reference-urls.json');
const DEFAULT_OUT_DIR = path.join(ROOT, 'docs', 'reference-data');

function todayKst() {
  return new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG,
    date: todayKst(),
    detailJson: null,
    noFetch: false,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--config') args.config = path.resolve(argv[++i]);
    else if (arg === '--date') args.date = argv[++i];
    else if (arg === '--detail-json') args.detailJson = path.resolve(argv[++i]);
    else if (arg === '--no-fetch') args.noFetch = true;
    else if (arg === '--out-dir') args.outDir = path.resolve(argv[++i]);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/collect-threads-reference-benchmark.js
  node scripts/collect-threads-reference-benchmark.js --detail-json ./docs/reference-data/threads-detail-manual.json
  node scripts/collect-threads-reference-benchmark.js --no-fetch --detail-json ./docs/reference-data/threads-detail-manual.json
`);
      process.exit(0);
    }
  }

  return args;
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function actorIdToPath(actorId) {
  return String(actorId).replace('/', '~');
}

async function runApifyActor({ actorId, input, token }) {
  const url = new URL(`https://api.apify.com/v2/acts/${actorIdToPath(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set('token', token);

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
    throw new Error(`Apify ${res.status}: ${typeof json === 'string' ? json.slice(0, 500) : JSON.stringify(json).slice(0, 500)}`);
  }
  return Array.isArray(json) ? json : (json?.items || json?.data?.items || []);
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

function textFromAnyPost(post) {
  return String(firstValue(post || {}, [
    'text',
    'text_content',
    'caption',
    'content',
    'body',
    'post_text',
    'postText',
    'root_post.text',
  ]) || '').trim();
}

function authorFromAnyPost(post) {
  return String(firstValue(post || {}, [
    'username',
    'user.username',
    'author.username',
    'author.userName',
    'profile.username',
  ]) || '').replace(/^@/, '');
}

function urlFromAnyPost(post) {
  return String(firstValue(post || {}, [
    'url',
    'postUrl',
    'post_url',
    'permalink',
    'link',
  ]) || '');
}

function canonicalUrl(url) {
  return String(url || '').replace('https://www.threads.net/', 'https://www.threads.com/');
}

function mediaCountOf(post) {
  const sources = [
    post?.images,
    post?.videos,
    post?.carousel_media,
    post?.media_urls,
    post?.mediaUrls,
  ];
  return sources.reduce((max, value) => (Array.isArray(value) ? Math.max(max, value.length) : max), 0);
}

function normalizeDetailItem(detailItem, referenceMap) {
  if (detailItem?.root_text || detailItem?.same_author_continuations) {
    const ref = referenceMap.get(canonicalUrl(detailItem.source_url || detailItem.search_context?.url)) || {};
    return {
      ...detailItem,
      search_context: {
        ...(detailItem.search_context || {}),
        author: detailItem.search_context?.author || ref.author || detailItem.root_author || '',
        keyword: detailItem.search_context?.keyword || ref.topic || ref.label || 'verified_reference',
        url: detailItem.search_context?.url || ref.url || detailItem.source_url || '',
        media_count: detailItem.search_context?.media_count ?? mediaCountOf(detailItem.root_post || {}),
        reference_type: ref.reference_type || detailItem.search_context?.reference_type || '',
        reference_label: ref.label || detailItem.search_context?.reference_label || '',
        reference_source: ref.source || detailItem.search_context?.reference_source || '',
      },
      reference_context: ref,
    };
  }

  const root = detailItem?.root_post || detailItem?.rootPost || detailItem?.post || detailItem?.root || detailItem || {};
  const rootText = textFromAnyPost(root);
  const rootAuthor = authorFromAnyPost(root);
  const rootUrl = urlFromAnyPost(root) || urlFromAnyPost(detailItem);
  const ref = referenceMap.get(canonicalUrl(rootUrl)) || {};
  const comments = Array.isArray(detailItem?.comments)
    ? detailItem.comments
    : (Array.isArray(detailItem?.replies) ? detailItem.replies : []);

  const flatComments = [];
  for (const entry of comments) {
    if (entry?.comment) flatComments.push(entry.comment);
    else flatComments.push(entry);
    if (Array.isArray(entry?.replies)) flatComments.push(...entry.replies);
  }

  const normalizedComments = flatComments
    .map((comment) => ({
      author: authorFromAnyPost(comment),
      text: textFromAnyPost(comment),
      url: urlFromAnyPost(comment),
    }))
    .filter((comment) => comment.text);

  const sameAuthorContinuations = normalizedComments
    .filter((comment) => rootAuthor && comment.author === rootAuthor);

  return {
    source_url: rootUrl || ref.url || '',
    root_author: rootAuthor || ref.author || '',
    root_text: rootText,
    comments_count: flatComments.length,
    same_author_continuations: sameAuthorContinuations,
    reply_samples: normalizedComments.slice(0, 8),
    raw_keys: Object.keys(detailItem || {}),
    search_context: {
      author: ref.author || rootAuthor || '',
      keyword: ref.topic || ref.label || 'verified_reference',
      url: ref.url || rootUrl || '',
      search_text: rootText,
      text_chars: rootText.length,
      media_count: mediaCountOf(root),
      metrics: {
        likes: Number(root.like_count || 0),
        replies: Number(root.direct_reply_count || flatComments.length || 0),
        views: Number(root.view_count || root.views || 0),
        shareOrRepost: Math.max(Number(root.repost_count || 0), Number(root.quote_count || 0), Number(root.reshared_count || 0)),
      },
      reference_type: ref.reference_type || '',
      reference_label: ref.label || '',
      reference_source: ref.source || '',
    },
    reference_context: ref,
  };
}

function normalizeDetailItems(raw, references) {
  const arr = Array.isArray(raw) ? raw : (raw?.items || raw?.data?.items || []);
  const referenceMap = new Map(references.map((ref) => [canonicalUrl(ref.url), ref]));
  return arr.map((item) => normalizeDetailItem(item, referenceMap)).filter((item) => item.source_url || item.root_text);
}

function runAnalyzer({ date, detailPath, outDir }) {
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'scripts', 'analyze-threads-benchmark.js'),
    '--date',
    `${date}-reference`,
    '--detail-json',
    detailPath,
    '--out-dir',
    outDir,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`benchmark analyzer failed with exit ${result.status}`);
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  const config = readJson(args.config);
  const references = Array.isArray(config.references) ? config.references : [];
  if (references.length === 0) throw new Error('config.references 가 비어 있습니다.');

  let rawDetails = [];
  if (args.detailJson) {
    rawDetails = readJson(args.detailJson);
  } else {
    if (args.noFetch) throw new Error('--no-fetch 를 쓰려면 --detail-json 이 필요합니다.');
    if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN 미설정');
    rawDetails = await runApifyActor({
      actorId: config.actorId || 'trantus/threads-post-scraper',
      input: {
        ...(config.input || {}),
        urls: references.map((ref) => ref.url),
      },
      token: process.env.APIFY_TOKEN,
    });
  }

  const normalized = normalizeDetailItems(rawDetails, references);
  fs.mkdirSync(args.outDir, { recursive: true });
  const rawOutPath = path.join(args.outDir, `threads-reference-raw-${args.date}.json`);
  const detailOutPath = path.join(args.outDir, `threads-reference-detail-${args.date}.json`);
  fs.writeFileSync(rawOutPath, JSON.stringify(rawDetails, null, 2));
  fs.writeFileSync(detailOutPath, JSON.stringify(normalized, null, 2));
  runAnalyzer({ date: args.date, detailPath: detailOutPath, outDir: args.outDir });

  console.log(JSON.stringify({
    raw_output: rawOutPath,
    normalized_detail_output: detailOutPath,
    references: references.length,
    normalized_items: normalized.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
