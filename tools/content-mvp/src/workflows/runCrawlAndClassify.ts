import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  SeedItem,
  RawDocument,
  ExtractedDoc,
  ProcessedDoc,
  FailureEntry,
  RawIndexEntry,
} from '../types/index.js';
import { PATHS, rawPath, processedPath } from '../lib/paths.js';
import { hashUrl } from '../lib/hash.js';
import { log, warn, error } from '../lib/logger.js';
import { PlaywrightCrawler } from '../crawler/playwrightCrawler.js';
import { extractDocument } from '../extractor/readabilityExtractor.js';
import { createClassifier, type Classifier } from '../classifier/index.js';
import { createSummarizer, type Summarizer } from '../summarizer/index.js';

// 파이프라인 시퀀서. 시드 URL을 받아 수집 → 추출 → 분류 → 요약 → 저장 순으로 진행.
// 시드는 (a) 인자로 직접 전달 (b) data/input/seed-urls.json 둘 중 하나로 받는다.

export interface RunOptions {
  // 인자로 전달되면 이걸 사용, 없으면 seed-urls.json을 읽는다.
  seeds?: SeedItem[];
  classifierKind?: 'rule_based' | 'llm';
  summarizerKind?: 'extractive' | 'llm';
}

export interface RunReport {
  total: number;
  processed: number;
  skippedDuplicate: number;
  blocked: number;
  failed: number;
}

export async function runCrawlAndClassify(options: RunOptions = {}): Promise<RunReport> {
  await ensureDirectories();

  const seeds = options.seeds ?? (await readSeedFile());
  if (seeds.length === 0) {
    warn('init', `시드 URL이 비어 있습니다. ${PATHS.seedUrls} 에 URL을 추가하세요.`);
    return { total: 0, processed: 0, skippedDuplicate: 0, blocked: 0, failed: 0 };
  }

  log('init', `시드 ${seeds.length}건 로드. 파이프라인을 시작합니다.`);

  const classifier = createClassifier(options.classifierKind ?? 'rule_based');
  const summarizer = createSummarizer(options.summarizerKind ?? 'extractive');
  const crawler = new PlaywrightCrawler();
  const rawIndex = await readRawIndex();

  const report: RunReport = {
    total: seeds.length,
    processed: 0,
    skippedDuplicate: 0,
    blocked: 0,
    failed: 0,
  };

  try {
    await crawler.init();
    log('init', 'Chromium 브라우저 컨텍스트 준비 완료.');

    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i]!;
      const progress = `(${i + 1}/${seeds.length})`;
      await processOne(seed, progress, crawler, classifier, summarizer, rawIndex, report);
    }
  } finally {
    await crawler.close();
    await writeRawIndex(rawIndex);
  }

  log(
    'done',
    `처리 ${report.processed} · 중복 skip ${report.skippedDuplicate} · 차단 ${report.blocked} · 실패 ${report.failed} (총 ${report.total})`,
  );
  return report;
}

// ─────────────── 단일 URL 처리 ───────────────

async function processOne(
  seed: SeedItem,
  progress: string,
  crawler: PlaywrightCrawler,
  classifier: Classifier,
  summarizer: Summarizer,
  rawIndex: Map<string, RawIndexEntry>,
  report: RunReport,
): Promise<void> {
  const hash = hashUrl(seed.url);
  const cached = rawIndex.get(hash);

  let raw: RawDocument;

  if (cached) {
    // 이미 크롤한 URL이면 raw 파일을 다시 읽어 추출/요약/분류만 재실행.
    log('crawl', `${progress} 중복 발견, raw 캐시 사용: ${seed.url}`);
    try {
      const cachedRaw = await fs.readFile(rawPath(hash), 'utf-8');
      raw = JSON.parse(cachedRaw) as RawDocument;
      report.skippedDuplicate += 1;
    } catch (err) {
      // 인덱스에는 있는데 파일이 없는 경우 → 다시 크롤.
      warn('crawl', `${progress} 캐시 파일 누락, 재수집: ${seed.url}`);
      rawIndex.delete(hash);
      await processOne(seed, progress, crawler, classifier, summarizer, rawIndex, report);
      return;
    }
  } else {
    log('crawl', `${progress} ${seed.url}`);
    const result = await crawler.fetch(seed.url);
    if (!result.ok) {
      if (result.reason.startsWith('차단 도메인')) {
        warn('crawl', `${progress} 차단 도메인 skip: ${result.reason}`);
        report.blocked += 1;
      } else {
        error('crawl', `${progress} 실패: ${result.reason} (시도 ${result.attempt}회)`);
        report.failed += 1;
      }
      await appendFailure({
        url: seed.url,
        reason: result.reason,
        attempt: result.attempt,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    raw = result.doc;
    await fs.writeFile(rawPath(hash), JSON.stringify(raw, null, 2), 'utf-8');
    rawIndex.set(hash, { url: raw.source_url, fetched_at: raw.fetched_at });
  }

  // ─── 추출 ───
  let extracted: ExtractedDoc;
  try {
    extracted = extractDocument(raw);
    log('extract', `${progress} 본문 ${extracted.extracted_text.length}자 · 헤딩 ${extracted.headings.length}개`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    error('extract', `${progress} 추출 실패: ${reason}`);
    report.failed += 1;
    await appendFailure({
      url: seed.url,
      reason: `extract: ${reason}`,
      attempt: 1,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ─── 분류 ───
  const classification = await classifier.classify(extracted);
  log(
    'classify',
    `${progress} persona=${classification.suggested_persona} · cluster=${classification.suggested_topic_cluster} · confidence=${classification.classification_confidence}`,
  );

  // ─── 요약 ───
  const summary = await summarizer.summarize(extracted, classification);
  log('summarize', `${progress} key_points ${summary.key_points.length}개 생성`);

  // ─── 저장 ───
  const processed: ProcessedDoc = {
    ...extracted,
    ...summary,
    ...classification,
    processed_at: new Date().toISOString(),
  };
  await fs.writeFile(processedPath(hash), JSON.stringify(processed, null, 2), 'utf-8');
  log('save', `${progress} 저장 완료: ${path.relative(PATHS.root, processedPath(hash))}`);
  report.processed += 1;
}

// ─────────────── 파일 I/O 헬퍼 ───────────────

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(PATHS.inputDir, { recursive: true });
  await fs.mkdir(PATHS.rawDir, { recursive: true });
  await fs.mkdir(PATHS.processedDir, { recursive: true });
}

async function readSeedFile(): Promise<SeedItem[]> {
  try {
    const raw = await fs.readFile(PATHS.seedUrls, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      warn('init', `seed-urls.json 형식 오류: 배열이 아닙니다.`);
      return [];
    }
    return parsed
      .map((entry) => normalizeSeed(entry))
      .filter((s): s is SeedItem => s !== null);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    warn('init', `seed-urls.json 읽기 실패: ${reason}`);
    return [];
  }
}

// 시드 항목이 문자열로만 들어와도 SeedItem으로 정규화.
function normalizeSeed(entry: unknown): SeedItem | null {
  if (typeof entry === 'string') return { url: entry };
  if (entry && typeof entry === 'object' && 'url' in entry) {
    const obj = entry as { url: unknown; note?: unknown };
    if (typeof obj.url !== 'string') return null;
    return {
      url: obj.url,
      ...(typeof obj.note === 'string' ? { note: obj.note } : {}),
    };
  }
  return null;
}

async function readRawIndex(): Promise<Map<string, RawIndexEntry>> {
  try {
    const raw = await fs.readFile(PATHS.rawIndex, 'utf-8');
    const obj = JSON.parse(raw) as Record<string, RawIndexEntry>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

async function writeRawIndex(index: Map<string, RawIndexEntry>): Promise<void> {
  const obj: Record<string, RawIndexEntry> = {};
  index.forEach((value, key) => {
    obj[key] = value;
  });
  await fs.writeFile(PATHS.rawIndex, JSON.stringify(obj, null, 2), 'utf-8');
}

async function appendFailure(entry: FailureEntry): Promise<void> {
  await fs.appendFile(PATHS.failures, `${JSON.stringify(entry)}\n`, 'utf-8');
}
