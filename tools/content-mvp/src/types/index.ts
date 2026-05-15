// 파이프라인 전 구간이 공유하는 스키마. 여기를 SSOT로 두고 다른 모듈은 이 타입만 참조한다.
// LLM 도입 시에도 이 파일의 타입은 그대로 유지되어야 한다 (인터페이스 안정성).

export type Persona = 'restaurant_owner' | 'clinic_owner' | 'unknown';

export type RestaurantCluster =
  | 'place_visibility'
  | 'review_trust'
  | 'ad_efficiency'
  | 'menu_offer'
  | 'local_retention';

export type ClinicCluster =
  | 'place_visibility'
  | 'review_trust'
  | 'ad_efficiency'
  | 'service_page'
  | 'local_acquisition';

export type TopicCluster = RestaurantCluster | ClinicCluster | 'unclassified';

// 시드 URL 한 줄.
export interface SeedItem {
  url: string;
  note?: string;
}

// 크롤러가 만드는 1차 산출물 — HTML 원본 + 식별 메타.
export interface RawDocument {
  source_url: string;
  domain: string;
  raw_html: string;
  fetched_at: string; // ISO8601 (+09:00)
}

// 추출기가 RawDocument에서 정제해서 만드는 구조.
export interface ExtractedDoc extends RawDocument {
  title: string;
  extracted_text: string;
  headings: string[]; // h1~h3 텍스트 (순서 보존)
  meta_description: string | null;
  published_at: string | null; // ISO 또는 YYYY-MM-DD
}

// 요약기 출력 — Summarizer 인터페이스의 반환 타입.
export interface SummaryFields {
  one_line_summary: string;
  key_points: string[]; // 3~5개
  why_it_matters: string | null;
}

// 분류기가 어떤 키워드를 어디서 매칭했는지 디버깅용으로 남긴다.
export interface MatchedKeyword {
  keyword: string;
  where: 'title' | 'h1' | 'h2' | 'body';
  count: number;
}

// 분류기 출력 — Classifier 인터페이스의 반환 타입.
export interface ClassifierResult {
  suggested_persona: Persona;
  suggested_topic_cluster: TopicCluster;
  classification_confidence: number; // 0~1
  matched_keywords: MatchedKeyword[];
}

// data/processed/{hash}.json 에 저장되는 최종 산출물.
export interface ProcessedDoc extends ExtractedDoc, SummaryFields, ClassifierResult {
  processed_at: string;
}

// 실패 로그 한 줄 (data/raw/failures.jsonl).
export interface FailureEntry {
  url: string;
  reason: string;
  attempt: number;
  timestamp: string;
}

// data/raw/_index.json 의 한 엔트리.
export interface RawIndexEntry {
  url: string;
  fetched_at: string;
}
