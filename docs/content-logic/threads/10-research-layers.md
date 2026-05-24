# Research Layers

스레드 생성은 단일 검색으로 끝내지 않는다. 뉴스 기사만 모아오면 소재는 빨라지지만 말투, 공감, 실제 쓸모가 얇아지기 쉽다.

## 1차 수집: 주제 후보 풀

목적은 오늘 발행할 만한 주제를 넓게 모으는 것이다.

- 기존 뉴스/웹 수집은 유지한다.
- Reddit/X 비중을 높이기 위해 1차 텔레그램 제안에는 Reddit 후보 1개, X 후보 1개를 별도 보강 후보로 넣는다.
- Reddit/X 후보는 점수가 낮아도 삭제하지 않는다. 반응, 말투, 독자 질문을 보는 샘플로 쓸 수 있다.
- 보고서에는 이 둘을 `소셜 보강 후보`로 표시한다.

## 2차 리서치: 선택 주제의 SNS 반응

사용자가 주제 후보를 고른 뒤 실행한다.

- `runDeepResearch`가 Reddit, X, Threads를 우선 포함해 후킹 패턴과 반응을 본다.
- 통합 검색과 별개로 Reddit 전용, X 전용 검색을 추가한다.
- 목표는 "이 주제가 SNS에서 어떤 말로 반응되는가"와 "어떤 앵글이 자연스러운가"를 찾는 것이다.

## 2.5차 리서치: 추가 자료 보강

2차 리서치가 말투와 반응을 본다면, 2.5차는 본문에 들어갈 근거와 사례를 보강한다.

- `runSupplementalResearch`가 웹 전체에서 최신 근거, 사례, 빠진 맥락을 찾는다.
- `includeDomains: null`을 써서 기본 SNS 도메인 제한을 풀 수 있다.
- `PERPLEXITY_API_KEY`가 있으면 Perplexity Sonar API로 추가 근거를 받는다.
- Perplexity가 없거나 실패해도 Tavily 검색 결과만으로 계속 진행한다.
- 결과는 `evidence_points`, `content_additions`, `missing_context`로 정리한다.

## 3차 리서치: 말투/VOC

후보 생성 직전에 실행한다.

- `runToneResearch`가 Threads/X/Reddit에서 사람들이 쓰는 표현, 질문, 불만, 경계심을 본다.
- 목표는 문장을 베끼는 것이 아니라 AI스러운 말투를 피하고 실제 사람이 쓰는 리듬을 잡는 것이다.
- 결과는 `voice_patterns`, `phrases_to_borrow`, `phrases_to_avoid`, `reader_questions`로 정리한다.

## 후보 생성 후 품질 검수

7개 후보가 만들어진 뒤 한 번 더 검수한다.

- 후보 7개가 서로 겹치면 실패다.
- 기둥 2~3개가 실제로 분산됐는지 본다.
- FOMO가 과격하거나 억지로 붙었는지 본다.
- `single_post`가 500자 미만이면 실패다.
- Q/A 형식, 일반론, 억지 자영업자 팁, 출처 없는 단정은 고친다.
- 검수 결과는 `variant_review.metadata.quality_review`에 남긴다.

## 저장 원칙

- 점수가 낮은 후보도 삭제하지 않는다.
- 추천 후보는 `recommended_variant_id`로 표시할 뿐 최종 선택이 아니다.
- 사용자가 7개를 보고 하나 또는 여러 개를 선택해야 한다.
