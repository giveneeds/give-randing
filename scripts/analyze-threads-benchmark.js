#!/usr/bin/env node
/*
 * Apify 상세 수집 결과를 Threads 원고 품질 기준으로 변환한다.
 *
 * 사용:
 * - node scripts/analyze-threads-benchmark.js
 * - node scripts/analyze-threads-benchmark.js --date 2026-05-26
 * - node scripts/analyze-threads-benchmark.js --detail-json ./docs/reference-data/...detail.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DIR = path.join(ROOT, 'docs', 'reference-data');

function todayKst() {
  return new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    date: todayKst(),
    detailJson: null,
    outDir: DEFAULT_DIR,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--date') args.date = argv[++i];
    else if (arg === '--detail-json') args.detailJson = path.resolve(argv[++i]);
    else if (arg === '--out-dir') args.outDir = path.resolve(argv[++i]);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/analyze-threads-benchmark.js
  node scripts/analyze-threads-benchmark.js --date 2026-05-26
  node scripts/analyze-threads-benchmark.js --detail-json ./docs/reference-data/threads-popular-post-audit-2026-05-26-apify-detail.json
`);
      process.exit(0);
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findLatestDetailJson(dir) {
  const files = fs.readdirSync(dir)
    .filter((filename) => /^threads-popular-post-audit-\d{4}-\d{2}-\d{2}-apify-detail\.json$/.test(filename))
    .sort();
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}

function canonicalUrl(url) {
  return String(url || '').replace('https://www.threads.net/', 'https://www.threads.com/');
}

function loadAuditMetaForDate(dir, date) {
  const file = path.join(dir, `threads-popular-post-audit-${date}-apify.md`);
  if (!fs.existsSync(file)) return new Map();
  const body = fs.readFileSync(file, 'utf8');
  const map = new Map();
  const sectionRe = /^###\s+\d+\.\s+(.+?)\s+—\s+(https?:\/\/\S+)[\s\S]*?(?=^---$|^###\s+\d+\.|(?![\s\S]))/gm;
  let match;
  while ((match = sectionRe.exec(body))) {
    const section = match[0];
    const author = match[1].replace(/^@/, '').trim();
    const url = match[2].trim();
    const keyword = section.match(/- 검색어:\s*(.+)/)?.[1]?.trim() || '';
    const mediaCount = Number(section.match(/- 이미지\/미디어:\s*(\d+)개/)?.[1] || 0);
    map.set(canonicalUrl(url), {
      author,
      keyword,
      url,
      media_count: mediaCount,
    });
  }
  return map;
}

function percentile(nums, p) {
  const values = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const idx = Math.min(values.length - 1, Math.max(0, Math.ceil((p / 100) * values.length) - 1));
  return values[idx];
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function textChars(text) {
  return compactText(text).length;
}

function isMostlyCasualReply(text) {
  const t = compactText(text);
  if (!t) return true;
  if (t.length >= 80) return false;
  return /(반가워|맞팔|스하|감사|고마|ㅋㅋ|ㅎㅎ|😍|❤️|🙌|👋|좋아요|팔로우|구경)/.test(t);
}

function isMeaningfulContinuation(entry) {
  const text = compactText(entry?.text);
  if (!text) return false;
  if (isMostlyCasualReply(text)) return false;
  if (textChars(text) >= 120) return true;
  if (/^(\d+[/.)]|[①②③④⑤⑥⑦⑧⑨⑩]|[가-힣A-Za-z0-9 ]{2,24}\s*[:：])/.test(text)) return true;
  if (/(이유|방법|예시|정리|체크|단계|핵심|문제|자동화|데이터|연동|비교|사례)/.test(text) && textChars(text) >= 60) return true;
  return false;
}

function inferHookType(text) {
  const t = compactText(text);
  if (/(댓글|DM|자료|정리본|남겨)/.test(t)) return 'comment_dm_resource';
  if (/(모르면|놓치|후회|뒤처|안 하면|이미|차이)/.test(t)) return 'fomo_gap';
  if (/(하지 마세요|아닙니다|틀렸|버리세요|그만)/.test(t)) return 'contrarian_warning';
  if (/(\d+\s*가지|^\d+[.)]|[①②③④⑤])/.test(t)) return 'numbered_list';
  if (/(왜|어떻게|뭐가|아세요|\?)/.test(t)) return 'question';
  return 'statement';
}

function inferFomoDevices(text) {
  const t = compactText(text);
  const devices = [];
  if (/(이미|앞서|잘하는|먼저)/.test(t)) devices.push('insider_move');
  if (/(모르면|뒤처|밀릴|격차)/.test(t)) devices.push('knowledge_gap');
  if (/(놓치|후회|지금 안|늦)/.test(t)) devices.push('delayed_regret');
  if (/(돈|광고비|비용|새고|낭비)/.test(t)) devices.push('cost_leak');
  if (/(바뀌|달라졌|끝났|시대)/.test(t)) devices.push('rule_changed');
  return [...new Set(devices)];
}

function inferEngagementPattern(detail, metrics) {
  const root = detail.root_text || '';
  if (/(댓글|DM|남겨|보내)/.test(root)) return 'comment_or_dm_conversion';
  if ((metrics?.shareOrRepost || metrics?.shares || 0) >= 40) return 'share_pattern';
  if ((metrics?.likes || 0) >= 50 && (metrics?.comments || metrics?.replies || 0) < 20) return 'like_pattern';
  if ((metrics?.replies || metrics?.comments || detail.comments_count || 0) >= 30) return 'comment_pattern';
  return 'mixed';
}

function normalizeMetrics(searchContext) {
  const metrics = searchContext?.metrics || {};
  return {
    likes: Number(metrics.likes || 0),
    replies: Number(metrics.replies || metrics.comments || 0),
    views: Number(metrics.views || 0),
    shareOrRepost: Number(metrics.shareOrRepost || metrics.shares || metrics.reposts || metrics.quotes || 0),
  };
}

function analyzeItem(detail, index, auditMeta = new Map()) {
  const meta = auditMeta.get(canonicalUrl(detail.source_url)) || {};
  const search = {
    ...meta,
    ...(detail.search_context || {}),
  };
  const rootText = compactText(detail.root_text || search.search_text || '');
  const rawContinuations = Array.isArray(detail.same_author_continuations)
    ? detail.same_author_continuations
    : [];
  const meaningfulContinuations = rawContinuations.filter(isMeaningfulContinuation);
  const continuationChars = meaningfulContinuations.map((entry) => textChars(entry.text));
  const rootChars = textChars(rootText);
  const totalTextChars = rootChars + continuationChars.reduce((sum, n) => sum + n, 0);
  const mediaCount = Number(search.media_count || 0);
  const metrics = normalizeMetrics(search);
  const imageCardDependent = mediaCount >= 3 && totalTextChars < 500;

  return {
    index: index + 1,
    author: search.author || detail.root_author || '',
    url: search.url || detail.source_url || '',
    keyword: search.keyword || '',
    media_count: mediaCount,
    root_text_chars: rootChars,
    comments_count: Number(detail.comments_count || 0),
    same_author_continuations_raw: rawContinuations.length,
    same_author_continuations_meaningful: meaningfulContinuations.length,
    continuation_char_counts: continuationChars,
    observed_post_count: 1 + meaningfulContinuations.length,
    total_text_chars: totalTextChars,
    hook_type: inferHookType(rootText),
    fomo_devices: inferFomoDevices(`${rootText}\n${meaningfulContinuations.map((c) => c.text).join('\n')}`),
    engagement_pattern: inferEngagementPattern(detail, metrics),
    image_card_dependent: imageCardDependent,
    benchmark_use: imageCardDependent ? 'limited_without_ocr' : (totalTextChars >= 500 ? 'usable_text_structure' : 'weak_text_reference'),
    root_text_preview: rootText.slice(0, 180),
    meaningful_continuation_previews: meaningfulContinuations.slice(0, 5).map((entry) => compactText(entry.text).slice(0, 180)),
    metrics,
  };
}

function buildBenchmark({ items, sourceFile, date }) {
  const detailFollowVerified = items.some((item) => item.comments_count > 0 || item.same_author_continuations_raw > 0);
  const rawContinuationVerified = items.some((item) => item.same_author_continuations_raw > 0);
  const structuredContinuationVerified = items.some((item) => item.same_author_continuations_meaningful > 0);
  const usableTextItems = items.filter((item) => item.benchmark_use === 'usable_text_structure');
  const weakTextItems = items.filter((item) => item.benchmark_use === 'weak_text_reference');
  const mediaDependentItems = items.filter((item) => item.benchmark_use === 'limited_without_ocr');
  const totalChars = usableTextItems.map((item) => item.total_text_chars);
  const rootChars = items.map((item) => item.root_text_chars);
  const observedPostCounts = usableTextItems.map((item) => item.observed_post_count);

  return {
    date,
    source_detail_file: sourceFile,
    verification: {
      detail_follow_verified: detailFollowVerified,
      raw_same_author_continuation_verified: rawContinuationVerified,
      structured_info_thread_verified: structuredContinuationVerified,
      verdict: structuredContinuationVerified
        ? '상세 actor가 의미 있는 같은 작성자 연속글까지 수집한 사례가 있다.'
        : '상세 actor는 댓글/같은 작성자 댓글을 수집했지만, 이번 표본에서는 정보형 1/n 연속글 수집이 확정되지 않았다.',
      limitation: mediaDependentItems.length
        ? '이미지 카드형 게시물은 OCR이 없으면 카드 안 정보를 품질 기준으로 쓸 수 없다.'
        : '',
    },
    sample_counts: {
      total: items.length,
      usable_text_structure: usableTextItems.length,
      weak_text_reference: weakTextItems.length,
      limited_without_ocr: mediaDependentItems.length,
    },
    observed_benchmark: {
      root_chars_p50: percentile(rootChars, 50),
      root_chars_p75: percentile(rootChars, 75),
      usable_total_chars_p50: percentile(totalChars, 50),
      usable_total_chars_p75: percentile(totalChars, 75),
      usable_observed_post_count_p50: percentile(observedPostCounts, 50),
      hook_types: countBy(items, 'hook_type'),
      engagement_patterns: countBy(items, 'engagement_pattern'),
      fomo_devices: countFlat(items.flatMap((item) => item.fomo_devices || [])),
    },
    generation_quality_gate: {
      editorial_min_single_post_chars: 500,
      info_or_explainer_min_total_chars: 800,
      info_or_explainer_max_total_chars: 5000,
      require_rewrite_when: [
        '정보형/해설형인데 정보 단위가 3개 미만이다.',
        '이미지 카드형 레퍼런스를 따라가면서 텍스트 설명을 비워둔다.',
        '첫 포스트만 강하고 후속 설명에서 기준/예시/맥락이 빠진다.',
        '레퍼런스보다 짧은 것이 아니라, 독자가 이해할 재료 자체가 부족하다.',
      ],
      caution: '이번 benchmark는 실제 Threads 구조를 참고하되, OCR 없는 이미지 카드 텍스트는 기준에서 제외한다.',
    },
    items,
  };
}

function countBy(items, key) {
  return countFlat(items.map((item) => item[key]).filter(Boolean));
}

function countFlat(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function tableRows(items) {
  return items.map((item) => `| ${item.index} | ${escapeCell(item.author ? `@${item.author}` : '')} | ${item.media_count} | ${item.root_text_chars} | ${item.same_author_continuations_raw} | ${item.same_author_continuations_meaningful} | ${item.total_text_chars} | ${item.hook_type} | ${item.engagement_pattern} | ${item.benchmark_use} |`).join('\n');
}

function escapeCell(value) {
  return String(value || '').replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').slice(0, 240);
}

function buildMarkdown(benchmark) {
  const v = benchmark.verification;
  const b = benchmark.observed_benchmark;
  const sample = benchmark.sample_counts;
  const itemNotes = benchmark.items.map((item) => `### ${item.index}. ${item.author ? `@${item.author}` : '(unknown)'}

- URL: ${item.url || '-'}
- 판정: ${item.benchmark_use}
- Hook: ${item.hook_type}
- FOMO 장치: ${item.fomo_devices.length ? item.fomo_devices.join(', ') : '뚜렷하지 않음'}
- 첫 문장/본문 미리보기: ${item.root_text_preview || '-'}
${item.meaningful_continuation_previews.length ? `- 의미 있는 후속글 예시: ${item.meaningful_continuation_previews.join(' / ')}` : '- 의미 있는 후속글 예시: 없음'}
`).join('\n');

  return `# Threads 레퍼런스 구조 벤치마크 ${benchmark.date}

Apify 상세 수집 결과를 원고 품질 기준으로 쓰기 위해 구조만 분석한 문서다. 주제/내용을 그대로 베끼는 용도가 아니라, 실제 발행 Threads가 어느 정도의 밀도와 구조를 갖는지 판단하는 기준으로 쓴다.

## 검증 결론

- 상세 actor 댓글/후속 수집: ${v.detail_follow_verified ? '확인됨' : '미확인'}
- 같은 작성자 후속 댓글 수집: ${v.raw_same_author_continuation_verified ? '확인됨' : '미확인'}
- 정보형 1/n 연속글 수집: ${v.structured_info_thread_verified ? '확인됨' : '이번 표본에서는 미확정'}
- 결론: ${v.verdict}
- 한계: ${v.limitation || '특이 한계 없음'}

## 표본 구성

- 전체 표본: ${sample.total}
- 텍스트 구조 기준으로 사용 가능: ${sample.usable_text_structure}
- 텍스트 기준으로 약함: ${sample.weak_text_reference}
- 이미지 카드 의존으로 OCR 전까지 제한: ${sample.limited_without_ocr}

## 관찰 수치

- 루트 본문 글자 수 p50/p75: ${b.root_chars_p50 ?? '-'} / ${b.root_chars_p75 ?? '-'}
- 사용 가능 텍스트 총 글자 수 p50/p75: ${b.usable_total_chars_p50 ?? '-'} / ${b.usable_total_chars_p75 ?? '-'}
- 사용 가능 표본의 관찰 포스트 수 p50: ${b.usable_observed_post_count_p50 ?? '-'}
- Hook 유형: ${JSON.stringify(b.hook_types)}
- 참여 패턴: ${JSON.stringify(b.engagement_patterns)}
- FOMO 장치: ${JSON.stringify(b.fomo_devices)}

## 표본별 구조

| # | 작성자 | 미디어 | 루트 글자 | 원시 후속 | 의미 후속 | 총 텍스트 | Hook | 참여 패턴 | benchmark 사용 |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
${tableRows(benchmark.items) || '| - | - | - | - | - | - | - | - | - | - |'}

## 생성 품질 기준 반영

- single_post 는 최소 ${benchmark.generation_quality_gate.editorial_min_single_post_chars}자 이상으로 쓴다.
- 정보형/해설형/뉴스 코멘터리형은 독자 이해에 필요한 맥락이 있으면 ${benchmark.generation_quality_gate.info_or_explainer_min_total_chars}~${benchmark.generation_quality_gate.info_or_explainer_max_total_chars}자까지 허용한다.
- 이미지 카드형 레퍼런스의 짧은 캡션은 텍스트 원고의 낮은 기준으로 삼지 않는다. 카드 안 텍스트 OCR이 없으면 오히려 본문이 설명을 보강해야 한다.
- 후속 포스트가 있다면 각 포스트는 hook, context, example, criterion, action, ending 중 하나의 역할을 가져야 한다.
- 아래 상황이면 재작성 또는 quality_gate_failed 로 본다:
${benchmark.generation_quality_gate.require_rewrite_when.map((line) => `  - ${line}`).join('\n')}

## 표본 메모

${itemNotes}
`;
}

function main() {
  const args = parseArgs(process.argv);
  const detailJson = args.detailJson || findLatestDetailJson(args.outDir);
  if (!detailJson) throw new Error('상세 JSON 파일을 찾을 수 없습니다.');
  const raw = readJson(detailJson);
  const details = Array.isArray(raw) ? raw : (raw.items || raw.data?.items || []);
  const auditMeta = loadAuditMetaForDate(args.outDir, args.date);
  const items = details.map((detail, index) => analyzeItem(detail, index, auditMeta));
  const benchmark = buildBenchmark({
    items,
    sourceFile: path.relative(ROOT, detailJson),
    date: args.date,
  });

  fs.mkdirSync(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `threads-benchmark-${args.date}.json`);
  const mdPath = path.join(args.outDir, `threads-benchmark-${args.date}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(benchmark, null, 2));
  fs.writeFileSync(mdPath, buildMarkdown(benchmark));
  console.log(JSON.stringify({
    benchmark_json: jsonPath,
    benchmark_md: mdPath,
    verification: benchmark.verification,
    sample_counts: benchmark.sample_counts,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
