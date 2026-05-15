import type {
  ExtractedDoc,
  ClassifierResult,
  SummaryFields,
} from '../types/index.js';
import { summarizeExtractive } from './extractiveSummarizer.js';

// 요약기 인터페이스. classification을 함께 받는 이유는 why_it_matters 생성 시
// 페르소나·클러스터 컨텍스트가 필요하기 때문. LLM 구현체도 동일한 컨텍스트로 더 좋은 요약을 만들 수 있다.
export interface Summarizer {
  summarize(doc: ExtractedDoc, classification: ClassifierResult): Promise<SummaryFields>;
}

export type SummarizerKind = 'extractive' | 'llm';

class ExtractiveSummarizer implements Summarizer {
  // 휴리스틱은 동기지만, 인터페이스는 Promise로 통일 (LLM과 호환).
  async summarize(doc: ExtractedDoc, classification: ClassifierResult): Promise<SummaryFields> {
    return summarizeExtractive(doc, classification);
  }
}

export function createSummarizer(kind: SummarizerKind = 'extractive'): Summarizer {
  switch (kind) {
    case 'extractive':
      return new ExtractiveSummarizer();
    case 'llm':
      // 향후 LlmSummarizer 추가 시 여기에 분기.
      throw new Error('LLM 요약기는 아직 구현되지 않았습니다. extractive를 사용해 주세요.');
  }
}
