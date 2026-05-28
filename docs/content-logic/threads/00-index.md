# Threads Logic Index

이 디렉터리는 기브니즈 스레드 생성 로직의 canonical source다. 긴 규칙을 한 파일에 몰아넣지 않고, 사람이 읽는 구조와 AI가 참조하는 구조를 같게 맞춘다.

## File Rule

- 한 파일은 하나의 판단 주제만 다룬다.
- 새 원칙을 추가할 때는 가장 가까운 파일에 넣는다.
- 새 범주가 생기면 `10-new-topic.md`처럼 번호가 붙은 파일을 만든다.
- 기존 규칙을 바꾸면 관련 파일 사이의 참조도 같이 갱신한다.
- `docs/threads-content-pattern-harness.md`에는 긴 본문을 추가하지 않는다. 그 파일은 호환성용 인덱스다.

## Reading Order

1. `01-mission-and-output.md`
2. `02-language-and-voc.md`
3. `03-fomo-principles.md`
4. `04-pillars-and-treatments.md`
5. `05-format-length-and-explainer.md`
6. `06-topic-expansion.md`
7. `07-hook-psychology.md`
8. `08-generation-rules.md`
9. `09-logic-circuit.md`
10. `10-research-layers.md`
11. `11-reference-workflow.md`
12. `12-content-mix-and-rhythm.md`

## Decision Model

`content_pillar`는 역할, `content_treatment`는 문법, `fomo_mechanism`은 심리 장치, `explanation_style`은 이해 방식, `format_type`은 분량 구조다.

FOMO와 설명 방식은 서로 배타적이지 않다. FOMO 원리로 호기심을 만들고 대화형 설명으로 쉽게 풀 수 있다.

리서치는 1회성 검색이 아니다. 1차 주제 수집, Reddit/X 해외 주제 발굴, 2차 보강 맥락, 2.5차 추가 자료 보강, 3차 한국 Threads 말투/VOC 조정이 서로 다른 역할로 작동한다.
