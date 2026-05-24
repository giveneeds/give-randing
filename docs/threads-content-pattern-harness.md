# Threads Content Pattern Harness

이 파일은 기존 참조 경로를 유지하기 위한 짧은 인덱스다. 실제 운영 규칙은 `docs/content-logic/threads/` 아래 주제별 파일에 나눠 보관한다.

새 규칙을 추가할 때는 이 파일에 긴 본문을 붙이지 않는다. 반드시 아래 구조 중 맞는 파일에 추가하고, 새 주제가 생기면 번호가 붙은 새 파일을 만든다.

## Canonical Structure

| 파일 | 역할 |
|---|---|
| `docs/content-logic/threads/00-index.md` | 전체 목차, 파일 분리 원칙 |
| `docs/content-logic/threads/01-mission-and-output.md` | 채널 목표, 좋은 초안 기준, 출력 계약 |
| `docs/content-logic/threads/02-language-and-voc.md` | 현장어, 소비자언어, 금지 표현 |
| `docs/content-logic/threads/03-fomo-principles.md` | FOMO 원리, 하위 장치, 검수 질문 |
| `docs/content-logic/threads/04-pillars-and-treatments.md` | 콘텐츠 기둥, 처리 방식, 운영 비중 |
| `docs/content-logic/threads/05-format-length-and-explainer.md` | 글 형식, 길이, 대화형 설명 전개 |
| `docs/content-logic/threads/06-topic-expansion.md` | 주제별 전개 방식 |
| `docs/content-logic/threads/07-hook-psychology.md` | 후킹 심리 패턴 |
| `docs/content-logic/threads/08-generation-rules.md` | 초안 생성 단계, 텔레그램/저장 계약 |
| `docs/content-logic/threads/09-logic-circuit.md` | 전기회로도식 작동 구조 |
| `docs/content-logic/threads/10-research-layers.md` | 해외 주제 발굴, 1차/2차/2.5차/3차 리서치와 품질 검수 |

## Mandatory Loading Rule

스레드 생성 로직은 이 인덱스만 읽으면 안 된다. `docs/content-logic/threads/*.md` 파일을 번호순으로 모두 읽어야 한다.

## Core Decision Order

1. 1차 수집에서 뉴스/웹 후보와 Reddit/X 해외 주제 후보를 함께 만든다.
2. 사용자가 주제를 고르면 2차 해외/소셜 맥락 리서치, 2.5차 추가 자료 리서치, 3차 한국 Threads 말투 조정을 실행한다.
3. `content_pillar` 후보 2~3개로 글의 역할 범위를 잡는다.
4. `content_treatment`로 소재를 푸는 문법을 정한다.
5. `fomo_mechanism`과 `fomo_expression`으로 FOMO를 어디에 어떻게 녹일지 정한다.
6. `explanation_style`, `format_type`, `recommended_length`로 설명 방식과 분량을 정한다.
7. 7개 후보를 만들고 품질 검수한 뒤 모두 저장한다. 추천은 하되 최종 선택은 사용자가 한다.

## Inspect

- 시각 회로: `docs/content-logic/threads/09-logic-circuit.md`
- 리서치 계층: `docs/content-logic/threads/10-research-layers.md`
- 생성 프롬프트: `lib/agent/convertItemToThreadDraft.js`
- 로더: `lib/knowledge/loader.js`
