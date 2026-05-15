import type {
  ExtractedDoc,
  ClassifierResult,
  SummaryFields,
} from '../types/index.js';
import {
  CLUSTER_DICTIONARY,
  PERSONA_LABELS,
  WHY_IT_MATTERS_MIN_CONFIDENCE,
} from '../classifier/keywordDictionary.js';

// LLM 없이 한국어 문서에서 의미 있는 요약 필드를 만들어내는 휴리스틱 구현.
// stub이 아닌 실제 구현 — meta/og/본문/헤딩을 우선순위에 따라 조합한다.

const ONE_LINE_MAX_LEN = 110;
const KEY_POINTS_MIN = 3;
const KEY_POINTS_MAX = 5;

// 헤딩에서 "목차"·"관련 글" 류 노이즈를 거른다.
const HEADING_NOISE = ['목차', '관련 글', '관련글', '함께 보기', '추천', '댓글', '광고'];

// 한국어 종결어미 + 문장부호 기준으로 본문을 문장 단위로 분리.
// 약어/숫자에 의한 오분할은 너무 짧은 문장을 머지해서 보정.
const SENTENCE_SPLIT = /(?<=[.!?])\s+|(?<=다\.|요\.|까\.|니다\.|이다\.)\s+/g;
const MIN_SENTENCE_LEN = 20;

export function summarizeExtractive(
  doc: ExtractedDoc,
  classification: ClassifierResult,
): SummaryFields {
  const sentences = splitSentences(doc.extracted_text);
  return {
    one_line_summary: buildOneLine(doc, sentences),
    key_points: buildKeyPoints(doc, sentences),
    why_it_matters: buildWhyItMatters(doc, classification),
  };
}

// ─────────────── one_line_summary ───────────────

function buildOneLine(doc: ExtractedDoc, sentences: string[]): string {
  // 1. meta_description이 30~150자면 그대로 채택.
  const meta = doc.meta_description?.trim();
  if (meta && meta.length >= 30 && meta.length <= 150) {
    return truncate(meta, ONE_LINE_MAX_LEN);
  }

  // 2. 본문 첫 문장. 너무 짧으면 두 번째 문장과 합침.
  if (sentences.length > 0) {
    let candidate = sentences[0]!;
    if (candidate.length < 50 && sentences[1]) {
      candidate = `${candidate} ${sentences[1]}`;
    }
    return truncate(candidate, ONE_LINE_MAX_LEN);
  }

  // 3. 본문도 없으면 title을 그대로 한 줄 요약으로 폴백.
  if (doc.title) return truncate(doc.title, ONE_LINE_MAX_LEN);

  return '요약을 생성할 본문이 부족함';
}

// ─────────────── key_points ───────────────

function buildKeyPoints(doc: ExtractedDoc, sentences: string[]): string[] {
  const fromHeadings = filterHeadings(doc.headings);

  // 헤딩이 충분하면 그것만 사용 (가장 신뢰도 높은 요약 신호).
  if (fromHeadings.length >= KEY_POINTS_MIN) {
    return fromHeadings.slice(0, KEY_POINTS_MAX);
  }

  // 부족하면 본문 상위 문장으로 보강.
  const supplemental = pickTopSentences(sentences, doc.title);
  const combined = dedupe([...fromHeadings, ...supplemental]);

  if (combined.length >= KEY_POINTS_MIN) {
    return combined.slice(0, KEY_POINTS_MAX);
  }

  // 그래도 부족하면 있는 만큼만 반환. 빈 배열 방지를 위해 최소 한 줄은 보장.
  if (combined.length > 0) return combined;
  return [doc.title || '요약 포인트를 추출할 수 없음'];
}

function filterHeadings(headings: string[]): string[] {
  return headings.filter((h) => {
    if (h.length < 10) return false;
    return !HEADING_NOISE.some((noise) => h.includes(noise));
  });
}

// 문장 점수 = 길이정규화(50자 기준) × (1 + 매칭키워드 카운트).
// 매칭 키워드는 title에 등장하는 단어들로 간이 매칭.
function pickTopSentences(sentences: string[], title: string): string[] {
  const titleKeywords = extractTitleKeywords(title);
  const scored = sentences
    .filter((s) => s.length >= MIN_SENTENCE_LEN && s.length <= 200)
    .map((s) => {
      const lengthScore = Math.min(s.length / 50, 2);
      const keywordHits = titleKeywords.reduce(
        (sum, kw) => sum + (s.includes(kw) ? 1 : 0),
        0,
      );
      return { sentence: s, score: lengthScore * (1 + keywordHits) };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, KEY_POINTS_MAX).map((x) => x.sentence);
}

// 제목에서 의미 있는 단어를 뽑는다. 한글 2자 이상, 영문 3자 이상.
function extractTitleKeywords(title: string): string[] {
  if (!title) return [];
  const tokens = title.split(/[\s,·\-—:|()\[\]]+/);
  return tokens.filter((t) => /^[가-힣]{2,}$/.test(t) || /^[a-zA-Z]{3,}$/.test(t));
}

// ─────────────── why_it_matters ───────────────

function buildWhyItMatters(
  doc: ExtractedDoc,
  classification: ClassifierResult,
): string | null {
  // confidence 미달이면 가짜 인사이트를 만들지 않고 null.
  if (classification.classification_confidence < WHY_IT_MATTERS_MIN_CONFIDENCE) {
    return null;
  }
  if (classification.suggested_topic_cluster === 'unclassified') return null;
  if (classification.suggested_persona === 'unknown') return null;

  const dictEntry = CLUSTER_DICTIONARY.find(
    (e) =>
      e.persona === classification.suggested_persona &&
      e.cluster === classification.suggested_topic_cluster,
  );
  if (!dictEntry) return null;

  const personaLabel = PERSONA_LABELS[classification.suggested_persona];
  const topKeyword = pickTopKeyword(classification, doc.title);

  if (!topKeyword) return null;

  return `${personaLabel}에게 ${dictEntry.cluster_phrase} 관점으로, 특히 '${topKeyword}' 측면에서 참고할 만함.`;
}

// 매칭된 키워드 중 가장 비중 높은 것을 고른다 (가중치 = 위치 × 카운트).
function pickTopKeyword(classification: ClassifierResult, title: string): string | null {
  if (classification.matched_keywords.length === 0) return null;

  // title에 등장한 키워드가 있으면 우선.
  const inTitle = classification.matched_keywords.find(
    (k) => k.where === 'title' && title.includes(k.keyword),
  );
  if (inTitle) return inTitle.keyword;

  // 그 외에는 등장 횟수 × 위치 가중치 합산이 가장 큰 키워드.
  const locationWeight: Record<typeof classification.matched_keywords[number]['where'], number> = {
    title: 3,
    h1: 2,
    h2: 2,
    body: 1,
  };
  const aggregated = new Map<string, number>();
  for (const m of classification.matched_keywords) {
    const weighted = m.count * locationWeight[m.where];
    aggregated.set(m.keyword, (aggregated.get(m.keyword) ?? 0) + weighted);
  }
  let bestKeyword: string | null = null;
  let bestScore = -1;
  aggregated.forEach((score, keyword) => {
    if (score > bestScore) {
      bestScore = score;
      bestKeyword = keyword;
    }
  });
  return bestKeyword;
}

// ─────────────── 공통 유틸 ───────────────

function splitSentences(text: string): string[] {
  if (!text) return [];
  const raw = text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);

  // 너무 짧은 토큰(약어 "KT", "3.5%" 등으로 인한 오분할)은 다음 문장과 머지.
  const merged: string[] = [];
  for (const part of raw) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.length < MIN_SENTENCE_LEN) {
      merged[merged.length - 1] = `${last} ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
