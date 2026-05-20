// 콘텐츠 거버넌스·지식베이스 문서 로더.
// docs/ 폴더의 .md 파일을 메모리에 캐시해 LLM 시스템 프롬프트에 주입한다.
// 별도 세션에서 사용자가 합의·정리한 운영 기준이 여기 모이고, 코드는 이 파일을 통해 일관 참조한다.

import fs from 'node:fs';
import path from 'node:path';

const CACHE = new Map();

function loadDoc(filename) {
  if (CACHE.has(filename)) return CACHE.get(filename);
  try {
    const fullPath = path.join(process.cwd(), 'docs', filename);
    const content = fs.readFileSync(fullPath, 'utf-8');
    CACHE.set(filename, content);
    return content;
  } catch {
    return '';
  }
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
  return loadDoc('threads-content-pattern-harness.md');
}

/**
 * topic_cluster · channel 조합에 따라 LLM 에 주입할 지식 블록을 합쳐 반환.
 * 길이 제한을 위해 각 문서는 앞부분 4000자로 컷.
 *
 * @param {{ topicCluster?: string, channel?: 'threads'|'blog'|'magazine'|'consult' }} args
 * @returns {string} system prompt 에 들어갈 추가 블록
 */
export function buildKnowledgeContext({ topicCluster, channel } = {}) {
  const blocks = [];

  const placeRelated = ['place_visibility', 'review_trust', 'local_acquisition', 'local_retention'].includes(topicCluster);
  if (placeRelated) {
    const kb = getPlaceMarketingKB();
    const gov = getPlaceMarketingGovernance();
    if (kb) blocks.push(`[플레이스 마케팅 지식베이스]\n${kb.slice(0, 4000)}`);
    if (gov) blocks.push(`[채널별 표현 거버넌스]\n${gov.slice(0, 4000)}`);
  }

  if (channel === 'threads') {
    const harness = getThreadsPatternHarness();
    if (harness) blocks.push(`[스레드 콘텐츠 형식 가이드]\n${harness.slice(0, 4000)}`);
  }

  return blocks.join('\n\n---\n\n');
}
