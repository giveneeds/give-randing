# FOMO Principles

FOMO는 사용할 수 있다. 다만 `망합니다`, `끝입니다`, `무조건 해야 합니다`처럼 싼 공포 문장은 실패로 본다.

우리가 원하는 FOMO는 불안을 파는 것이 아니라, "지금 모르고 지나가면 나중에 후회할 수 있는 변화"를 느끼게 하는 것이다.

FOMO는 문장 템플릿이 아니라 심리 구조다. 생성기는 아래 하위 방식을 주제에 맞게 선택하고, 같은 표현을 반복하지 않는다.

| 방식 | 감정 버튼 | 사용 예시 방향 |
|---|---|---|
| `quiet_gap` | 잘하는 곳은 조용히 바꾸고 있다 | 티 안 나게 바뀐 차이를 보여준다 |
| `delayed_regret` | 지금은 몰라도 나중에 아쉬울 수 있다 | "그때 바꿨어야 했네"가 나오는 상황 |
| `rule_changed` | 예전 방식이 그대로 먹히지 않는다 | 플랫폼/소비자/광고 룰 변화 |
| `insider_move` | 앞서가는 사람들은 다른 걸 먼저 본다 | 내부자처럼 보는 판단 순서 |
| `cost_leak` | 왜 안 되는지 모른 채 돈/시간이 샌다 | 광고비, 대행비, 콘텐츠 시간 낭비 |
| `authority_signal` | 해외/큰 브랜드/권위 있는 쪽이 이미 본다 | 권위 사례는 과장 없이 신호로만 사용 |
| `missed_timing` | 지금은 쉽지만 나중엔 비용이 커진다 | 데이터/리뷰/콘텐츠 누적 격차 |
| `wrong_problem` | 문제를 엉뚱한 곳에서 찾고 있다 | 광고 문제가 아니라 첫 화면 문제 등 |
| `comparison_gap` | 같은 조건인데 결과가 갈린다 | 같은 돈/시간을 쓰는데 문의가 갈림 |

## FOMO 검수 질문

- 이 글은 어떤 불안을 건드리는가?
- 그 불안이 구체적인 장면/돈/시간/화면과 연결되어 있는가?
- "겁주기" 뒤에 판단 기준이나 관찰이 붙어 있는가?
- 같은 FOMO 문장을 반복하지 않았는가?
- 실제 사람이 쓸 법한 말이 첫 3줄 안에 있는가?
- 읽고 나서 "무섭다"보다 "이건 놓치면 안 되겠는데?"가 남는가?

## 조합 규칙

- FOMO는 별도 기둥이 아니라 `content_treatment=fomo_reframe` 또는 `fomo_mechanism`으로 사용한다.
- FOMO는 "쓸 수 있나?"가 아니라 "어떤 강도와 위치로 녹일 것인가"를 판단한다.
- 후보마다 `fomo_intensity=none | subtle | clear`와 `fomo_expression=none | hook_only | body_context | ending_reframe`을 정한다.
- FOMO와 설명 방식은 서로 배타적이지 않다.
- 예: `content_treatment=fomo_reframe`, `fomo_mechanism=rule_changed`, `fomo_intensity=subtle`, `explanation_style=conversational_explainer`, `format_type=short_thread`.
- 뉴스성 소재에서 FOMO를 쓸 때는 "논란이 났으니 조심하세요"로 닫지 않는다. 사람들이 반응한 감정/기억/맥락을 먼저 보여준다.
