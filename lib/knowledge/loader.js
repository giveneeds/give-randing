// 콘텐츠 거버넌스·지식베이스 문서 로더.
// docs/ 폴더의 .md 파일을 메모리에 캐시해 LLM 시스템 프롬프트에 주입한다.
// 별도 세션에서 사용자가 합의·정리한 운영 기준이 여기 모이고, 코드는 이 파일을 통해 일관 참조한다.

import fs from 'node:fs';
import path from 'node:path';
import { isPlaceRelatedCluster, isInjectablePersona } from '@/lib/contentTaxonomy';

const CACHE = new Map();

// LLM 프롬프트 길이 한도. 토큰 비용·latency 와 직접 연결되므로 한 곳에서만 관리.
const MAX_DOC_CHARS = 4000;
const MAX_THREAD_LOGIC_DOC_CHARS = 2800;
const MAX_PERSONA_SECTION = 3000;

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

// 타겟 페르소나 프로필 — 톤·예시·문제 정의 일관성 확보용.
export function getContentPersonas() {
  return loadDoc('content-personas.md');
}

// Threads 인기 게시글 감사 (수동 관찰 기록) — 후킹 패턴 학습 자료.
// reference-data/threads-popular-post-audit-YYYY-MM-DD.md 패턴의 가장 최신 파일을 자동 선택.
// 파일이 없으면 빈 문자열(매번 디스크 스캔 방지하려고 결과 자체를 캐시).
const LATEST_AUDIT_KEY = '__latest_threads_audit';
export function getThreadsAudit() {
  if (CACHE.has(LATEST_AUDIT_KEY)) return CACHE.get(LATEST_AUDIT_KEY);
  let body = '';
  try {
    const dir = path.join(process.cwd(), 'docs', 'reference-data');
    const files = fs.readdirSync(dir)
      .filter((f) => /^threads-popular-post-audit-.*\.md$/.test(f))
      .sort();
    if (files.length > 0) {
      body = loadDoc(`reference-data/${files[files.length - 1]}`);
    }
  } catch {
    // 디렉토리 자체가 없거나 권한 문제 — 빈 문자열 반환.
  }
  CACHE.set(LATEST_AUDIT_KEY, body);
  return body;
}

/**
 * topic_cluster · channel · persona 조합에 따라 LLM 에 주입할 지식 블록을 합쳐 반환.
 *
 * @param {{
 *   topicCluster?: string,
 *   channel?: 'threads'|'blog'|'magazine'|'consult',
 *   persona?: 'restaurant_owner'|'clinic_owner'|'brand_operator'|'marketer'|'small_brand_owner'|'general_reader'|'general'|'unknown',
 *   includeAudit?: boolean,
 * }} args
 * @returns {string} system prompt 에 들어갈 추가 블록
 */
export function buildKnowledgeContext({ topicCluster, channel, persona, includeAudit } = {}) {
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
      const audit = getThreadsAudit();
      if (audit) blocks.push(`[Threads 인기 게시글 관찰 기록]\n${clip(audit)}`);
    }
  }

  if (isInjectablePersona(persona)) {
    const personas = getContentPersonas();
    if (personas) {
      const section = extractPersonaSection(personas, persona) || personas.slice(0, MAX_PERSONA_SECTION);
      blocks.push(`[타겟 페르소나 프로필]\n${section}`);
    }
  }

  return blocks.join('\n\n---\n\n');
}

function clip(text, max = MAX_DOC_CHARS) {
  return (text || '').slice(0, max);
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
