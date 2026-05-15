import type { ExtractedDoc, ClassifierResult } from '../types/index.js';
import { classifyByRules } from './ruleBasedClassifier.js';

// 분류기 인터페이스. LLM 도입 시 동일 인터페이스로 LlmClassifier를 추가하고
// createClassifier 팩토리에 분기만 한 줄 추가하면 워크플로우는 0줄 변경.
export interface Classifier {
  classify(doc: ExtractedDoc): Promise<ClassifierResult>;
}

export type ClassifierKind = 'rule_based' | 'llm';

class RuleBasedClassifier implements Classifier {
  // 룰 기반은 동기지만, 인터페이스는 Promise로 통일 (LLM과 호환).
  async classify(doc: ExtractedDoc): Promise<ClassifierResult> {
    return classifyByRules(doc);
  }
}

export function createClassifier(kind: ClassifierKind = 'rule_based'): Classifier {
  switch (kind) {
    case 'rule_based':
      return new RuleBasedClassifier();
    case 'llm':
      // 향후 LlmClassifier 추가 시 여기에 분기.
      throw new Error('LLM 분류기는 아직 구현되지 않았습니다. rule_based를 사용해 주세요.');
  }
}
