import type {
  ExtractedDoc,
  ClassifierResult,
  MatchedKeyword,
  Persona,
  TopicCluster,
} from '../types/index.js';
import {
  CLUSTER_DICTIONARY,
  CONFIDENCE_SATURATION,
  MIN_CLUSTER_SCORE,
  PERSONA_DIFF_THRESHOLD,
  PERSONA_SIGNALS,
  type ClusterDictionaryEntry,
} from './keywordDictionary.js';

// 위치별 가중치. title이 가장 강하고 body가 가장 약하다.
const LOCATION_WEIGHT: Record<MatchedKeyword['where'], number> = {
  title: 3,
  h1: 2,
  h2: 2,
  body: 1,
};

// 키워드 등급별 가중치.
const PRIMARY_WEIGHT = 3;
const SECONDARY_WEIGHT = 1;

// 추출된 문서를 받아 페르소나·클러스터를 추정한다.
// LLM 없이 카운트 + 가중치만 사용. 결정성 보장.
export function classifyByRules(doc: ExtractedDoc): ClassifierResult {
  const buckets = bucketize(doc);

  // 1) 페르소나 추정
  const persona = detectPersona(buckets);

  // 2) 페르소나가 unknown이면 클러스터 분류는 의미가 없으므로 unclassified.
  if (persona === 'unknown') {
    return {
      suggested_persona: persona,
      suggested_topic_cluster: 'unclassified',
      classification_confidence: 0,
      matched_keywords: [],
    };
  }

  // 3) 해당 페르소나의 클러스터 사전만 채점.
  const entries = CLUSTER_DICTIONARY.filter((e) => e.persona === persona);
  const scored = entries.map((entry) => scoreCluster(entry, buckets));

  // 4) 최고 점수 클러스터 선정. 임계치 미달이면 unclassified.
  const top = scored.reduce(
    (best, current) => (current.score > best.score ? current : best),
    { entry: entries[0]!, score: 0, matched: [] as MatchedKeyword[] },
  );

  if (top.score < MIN_CLUSTER_SCORE) {
    return {
      suggested_persona: persona,
      suggested_topic_cluster: 'unclassified',
      classification_confidence: 0,
      matched_keywords: top.matched,
    };
  }

  return {
    suggested_persona: persona,
    suggested_topic_cluster: top.entry.cluster as TopicCluster,
    classification_confidence: round2(top.score / (top.score + CONFIDENCE_SATURATION)),
    matched_keywords: top.matched,
  };
}

// ─────────────── 내부 ───────────────

interface PositionBuckets {
  title: string;
  h1: string;
  h2: string;
  body: string;
}

// 위치별 텍스트 묶음을 한 번만 만들어 둔다 (모든 키워드/클러스터가 재사용).
function bucketize(doc: ExtractedDoc): PositionBuckets {
  const h1 = doc.headings.slice(0, 1).join(' ');
  const h2 = doc.headings.slice(1).join(' ');
  return {
    title: doc.title,
    h1,
    h2,
    body: doc.extracted_text,
  };
}

function detectPersona(buckets: PositionBuckets): Persona {
  const haystack = [buckets.title, buckets.h1, buckets.h2, buckets.body].join(' ');
  const restaurantCount = countAny(haystack, PERSONA_SIGNALS.restaurant_owner);
  const clinicCount = countAny(haystack, PERSONA_SIGNALS.clinic_owner);

  const diff = Math.abs(restaurantCount - clinicCount);
  if (restaurantCount === 0 && clinicCount === 0) return 'unknown';
  if (diff < PERSONA_DIFF_THRESHOLD) return 'unknown';
  return restaurantCount > clinicCount ? 'restaurant_owner' : 'clinic_owner';
}

interface ClusterScore {
  entry: ClusterDictionaryEntry;
  score: number;
  matched: MatchedKeyword[];
}

function scoreCluster(entry: ClusterDictionaryEntry, buckets: PositionBuckets): ClusterScore {
  const matched: MatchedKeyword[] = [];
  let score = 0;

  const keywordTiers: Array<{ words: string[]; weight: number }> = [
    { words: entry.primary, weight: PRIMARY_WEIGHT },
    { words: entry.secondary, weight: SECONDARY_WEIGHT },
  ];

  for (const tier of keywordTiers) {
    for (const word of tier.words) {
      for (const where of Object.keys(LOCATION_WEIGHT) as MatchedKeyword['where'][]) {
        const text = buckets[where];
        const count = countOccurrences(text, word);
        if (count === 0) continue;
        score += tier.weight * LOCATION_WEIGHT[where] * count;
        matched.push({ keyword: word, where, count });
      }
    }
  }

  return { entry, score, matched };
}

// 단일 단어 등장 횟수 (대소문자 무시, 한글 단어는 그대로 매칭).
function countOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = h.indexOf(n, idx)) !== -1) {
    count += 1;
    idx += n.length;
  }
  return count;
}

// 여러 단어 중 하나라도 등장하면 카운트 += 등장횟수.
function countAny(haystack: string, words: string[]): number {
  return words.reduce((sum, w) => sum + countOccurrences(haystack, w), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
