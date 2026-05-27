#!/usr/bin/env node
/*
 * Apify Threads 검색 결과를 수집해 기브니즈 Threads audit md 파일로 저장한다.
 *
 * 필요 환경변수:
 * - APIFY_TOKEN
 *
 * 사용:
 * - node scripts/collect-threads-audit-apify.js
 * - node scripts/collect-threads-audit-apify.js --dry-run
 * - node scripts/collect-threads-audit-apify.js --input-json /tmp/apify-items.json
 * - node scripts/collect-threads-audit-apify.js --input-json /tmp/search.json --detail-json /tmp/detail.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_CONFIG = path.join(ROOT, 'config', 'threads-audit.apify.json');
const DEFAULT_PILLARS_CONFIG = path.join(ROOT, 'config', 'content-pillars.json');

function todayKst() {
  return new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
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

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG,
    dryRun: false,
    inputJson: null,
    detailJson: null,
    noDetail: false,
    detailLimit: null,
    date: todayKst(),
    pillars: null,
    pillarConfig: DEFAULT_PILLARS_CONFIG,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--config') args.config = path.resolve(argv[++i]);
    else if (arg === '--input-json') args.inputJson = path.resolve(argv[++i]);
    else if (arg === '--detail-json') args.detailJson = path.resolve(argv[++i]);
    else if (arg === '--no-detail') args.noDetail = true;
    else if (arg === '--detail-limit') args.detailLimit = Number(argv[++i]);
    else if (arg === '--date') args.date = argv[++i];
    else if (arg === '--pillars') args.pillars = argv[++i].split(',').map((x) => x.trim()).filter(Boolean);
    else if (arg === '--pillar-config') args.pillarConfig = path.resolve(argv[++i]);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/collect-threads-audit-apify.js [--dry-run]
  node scripts/collect-threads-audit-apify.js --input-json ./items.json
  node scripts/collect-threads-audit-apify.js --input-json ./items.json --detail-json ./details.json
  node scripts/collect-threads-audit-apify.js --date 2026-05-21
  node scripts/collect-threads-audit-apify.js --pillars do_today,current_observation,trend_plain
  node scripts/collect-threads-audit-apify.js --no-detail
`);
      process.exit(0);
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function applyPillarKeywords(config, args) {
  if (!args.pillars && !fs.existsSync(args.pillarConfig)) return config;
  const pillarConfig = fs.existsSync(args.pillarConfig) ? readJson(args.pillarConfig) : null;
  if (!pillarConfig?.pillars) return config;

  const selected = args.pillars?.length ? args.pillars : (pillarConfig.defaultRotation || []);
  const keywords = unique(selected.flatMap((key) => pillarConfig.pillars[key]?.threadKeywords || []));
  if (keywords.length === 0) return config;

  return {
    ...config,
    input: {
      ...config.input,
      keywords: keywords.slice(0, config.output?.maxKeywords || 3),
    },
    activePillars: selected,
  };
}

function actorIdToPath(actorId) {
  return String(actorId).replace('/', '~');
}

async function runApifyActor({ actorId, input, token, maxItems }) {
  const url = new URL(`https://api.apify.com/v2/acts/${actorIdToPath(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set('token', token);
  if (maxItems) {
    url.searchParams.set('maxItems', String(maxItems));
  }

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

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.trim().replace(/,/g, '').toLowerCase();
  const m = cleaned.match(/^([\d.]+)\s*(천|만|k|m)?$/);
  if (!m) return Number(cleaned) || 0;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return 0;
  const unit = m[2];
  if (unit === '천' || unit === 'k') return Math.round(base * 1000);
  if (unit === '만') return Math.round(base * 10000);
  if (unit === 'm') return Math.round(base * 1000000);
  return base;
}

function textOf(item) {
  return String(firstValue(item, [
    'text',
    'caption',
    'content',
    'text_content',
    'body',
    'postText',
    'post.text',
    'thread.text',
  ]) || '').trim();
}

function normalizeItem(item) {
  const text = textOf(item);
  const likes = toNumber(firstValue(item, ['likes', 'like_count', 'likeCount', 'likesCount', 'metrics.likes', 'engagement.likes']));
  const replies = toNumber(firstValue(item, ['replies', 'reply_count', 'replyCount', 'repliesCount', 'comments', 'commentsCount', 'metrics.replies', 'engagement.replies']));
  const reposts = toNumber(firstValue(item, ['reposts', 'repost_count', 'repostCount', 'repostsCount', 'metrics.reposts', 'engagement.reposts']));
  const quotes = toNumber(firstValue(item, ['quotes', 'quote_count', 'quoteCount', 'quotesCount', 'metrics.quotes', 'engagement.quotes']));
  const shares = toNumber(firstValue(item, ['shares', 'share_count', 'shareCount', 'sharesCount', 'metrics.shares', 'engagement.shares']));
  const views = toNumber(firstValue(item, ['views', 'view_count', 'viewCount', 'viewsCount', 'metrics.views', 'engagement.views']));
  const author = firstValue(item, [
    'author.username',
    'author.userName',
    'author.handle',
    'username',
    'user.username',
    'profile.username',
  ]);
  const url = firstValue(item, ['url', 'postUrl', 'post_url', 'permalink', 'link']);
  const keyword = firstValue(item, ['keyword', 'search_keyword', 'searchKeyword', 'query', 'input.keyword']);
  const createdAt = firstValue(item, ['createdAt', 'created_at', 'timestamp', 'date', 'takenAt']);
  const shareOrRepost = Math.max(reposts, quotes, shares);

  return {
    raw: item,
    text,
    firstTwoLines: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(' / '),
    author: author ? String(author).replace(/^@/, '') : '',
    url: url ? String(url) : '',
    keyword: keyword ? String(keyword) : '',
    createdAt: createdAt ? String(createdAt) : '',
    metrics: { likes, replies, reposts, quotes, shares, views, shareOrRepost },
    detail: null,
  };
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

function normalizeDetailItem(detailItem) {
  const root = detailItem?.root_post || detailItem?.rootPost || detailItem?.post || detailItem?.root || detailItem || {};
  const rootText = textFromAnyPost(root);
  const rootAuthor = authorFromAnyPost(root);
  const rootUrl = urlFromAnyPost(root) || urlFromAnyPost(detailItem);
  const comments = Array.isArray(detailItem?.comments)
    ? detailItem.comments
    : (Array.isArray(detailItem?.replies) ? detailItem.replies : []);
  const flatComments = [];
  for (const entry of comments) {
    if (entry?.comment) flatComments.push(entry.comment);
    else flatComments.push(entry);
    if (Array.isArray(entry?.replies)) flatComments.push(...entry.replies);
  }
  const sameAuthorContinuations = flatComments
    .map((comment) => ({
      author: authorFromAnyPost(comment),
      text: textFromAnyPost(comment),
      url: urlFromAnyPost(comment),
    }))
    .filter((comment) => comment.text && rootAuthor && comment.author === rootAuthor);
  const replySamples = flatComments
    .map((comment) => ({
      author: authorFromAnyPost(comment),
      text: textFromAnyPost(comment),
      url: urlFromAnyPost(comment),
    }))
    .filter((comment) => comment.text)
    .slice(0, 8);

  return {
    source_url: rootUrl,
    root_author: rootAuthor,
    root_text: rootText,
    comments_count: flatComments.length,
    same_author_continuations: sameAuthorContinuations,
    reply_samples: replySamples,
    raw_keys: Object.keys(detailItem || {}),
  };
}

function normalizeDetailItems(rawDetailItems) {
  const arr = Array.isArray(rawDetailItems)
    ? rawDetailItems
    : (rawDetailItems?.items || rawDetailItems?.data?.items || []);
  return arr.map(normalizeDetailItem).filter((item) => item.source_url || item.root_text);
}

function canonicalPostUrl(url) {
  return String(url || '').replace('https://www.threads.net/', 'https://www.threads.com/');
}

function buildDetailMap(detailItems) {
  const map = new Map();
  for (const detail of detailItems) {
    const key = canonicalPostUrl(detail.source_url);
    if (key) map.set(key, detail);
  }
  return map;
}

async function enrichDetails({ filtered, config, args }) {
  const detailConfig = config.detailEnrichment || {};
  if (args.noDetail || detailConfig.enabled === false) {
    return { detailItems: [], detailMap: new Map(), skippedReason: 'detail disabled' };
  }

  const limit = Number.isFinite(args.detailLimit)
    ? args.detailLimit
    : Number(detailConfig.maxItems || 0);
  const urls = unique(filtered.map((item) => item.url).filter(Boolean)).slice(0, limit || 8);
  if (urls.length === 0) {
    return { detailItems: [], detailMap: new Map(), skippedReason: 'no urls' };
  }

  let rawDetails = [];
  if (args.detailJson) {
    rawDetails = readJson(args.detailJson);
  } else {
    if (!process.env.APIFY_TOKEN) {
      return { detailItems: [], detailMap: new Map(), skippedReason: 'APIFY_TOKEN missing for detail enrichment' };
    }
    const actorId = detailConfig.actorId || 'trantus/threads-post-scraper';
    const input = {
      ...(detailConfig.input || {}),
      urls,
    };
    rawDetails = await runApifyActor({
      actorId,
      input,
      token: process.env.APIFY_TOKEN,
    });
  }

  const detailItems = normalizeDetailItems(rawDetails);
  return { detailItems, detailMap: buildDetailMap(detailItems), skippedReason: null, requestedUrls: urls };
}

function mediaCountOf(item) {
  if (Array.isArray(item?.raw?.media_urls)) return item.raw.media_urls.length;
  if (Array.isArray(item?.raw?.mediaUrls)) return item.raw.mediaUrls.length;
  if (Array.isArray(item?.raw?.images)) return item.raw.images.length;
  if (item?.raw?.media_url || item?.raw?.mediaUrl || item?.raw?.image) return 1;
  return 0;
}

function attachSearchContextToDetail(item) {
  if (!item.detail) return null;
  return {
    ...item.detail,
    search_context: {
      author: item.author || item.detail.root_author || '',
      keyword: item.keyword || '',
      url: item.url || item.detail.source_url || '',
      first_two_lines: item.firstTwoLines || '',
      search_text: item.text || '',
      text_chars: item.text?.length || 0,
      media_count: mediaCountOf(item),
      metrics: item.metrics,
      signal_score: signalScore(item),
      inferred_format: inferFormat(item),
      inferred_execution_feel: inferExecutionFeel(item),
      inferred_pain_point: inferPainPoint(item),
      threshold_reasons: item.thresholdReasons || [],
    },
  };
}

function passesThreshold(item, thresholds) {
  const m = item.metrics;
  const reasons = [];
  if (m.likes >= thresholds.minLikes) reasons.push(`좋아요 ${m.likes}`);
  if (m.replies >= thresholds.minReplies) reasons.push(`댓글 ${m.replies}`);
  if (m.views >= thresholds.minViews) reasons.push(`조회 ${m.views}`);
  if (m.shareOrRepost >= thresholds.minShareOrRepost) reasons.push(`공유/리포스트 ${m.shareOrRepost}`);
  return reasons;
}

function signalScore(item) {
  const m = item.metrics;
  return (m.likes * 1) + (m.replies * 3) + (m.views * 0.02) + (m.shareOrRepost * 2.5);
}

function inferFormat(item) {
  const text = item.text;
  if (/^\s*\d+[.)]/m.test(text) || /[①②③④⑤]/.test(text)) return '리스트/체크리스트형';
  if (/(vs|VS|차이|비교)/i.test(text)) return '비교형';
  if (/(어떻게|아는 사람|알려줘|어려|답답|왜)/.test(text)) return '고백/질문형';
  if (/(보지 마세요|하지 마세요|틀린|아니다|절대)/.test(text)) return '반박/역후킹형';
  if (/(사이트|툴|프롬프트|저장|자료|모음)/.test(text)) return '자료저장형';
  return '관점/정보형';
}

function inferExecutionFeel(item) {
  const text = item.text;
  if (/(로그인|클릭|수정|교체|확인|설정|채워|작성|저장)/.test(text)) return '즉시 조작형';
  if (/(체크|진단|확인|비교|봐야|먼저 볼)/.test(text)) return '자기진단형';
  if (/(사이트|툴|프롬프트|저장|모음|리스트)/.test(text)) return '자료저장형';
  return '관점전환형';
}

function inferPainPoint(item) {
  const text = item.text;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines.filter((line) => /(어려|안 와|안오|답답|하락|광고비|대행|팔릴|홍보|문의|순위|어떻게|모르)/.test(line));
  return candidates[0] || '';
}

function escapeCell(value) {
  return String(value || '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .slice(0, 240);
}

function codeBlock(text, maxChars) {
  const clipped = String(text || '').slice(0, maxChars || 1200).replace(/```/g, '` ` `');
  return clipped || '-';
}

function buildMarkdown({ date, config, allItems, filtered, detailSummary }) {
  const thresholds = config.thresholds;
  const searchQueries = config.input.searchQueries || config.input.keywords || [];
  const sortOrder = config.input.sortOrder || config.input.search_filter || '미지정';
  const dateRange = config.input.dateRange || config.input.start_date || '미지정';
  const maxPosts = config.input.maxPosts || config.input.max_posts || '미지정';
  const rows = filtered.map((item, index) => {
    const m = item.metrics;
    const metrics = `좋아요 ${m.likes} / 댓글 ${m.replies} / 조회 ${m.views} / 공유·리포스트 ${m.shareOrRepost}`;
    const detail = item.detail;
    const detailState = detail
      ? `상세 OK / 댓글 ${detail.comments_count} / 연속 ${detail.same_author_continuations.length}`
      : '상세 미확보';
    return `| ${index + 1} | ${escapeCell(item.keyword)} | ${escapeCell(item.author ? `@${item.author}` : '')} | ${escapeCell(item.firstTwoLines)} | ${escapeCell(metrics)} | ${escapeCell(inferFormat(item))} | ${escapeCell(inferPainPoint(item))} | ${escapeCell(inferExecutionFeel(item))} | ${escapeCell(detailState)} | ${escapeCell(item.url)} |`;
  }).join('\n');
  const fullTextChars = config.output?.maxFullTextChars || 1200;
  const fullTextSections = filtered.map((item, index) => {
    const detail = item.detail;
    const detailText = detail?.root_text || item.text;
    const continuations = detail?.same_author_continuations || [];
    const continuationText = continuations.length
      ? continuations.map((c, i) => `### 이어진 작성자 댓글 ${i + 1}\n\n${codeBlock(c.text, fullTextChars)}`).join('\n\n')
      : '같은 작성자 연속글 미확보';
    return `### ${index + 1}. ${item.author ? `@${item.author}` : '(unknown)'} — ${item.url || '-'}

- 검색어: ${item.keyword || '-'}
- 상세 수집: ${detail ? `OK / 댓글 ${detail.comments_count}개 / 같은 작성자 연속 ${continuations.length}개` : '미확보'}
- 이미지/미디어: ${mediaCountOf(item)}개

#### 본문

\`\`\`text
${codeBlock(detailText, fullTextChars)}
\`\`\`

#### 연속 포스트/작성자 댓글

${continuationText}
`;
  }).join('\n\n---\n\n');

  return `# Threads 인기 게시글 패턴 감사 ${date}

본 문서는 Apify \`${config.actorId}\` Actor를 통해 수집한 Threads 검색 결과를 기브니즈 콘텐츠 생성 로직에 맞게 필터링한 감사 기록이다.

## 수집 설정

- 검색 모드: \`${config.input.mode}\`
- 정렬: \`${sortOrder}\`
- 기간: \`${dateRange}\`
- 키워드: ${searchQueries.map((keyword) => `\`${keyword}\``).join(', ')}
- 최대 수집: ${maxPosts}
- 상세 따라가기: ${config.detailEnrichment?.enabled === false ? '비활성' : `활성 (${config.detailEnrichment?.actorId || 'trantus/threads-post-scraper'})`}

## 통과 기준

아래 조건 중 하나 이상을 만족하면 감사 후보로 남긴다.

- 좋아요 ${thresholds.minLikes}개 이상
- 댓글 ${thresholds.minReplies}개 이상
- 조회수 ${thresholds.minViews} 이상
- 공유/리포스트/인용 중 하나가 ${thresholds.minShareOrRepost}개 이상

## 수집 결과 요약

- 원본 수집 수: ${allItems.length}
- 기준 통과 수: ${filtered.length}
- 상세 수집 수: ${detailSummary?.detailItemsCount || 0}
- 상세 수집 스킵/오류: ${detailSummary?.skippedReason || '없음'}

## 기준 통과 게시글

| # | 검색어 | 작성자 | 첫 2줄 | 지표 | 형식 추정 | 페인포인트 추정 | 실행감 | 상세 상태 | URL |
|---|---|---|---|---|---|---|---|---|---|
${rows || '| - | - | - | 기준 통과 게시글 없음 | - | - | - | - | - | - |'}

## 상세 본문 및 연속 구조

${fullTextSections || '상세 본문 없음'}

## 이번 주 분석 메모

- 좋아요가 높은 글과 댓글이 높은 글을 분리해서 본다.
- 좋아요/공유가 높은 글은 대체로 자료저장형일 가능성이 크다.
- 댓글이 높은 글은 고민 고백형, 질문형, 진단 CTA형일 가능성이 크다.
- 기브니즈 상담 전환 목적이면 좋아요보다 댓글/DM 유도형 패턴을 별도 우선순위로 본다.

## 생성 로직 반영 규칙

- \`reader_problem\`은 보고서 문장이 아니라 실제 사장님 말투로 쓴다.
- \`practical_takeaway\`는 즉시 조작형, 자기진단형, 관점전환형, 자료저장형 중 하나로 분류한다.
- 글 목표를 \`comment\`, \`save\`, \`share\`, \`dm\` 중 하나로 먼저 정한다.
- 단계형 글을 기본값으로 두지 않는다. 검색 결과의 실제 형식에 맞춰 고백형/질문형/반박형/자료형을 선택한다.

## 원본 실행 메모

Apify 결과 필드는 Actor 업데이트에 따라 바뀔 수 있으므로, 이 파일의 지표는 \`visible_metrics\`로 취급한다.
`;
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  const config = applyPillarKeywords(readJson(args.config), args);

  if (args.dryRun) {
    const detailLimit = Number.isFinite(args.detailLimit)
      ? args.detailLimit
      : Number(config.detailEnrichment?.maxItems || 8);
    console.log(JSON.stringify({
      actorId: config.actorId,
      input: config.input,
      thresholds: config.thresholds,
      output: config.output,
      activePillars: config.activePillars || null,
      detailEnrichment: {
        ...(config.detailEnrichment || {}),
        effectiveMaxItems: detailLimit,
      },
    }, null, 2));
    return;
  }

  if (!args.inputJson && !process.env.APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN 미설정');
  }

  const rawItems = args.inputJson
    ? readJson(args.inputJson)
    : await runApifyActor({
        actorId: config.actorId,
        input: config.input,
        token: process.env.APIFY_TOKEN,
        maxItems: config.output?.maxItems,
      });

  const normalized = rawItems.map(normalizeItem).filter((item) => item.text || item.url);
  const filtered = normalized
    .map((item) => ({ ...item, thresholdReasons: passesThreshold(item, config.thresholds) }))
    .filter((item) => item.thresholdReasons.length > 0)
    .sort((a, b) => signalScore(b) - signalScore(a))
    .slice(0, config.output?.maxItems || 80);

  let detailResult = { detailItems: [], detailMap: new Map(), skippedReason: null };
  try {
    detailResult = await enrichDetails({ filtered, config, args });
    for (const item of filtered) {
      item.detail = detailResult.detailMap.get(canonicalPostUrl(item.url)) || null;
    }
  } catch (e) {
    detailResult = { detailItems: [], detailMap: new Map(), skippedReason: e.message };
  }

  const markdown = buildMarkdown({
    date: args.date,
    config,
    allItems: normalized,
    filtered,
    detailSummary: {
      detailItemsCount: detailResult.detailItems?.length || 0,
      skippedReason: detailResult.skippedReason,
    },
  });
  const auditDir = path.resolve(ROOT, config.output?.auditDir || 'docs/reference-data');
  fs.mkdirSync(auditDir, { recursive: true });
  const outPath = path.join(auditDir, `threads-popular-post-audit-${args.date}-apify.md`);
  fs.writeFileSync(outPath, markdown);
  let detailOutPath = null;
  if (config.output?.writeDetailJson && detailResult.detailItems?.length) {
    detailOutPath = path.join(auditDir, `threads-popular-post-audit-${args.date}-apify-detail.json`);
    const enrichedDetails = filtered
      .map(attachSearchContextToDetail)
      .filter(Boolean);
    fs.writeFileSync(detailOutPath, JSON.stringify(enrichedDetails.length ? enrichedDetails : detailResult.detailItems, null, 2));
  }

  console.log(JSON.stringify({
    output: outPath,
    detail_output: detailOutPath,
    raw_items: rawItems.length,
    normalized_items: normalized.length,
    filtered_items: filtered.length,
    detail_items: detailResult.detailItems?.length || 0,
    detail_skipped_reason: detailResult.skippedReason || null,
    thresholds: config.thresholds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
