// 콘텐츠 거버넌스·지식베이스 문서 로더.
// docs/ 폴더의 .md 파일을 메모리에 캐시해 LLM 시스템 프롬프트에 주입한다.
// 별도 세션에서 사용자가 합의·정리한 운영 기준이 여기 모이고, 코드는 이 파일을 통해 일관 참조한다.

import fs from 'node:fs';
import path from 'node:path';
import { isPlaceRelatedCluster, isInjectablePersona, normalizePersona } from '@/lib/contentTaxonomy';

const CACHE = new Map();

// LLM 프롬프트 길이 한도. 토큰 비용·latency 와 직접 연결되므로 한 곳에서만 관리.
const MAX_DOC_CHARS = 4000;
const MAX_THREAD_LOGIC_DOC_CHARS = 800;
const MAX_THREAD_BENCHMARK_CHARS = 2600;
const MAX_THREAD_CURATED_REFERENCES_CHARS = 3600;
const MAX_PERSONA_SECTION = 3000;
const THREAD_CURATED_DIR = 'reference-data/threads-curated';
// 실제 발행글 톤 샘플(말투·어미·후킹) 주입용. 분석 노트가 아니라 진짜 본문.
// 루트글 + 연속글 본문을 함께 학습 — 후킹 리듬뿐 아니라 알맹이·FOMO 마감까지.
// 연속글 없는 단일 글은 자연 길이가 짧아 상한이 닿지 않으므로 토큰 영향은 미미.
const MAX_REAL_BODY_SAMPLE_CHARS = 1000;
const REAL_BODY_MIN_LENGTH = 120;

function loadDoc(filename) {
  if (CACHE.has(filename)) return CACHE.get(filename);
  try {
    const fullPath = path.join(process.cwd(), 'docs', filename);
    const content = fs.readFileSync(fullPath, 'utf-8');
    CACHE.set(filename, content);
    return content;
  } catch {
    // 파일 부재(untracked 리소스 등) 도 캐시 — 매 호출마다 ENOENT 비용 발생 방지.
    CACHE.set(filename, '');
    return '';
  }
}

function loadDocDirectory(dirname) {
  const key = `__dir:${dirname}`;
  if (CACHE.has(key)) return CACHE.get(key);

  let docs = [];
  try {
    const dir = path.join(process.cwd(), 'docs', dirname);
    docs = fs.readdirSync(dir)
      .filter((filename) => /^\d{2}-.+\.md$/.test(filename))
      .sort()
      .map((filename) => ({
        filename: `${dirname}/${filename}`,
        content: loadDoc(`${dirname}/${filename}`),
      }))
      .filter((doc) => doc.content);
  } catch {
    docs = [];
  }

  CACHE.set(key, docs);
  return docs;
}

// 플레이스 마케팅 지식베이스 + 거버넌스.
// 토픽 클러스터 place_visibility / review_trust / local_acquisition 관련 글에 주입.
export function getPlaceMarketingKB() {
  return loadDoc('place-marketing-knowledge-base.md');
}

export function getPlaceMarketingGovernance() {
  return loadDoc('place-marketing-content-governance.md');
}

// Threads 콘텐츠 형식 분류 — 스레드 드래프트 생성기에서 사용.
export function getThreadsPatternHarness() {
  const index = loadDoc('threads-content-pattern-harness.md');
  const sections = loadDocDirectory('content-logic/threads')
    .map((doc) => `# ${doc.filename}\n\n${doc.content}`)
    .join('\n\n---\n\n');
  return [index, sections].filter(Boolean).join('\n\n---\n\n');
}

export function getThreadsPatternHarnessBlocks() {
  const blocks = [];
  const index = loadDoc('threads-content-pattern-harness.md');
  if (index) {
    blocks.push({
      title: '스레드 콘텐츠 형식 가이드: index',
      content: index,
    });
  }
  for (const doc of loadDocDirectory('content-logic/threads')) {
    blocks.push({
      title: `스레드 콘텐츠 형식 가이드: ${doc.filename}`,
      content: doc.content,
    });
  }
  return blocks;
}

// 잘 쓴 Threads 발행물의 구성 감각을 누적하는 큐레이션 노트.
// DB 분석값이 아니라 index.json 으로 필요한 카드만 골라 LLM 이 "이런 식으로 구성된다"를 읽게 한다.
export function getThreadsCuratedReferences(opts = {}) {
  const refs = selectThreadsCuratedReferences(opts);
  if (refs.length === 0) return '';
  const chunks = refs.map((ref) => {
    const body = loadDoc(`${THREAD_CURATED_DIR}/${ref.file}`);
    const card = extractCuratedReferenceCard(body, ref.id) || body;
    return [
      `## ${ref.title || ref.id}`,
      `- id: ${ref.id}`,
      `- file: ${ref.file}`,
      ref.notes ? `- selection_note: ${ref.notes}` : null,
      '',
      card.trim(),
    ].filter(Boolean).join('\n');
  });
  return chunks.join('\n\n---\n\n').slice(0, MAX_THREAD_CURATED_REFERENCES_CHARS);
}

// 실제 발행된 Threads 글 본문(root_text)을 톤 샘플로 주입.
// 큐레이션 노트는 "이렇게 구성하라"는 메타 설명이지만, 여기는 진짜 말투·어미·후킹이 담긴 원문이다.
// reference-data/threads-reference-detail-2026-05-26-*.json 들을 읽어 쿼리와 겹치는 본문을 고른다.
function loadThreadsReferenceDetailItems() {
  const key = '__threads_reference_detail_items';
  if (CACHE.has(key)) return CACHE.get(key);
  let items = [];
  try {
    const dir = path.join(process.cwd(), 'docs', 'reference-data');
    const files = fs.readdirSync(dir)
      // 두 종류를 읽는다:
      //   threads-reference-detail-* : 스크래퍼 자동 덤프 (.gitignore — 로컬 전용 임시)
      //   threads-realbody-*         : 손수 고른 영구 톤 샘플 (git 추적 → 실서버에도 배포)
      .filter((f) => /^threads-(reference-detail|realbody)-\d{4}-\d{2}-\d{2}-.+\.json$/.test(f))
      .sort();
    const seen = new Set();
    for (const f of files) {
      // 손수 고른 realbody-* 는 길이 하한 면제 — 짧은 관계형/커뮤니티 글도 의도된 톤 샘플.
      // 스크래퍼 자동 덤프(detail-*)에만 120자 하한 유지 — 조각·잡음 차단.
      const isCurated = f.startsWith('threads-realbody-');
      const minLen = isCurated ? 1 : REAL_BODY_MIN_LENGTH;
      let parsed = [];
      try {
        parsed = JSON.parse(loadDoc(`reference-data/${f}`) || '[]');
      } catch {
        parsed = [];
      }
      if (!Array.isArray(parsed)) continue;
      for (const it of parsed) {
        const rootText = (it?.root_text || '').trim();
        if (rootText.length < minLen) continue;
        if (seen.has(rootText)) continue;
        seen.add(rootText);
        const continuationTexts = Array.isArray(it.same_author_continuations)
          ? it.same_author_continuations.map((c) => (c?.text || '').trim()).filter(Boolean)
          : [];
        // 루트(후킹) + 연속글(알맹이·FOMO 마감) 을 한 흐름으로. 빈 줄로 호흡 구분.
        const fullText = [rootText, ...continuationTexts].join('\n\n');
        // tone_meta: 톤 샘플 각각에 수동 라벨링 — variant 별 톤 매칭에 사용.
        // 필드: hook_pattern, engagement_intent, rhythm(short|mid|long), register(ban|jon|mixed), structure_template_affinity(배열)
        items.push({
          rootText,
          fullText,
          author: it.root_author || '',
          continuations: continuationTexts.length,
          tone_meta: (it.tone_meta && typeof it.tone_meta === 'object') ? it.tone_meta : null,
          topic_label: it.reference_context?.topic || null,
        });
      }
    }
  } catch {
    items = [];
  }
  CACHE.set(key, items);
  return items;
}

/**
 * @param {{
 *   queryText?: string,
 *   maxSamples?: number,
 *   preferSingle?: boolean,
 *   variantHint?: { hook_pattern?: string, engagement_intent?: string, structure_template?: string } | null,
 *   excludeRootTexts?: string[],  // 이미 다른 variant 가 받은 샘플 제외해 다양성 강제.
 *   debug?: boolean,
 * }} args
 * @returns {string|{block:string, picks:Array<{rootText:string,score:number,tone_meta:object|null,topic_label:string|null}>}}
 *   debug=true 면 picks 메타도 함께 반환 — 어느 샘플이 골랐는지 검수용.
 */
export function getThreadsRealBodySamples({
  queryText,
  maxSamples = 3,
  preferSingle = true,
  variantHint = null,
  excludeRootTexts = [],
  debug = false,
} = {}) {
  const items = loadThreadsReferenceDetailItems();
  if (items.length === 0) return debug ? { block: '', picks: [] } : '';
  const excludeSet = new Set(excludeRootTexts || []);
  const queryTokens = tokenizeReferenceQuery(queryText || '');
  const scored = items.map((it) => {
    if (excludeSet.has(it.rootText)) return { it, score: -Infinity, breakdown: null };
    // variantHint 모드(per-variant 톤 매칭)에서는 *손수 라벨링된 realbody-* 만* 후보.
    // 스크래퍼 자동 덤프(detail-*)는 tone_meta 가 없어 톤 흉내 자료로는 부적합 — 토큰 매칭이
    // 높아도 톤 다양성 강제 흐름에서 제외. variantHint 없는 호출자(예전 buildKnowledgeContext)
    // 는 영향 없음.
    if (variantHint && !it.tone_meta) return { it, score: -Infinity, breakdown: null };
    // 본문 전체(루트+연속글) 기준으로 매칭 — 알맹이 키워드까지 관련도에 반영.
    const itemTokens = tokenizeReferenceQuery(it.fullText || it.rootText);
    let tokenScore = 0;
    for (const token of queryTokens) {
      if (itemTokens.has(token)) tokenScore += 1;
    }
    // 단일 발행글(연속 스레드 0개)에 약간의 가산점 — 톤 샘플은 한 호흡 글이 깔끔하다.
    const singleBonus = (preferSingle && it.continuations === 0) ? 0.5 : 0;
    // variantHint 매칭 — tone_meta 가 있으면 hook·intent·structure_template 일치 가산.
    // 같은 hook 인 샘플 (+2) 이 toptoken 한 샘플보다 우선되도록 큰 가중치.
    let hintScore = 0;
    if (variantHint && it.tone_meta) {
      if (variantHint.hook_pattern && it.tone_meta.hook_pattern === variantHint.hook_pattern) hintScore += 2;
      if (variantHint.engagement_intent && it.tone_meta.engagement_intent === variantHint.engagement_intent) hintScore += 1.5;
      if (variantHint.structure_template && Array.isArray(it.tone_meta.structure_template_affinity)
          && it.tone_meta.structure_template_affinity.includes(variantHint.structure_template)) hintScore += 1;
    }
    const score = tokenScore + singleBonus + hintScore;
    return { it, score, breakdown: { tokenScore, singleBonus, hintScore } };
  });
  scored.sort((a, b) => b.score - a.score);
  // 점수 -Infinity (excluded) 는 자르고, 그 뒤 maxSamples 만큼.
  const top = scored.filter((s) => Number.isFinite(s.score)).slice(0, Math.max(1, maxSamples));
  if (top.length === 0) return debug ? { block: '', picks: [] } : '';
  const block = top
    .map((entry, i) => `예시 ${i + 1} (실제 발행글):\n${(entry.it.fullText || entry.it.rootText).slice(0, MAX_REAL_BODY_SAMPLE_CHARS)}\n`)
    .join('\n');
  if (!debug) return block;
  const picks = top.map((entry) => ({
    rootText: entry.it.rootText,
    score: entry.score,
    tone_meta: entry.it.tone_meta || null,
    topic_label: entry.it.topic_label || null,
    breakdown: entry.breakdown,
  }));
  return { block, picks };
}

// 타겟 페르소나 프로필 — 톤·예시·문제 정의 일관성 확보용.
export function getContentPersonas() {
  return loadDoc('content-personas.md');
}

// AI 말투 회귀 예시 — Writer 의 기본값(존댓말 일관·분석조·일반화 결론) 을 깨기 위한 BAD 비교군.
// realbody(GOOD) 와 짝으로 sys prompt 에 박아 Writer 가 *내가 쓰던 톤이 BAD 임* 을 인식하게 한다.
// 1~2개 무작위로 픽 — 너무 많이 보여주면 오히려 길어진다.
export function getThreadsBadExamples({ maxSamples = 1 } = {}) {
  const raw = loadDoc('reference-data/threads-bad-examples.json');
  if (!raw) return [];
  let parsed = [];
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x) => x && typeof x === 'object' && typeof x.body === 'string' && x.body.trim())
    .slice(0, Math.max(1, maxSamples))
    .map((x) => ({
      label: typeof x.label === 'string' ? x.label : '',
      body: x.body.trim(),
      diagnosis: typeof x.diagnosis === 'string' ? x.diagnosis : '',
      metrics: (x.metrics && typeof x.metrics === 'object') ? x.metrics : null,
    }));
}

// Threads 인기 게시글 감사 (수동 관찰 기록) — 후킹 패턴 학습 자료.
// reference-data/threads-popular-post-audit-YYYY-MM-DD.md 패턴의 가장 최신 파일을 자동 선택.
// 파일이 없으면 빈 문자열(매번 디스크 스캔 방지하려고 결과 자체를 캐시).
const LATEST_AUDIT_KEY = '__latest_threads_audit';
const LATEST_AUDIT_INFO_KEY = '__latest_threads_audit_info';
const LATEST_BENCHMARK_KEY = '__latest_threads_benchmark';
const LATEST_BENCHMARK_INFO_KEY = '__latest_threads_benchmark_info';
export function getThreadsAudit() {
  if (CACHE.has(LATEST_AUDIT_KEY)) return CACHE.get(LATEST_AUDIT_KEY);
  const info = getThreadsAuditInfo();
  const body = info?.body || '';
  CACHE.set(LATEST_AUDIT_KEY, body);
  return body;
}

export function getThreadsAuditInfo() {
  if (CACHE.has(LATEST_AUDIT_INFO_KEY)) return CACHE.get(LATEST_AUDIT_INFO_KEY);
  let body = '';
  let filename = null;
  let auditDate = null;
  try {
    const dir = path.join(process.cwd(), 'docs', 'reference-data');
    const files = fs.readdirSync(dir)
      .filter((f) => /^threads-popular-post-audit-.*\.md$/.test(f))
      .sort();
    if (files.length > 0) {
      filename = files[files.length - 1];
      body = loadDoc(`reference-data/${filename}`);
      const match = filename.match(/threads-popular-post-audit-(\d{4}-\d{2}-\d{2})/);
      auditDate = match?.[1] || null;
    }
  } catch {
    // 디렉토리 자체가 없거나 권한 문제 — 빈 문자열 반환.
  }
  const info = { body, filename, audit_date: auditDate };
  CACHE.set(LATEST_AUDIT_INFO_KEY, info);
  return info;
}

export function getThreadsBenchmark() {
  if (CACHE.has(LATEST_BENCHMARK_KEY)) return CACHE.get(LATEST_BENCHMARK_KEY);
  const info = getThreadsBenchmarkInfo();
  const body = info?.body || '';
  CACHE.set(LATEST_BENCHMARK_KEY, body);
  return body;
}

export function getThreadsBenchmarkInfo() {
  if (CACHE.has(LATEST_BENCHMARK_INFO_KEY)) return CACHE.get(LATEST_BENCHMARK_INFO_KEY);
  let body = '';
  let filename = null;
  let benchmarkDate = null;
  try {
    const dir = path.join(process.cwd(), 'docs', 'reference-data');
    const files = fs.readdirSync(dir)
      .filter((f) => /^threads-benchmark-\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?\.md$/i.test(f))
      .sort();
    if (files.length > 0) {
      filename = files[files.length - 1];
      body = loadDoc(`reference-data/${filename}`);
      const match = filename.match(/threads-benchmark-(\d{4}-\d{2}-\d{2})/);
      benchmarkDate = match?.[1] || null;
    }
  } catch {
    // reference-data 가 아직 없을 수 있다.
  }
  const info = { body, filename, benchmark_date: benchmarkDate };
  CACHE.set(LATEST_BENCHMARK_INFO_KEY, info);
  return info;
}

/**
 * topic_cluster · channel · persona 조합에 따라 LLM 에 주입할 지식 블록을 합쳐 반환.
 *
 * @param {{
 *   topicCluster?: string,
 *   channel?: 'threads'|'blog'|'magazine'|'consult',
 *   persona?: 'general'|'unknown',
 *   includeAudit?: boolean,
 * }} args
 * @returns {string} system prompt 에 들어갈 추가 블록
 */
export function buildKnowledgeContext({
  topicCluster,
  channel,
  persona,
  includeAudit,
  contentPillar,
  contentTreatment,
  fomoMechanism,
  referenceQueryText,
} = {}) {
  const blocks = [];

  if (isPlaceRelatedCluster(topicCluster)) {
    const kb = getPlaceMarketingKB();
    const gov = getPlaceMarketingGovernance();
    if (kb) blocks.push(`[플레이스 마케팅 지식베이스]\n${clip(kb)}`);
    if (gov) blocks.push(`[채널별 표현 거버넌스]\n${clip(gov)}`);
  }

  if (channel === 'threads') {
    const harnessBlocks = getThreadsPatternHarnessBlocks();
    harnessBlocks.forEach((doc) => {
      blocks.push(`[${doc.title}]\n${clip(doc.content, MAX_THREAD_LOGIC_DOC_CHARS)}`);
    });
    if (includeAudit) {
      // 실제 발행글 톤 샘플은 *per-variant* 로 주입(convertItemToThreadDraft 에서 variant 마다 다른 샘플).
      // 여기서는 더 이상 일괄 주입하지 않음. 검수성 향상 + 같은 샘플이 7 variant 에 똑같이 들어가는 문제 해소.
      const curated = getThreadsCuratedReferences({
        topicCluster,
        contentPillar,
        contentTreatment,
        fomoMechanism,
        queryText: referenceQueryText,
      });
      if (curated) blocks.push(`[잘 쓴 Threads 발행 레퍼런스 노트]\n${clip(curated, MAX_THREAD_CURATED_REFERENCES_CHARS)}`);
      const audit = getThreadsAudit();
      if (audit) blocks.push(`[Threads 인기 게시글 관찰 기록]\n${clip(audit)}`);
      const benchmark = getThreadsBenchmark();
      if (benchmark) blocks.push(`[Threads 레퍼런스 구조 벤치마크]\n${clip(benchmark, MAX_THREAD_BENCHMARK_CHARS)}`);
    }
  }

  const normalizedPersona = normalizePersona(persona);
  if (isInjectablePersona(normalizedPersona)) {
    const personas = getContentPersonas();
    if (personas) {
      const section = extractPersonaSection(personas, normalizedPersona) || personas.slice(0, MAX_PERSONA_SECTION);
      blocks.push(`[타겟 페르소나 프로필]\n${section}`);
    }
  }

  return blocks.join('\n\n---\n\n');
}

function clip(text, max = MAX_DOC_CHARS) {
  return (text || '').slice(0, max);
}

function selectThreadsCuratedReferences({
  topicCluster,
  contentPillar,
  contentTreatment,
  fomoMechanism,
  queryText,
  maxReferences = 5,
} = {}) {
  const index = loadThreadsCuratedIndex();
  if (index.length === 0) return [];
  const queryTokens = tokenizeReferenceQuery([
    topicCluster,
    contentPillar,
    contentTreatment,
    fomoMechanism,
    queryText,
  ].filter(Boolean).join(' '));
  const scored = index
    .map((ref) => ({
      ref,
      score: scoreCuratedReference(ref, {
        topicCluster,
        contentPillar,
        contentTreatment,
        fomoMechanism,
        queryTokens,
      }),
    }))
    .sort((a, b) => b.score - a.score || (b.ref.priority || 0) - (a.ref.priority || 0));
  const selected = scored
    .filter((entry) => entry.score > 0)
    .slice(0, Math.max(1, Math.min(8, maxReferences)))
    .map((entry) => entry.ref);
  if (selected.length > 0) return selected;
  return index
    .slice()
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, Math.max(1, Math.min(3, maxReferences)));
}

function loadThreadsCuratedIndex() {
  const key = '__threads_curated_index';
  if (CACHE.has(key)) return CACHE.get(key);
  let rows = [];
  try {
    const raw = loadDoc(`${THREAD_CURATED_DIR}/index.json`);
    const parsed = JSON.parse(raw || '[]');
    rows = Array.isArray(parsed)
      ? parsed.filter((row) => row?.id && row?.file)
      : [];
  } catch {
    rows = [];
  }
  CACHE.set(key, rows);
  return rows;
}

function scoreCuratedReference(ref, { topicCluster, contentPillar, contentTreatment, fomoMechanism, queryTokens }) {
  let score = 0;
  if (contentPillar && arrayIncludes(ref.pillars, contentPillar)) score += 8;
  if (contentTreatment && arrayIncludes(ref.treatments, contentTreatment)) score += 5;
  if (fomoMechanism && arrayIncludes(ref.fomo, fomoMechanism)) score += 4;
  if (topicCluster && tokenMatches(ref.topics, topicCluster)) score += 3;

  const fields = [
    ...(ref.topics || []),
    ...(ref.keywords || []),
    ...(ref.patterns || []),
    ref.title,
    ref.notes,
  ];
  const refTokens = tokenizeReferenceQuery(fields.filter(Boolean).join(' '));
  for (const token of queryTokens) {
    if (refTokens.has(token)) score += 1;
  }
  score += Math.min(3, Math.max(0, Number(ref.priority || 0) / 50));
  return Math.round(score * 100) / 100;
}

function arrayIncludes(arr, value) {
  return Array.isArray(arr) && arr.map((x) => String(x).toLowerCase()).includes(String(value).toLowerCase());
}

function tokenMatches(arr, value) {
  if (!Array.isArray(arr) || !value) return false;
  const needle = String(value).toLowerCase();
  return arr.some((entry) => {
    const haystack = String(entry).toLowerCase();
    return haystack.includes(needle) || needle.includes(haystack);
  });
}

function tokenizeReferenceQuery(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_#.-]+/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .slice(0, 80),
  );
}

function extractCuratedReferenceCard(body, refId) {
  if (!body || !refId) return '';
  const escaped = String(refId).replace(/^ref-/i, 'REF-').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'm');
  const match = body.match(re);
  return match ? match[0] : '';
}

// content-personas.md 에서 특정 페르소나 섹션만 정규식으로 추출.
// 헤더 패턴: "## <순번>. <persona_key> — ..." 다음 "## " 이전까지.
// 미래에 'general' 같은 라벨이 다른 헤더에 우연히 포함되는 사고를 막기 위해 \b 단어 경계 사용.
function extractPersonaSection(fullText, persona) {
  if (!fullText || !persona) return null;
  const escaped = persona.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+\\d+\\.\\s+${escaped}\\b[^\\n]*$([\\s\\S]*?)(?=^##\\s|\\Z)`, 'm');
  const match = fullText.match(re);
  if (!match) return null;
  return match[0].slice(0, MAX_PERSONA_SECTION);
}
