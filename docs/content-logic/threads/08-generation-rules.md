# Generation Rules

## 초안 생성 순서

1. 먼저 채널을 판단한다.
   - 기본값은 `threads`다.
   - 매거진 초안 생성은 승인 이후 별도 단계로 미룬다.

2. 주제 후보를 사용자가 하나 이상 고르면 병렬 가지로 확장한다.
   - 사용자가 주제 1개를 고르면 그 주제에서 글 후보 7개를 만든다.
   - 사용자가 주제 2개 이상을 고르면 각 주제별로 별도 세션/드래프트 묶음을 만든다.
   - 이전 후보와 점수 기록은 삭제하지 않는다.

2-1. 선택 주제마다 리서치 계층을 순서대로 보강한다.
   - 2차: Reddit/X/Threads/웹에서 해외 이슈, 보강 맥락, 후킹 포인트.
   - 2.5차: 추가 자료, 근거, 사례, 빠진 맥락.
   - 3차: 한국 Threads 말투, 시작 방식, 피해야 할 AI식 표현. 기존 주차별 Threads 감사 데이터가 있으면 우선 사용한다.

3. 각 주제마다 기둥 후보 2~3개를 먼저 점수화한다.
   - 하나의 기둥으로 성급히 좁히지 않는다.
   - 7개 글 후보는 이 기둥 후보들 안에서 겹치지 않게 배치한다.
   - 기둥 점수화는 최종 선택이 아니라 설계 범위를 잡는 단계다.

4. 각 후보에서 병렬 선택 모듈을 동시에 결정한다.
   - `content_treatment`: 뉴스 코멘터리, 실행 팁, 사례, 관점, FOMO 재구성 등.
   - `fomo_mechanism`: FOMO를 쓸지 말지가 아니라 어떤 강도/위치로 녹일지.
   - `explanation_style`: 장면형, 대화형 설명, 체크리스트, 사례 분해, 자료형 등.
   - `format_type`: 단일글, 짧은 스레드, 자료형 스레드.

5. 7개 후보를 만든다.
   - 후보끼리 관점, pillar, treatment, FOMO 녹이는 방식, 설명 방식, 길이, hook, 결론 방식이 달라야 한다.
   - 같은 말을 형식만 바꿔 반복하면 실패다.
   - FOMO가 맞는 소재면 최소 1개 후보는 `fomo_reframe`으로 만들되, 모든 후보에 `fomo_intensity`와 `fomo_expression`을 기록한다.
   - 새 개념/기술/뉴스면 `conversational_explainer`를 우선 검토한다. `Q. / A.` 형식은 쓰지 않는다.

6. 후보를 점수화한다.
   - 주제 적합도
   - 독자 공감
   - 자연스러움
   - 후보 간 비중복성
   - 형식 적합도
   - 유용성 또는 관점성
   - 브랜드 안전성
   - 내용 밀도
   - 구체성
   - AI스러운 일반론 방지
   - 소비자언어 적합도
   - FOMO 적합도

7. 점수화 뒤 품질 검수 에이전트를 한 번 더 통과시킨다.
   - 7개 후보가 서로 겹치지 않는지 본다.
   - 내용 밀도, 최소 분량, 소비자언어, FOMO 강도, 억지 실무화 여부를 본다.
   - 부족한 후보는 저장 전 같은 variant id 안에서 보강한다.
   - 검수 기록은 `variant_review.metadata.quality_review`에 남긴다.

8. 7개 후보를 모두 사용자에게 전달하고 모두 저장한다.
   - 점수화는 정렬/추천을 위한 것이지 삭제를 위한 것이 아니다.
   - `recommended_variant_id`는 먼저 보면 좋은 후보일 뿐 최종 선택이 아니다.
   - 사용자가 1개 또는 여러 개를 고르면 해당 후보들이 발행/수정 대상으로 이어진다.

## Telegram / Admin Exposure

- 텔레그램 후보 카드에는 7개 글 후보의 기둥, treatment, FOMO, 설명 방식, format, 점수를 노출한다.
- 드래프트 상세 화면에는 `research_context_used.variant_review`를 보여준다.
- `format_decision`에는 왜 이 길이와 포스트 수가 맞는지 남긴다.

## Storage Contract

결과는 단일 문자열이 아니라 배열로 저장한다.

```json
{
  "format_type": "short_thread",
  "recommended_length": 5,
  "posts": [
    { "index": 1, "role": "hook", "body": "" },
    { "index": 2, "role": "context", "body": "" }
  ],
  "research_context_used": {
    "variant_review": {
      "mode": "seven_variant_user_choice",
      "selection_stage": "user_pending",
      "recommended_variant_id": 1,
      "all_variants_preserved": true,
      "variants": []
    }
  }
}
```
