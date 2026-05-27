# Mission And Output

기브니즈의 1차 채널은 Threads다. 매거진/블로그는 잠시 후순위로 두고, 스레드에서 반응 가능성이 있는 주제와 형식을 먼저 안정화한다.

좋은 스레드 초안의 기준:
- 리서치 자료를 보여주는 글이 아니라, Threads에서 이미 반응이 검증된 구조를 빌려 "읽고 싶게" 만든다.
- 첫 포스트는 짧고 강해야 한다. 긴 정보글도 1번에서 다 설명하지 않고, 궁금증/FOMO/오해 깨기를 만든 뒤 2번부터 정보를 푼다.
- 독자가 "내 가게/브랜드에도 적용해볼 수 있겠다"고 느낀다.
- 전문가용 일반론보다 작은 사업자와 마케팅 실무자가 이해할 수 있는 말로 쓴다.
- 단일글인지 연결글인지 먼저 판단한다.
- 연결글은 긴 글을 쪼갠 것이 아니라, 각 게시글이 독립된 역할을 가져야 한다.
- 1번 포스트는 hook, 2번 이후는 context/example/criterion/action처럼 정보 단위를 나눠야 한다.
- 리드마그넷은 꼭 필요할 때만 붙인다. 억지 체크리스트 PDF는 실패로 본다.

## Threads-First Topic Logic

주제는 단순히 뉴스/검색 결과에서 고르지 않는다. 먼저 잘 나온 Threads 발행물을 읽고 "이런 식으로 구성되는구나"를 인식한 뒤, 그 감각에 맞게 우리 콘텐츠 기둥과 리서치 주제를 결합한다.

현재 단계에서는 별도 "구조 분석 DB"를 만들지 않는다. 레퍼런스 원문과 관찰 기록을 `docs/reference-data`와 Threads 감사 문서로 보관하고, 생성 시 프롬프트에 넣어 LLM이 구성 감각을 읽게 한다.

읽을 때 보는 것:
- 첫 글이 짧게 멈춰 세우는지, 아니면 처음부터 설명을 다 해버리는지
- 첫 글에 궁금증, FOMO, 오해 깨기, 자료 약속, 실제 질문이 있는지
- 2번 이후 포스트가 배경, 사례, 기준, 예시, 체크리스트, 관점처럼 역할을 나누는지
- 왜 저장/공유/댓글이 생길 만한지
- 우리 기둥 중 어디에 얹으면 자연스러운지
- 우리 주제로 쓰려면 어떤 추가 근거/사례/숫자/반론이 필요한지

즉 흐름은 다음이다.

Threads 발행 레퍼런스 읽기
→ 구성 감각을 우리 콘텐츠 기둥에 맞춰 해석
→ 발행 가능한 주제/첫 포스트 콘셉트 후보 7개
→ 사용자가 주제 선택
→ 선택 주제에 대해 2차 리서치와 말투/구조 참고
→ 첫 포스트는 짧고 강하게, 후속 포스트는 정보 밀도 있게 작성

## Reference Capture Schema

Threads 게시글을 볼 때는 본문만 저장하지 않는다. 생성 로직에 필요한 판단 근거를 함께 기록한다.

```json
{
  "source_url": "",
  "author_handle": "",
  "observed_at": "2026-05-19",
  "query": "AI 활용",
  "topic": "AI 활용 사례 큐레이션",
  "audience_guess": "general | unknown",
  "visible_metrics": {
    "views": 160000,
    "likes": 1600,
    "replies": 74,
    "reposts": 690,
    "shares": 780
  },
  "format_type": "single_post | short_thread | resource_thread | mega_thread",
  "series_length": 5,
  "opening_pattern": "curiosity_gap | pain_confession | resource_promise | misconception_break | proof_story | question | anxiety_reframe",
  "content_pattern": "list | checklist | case_breakdown | tool_roundup | before_after | opinion | mini_guide",
  "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning | direct_sales",
  "engagement_driver": ["save_value", "share_value", "identity", "curiosity", "free_resource", "proof", "anxiety_relief"],
  "why_it_worked": "",
  "giveneeds_relevance": "high | medium | low",
  "how_to_adapt": "",
  "avoid_reason": ""
}
```

## Draft Output Contract

```json
{
  "channel": "threads",
  "content_pillar": "cost_before_spend | do_today | current_observation | trend_plain | content_showcase",
  "content_treatment": "news_commentary | practical_tip | checklist | explainer | case_note | opinion | fomo_reframe",
  "fomo_mechanism": "quiet_gap | delayed_regret | rule_changed | insider_move | cost_leak | authority_signal | missed_timing | wrong_problem | comparison_gap | none",
  "explanation_style": "scene | conversational_explainer | checklist | case_breakdown | resource_list | opinion_note | comparison",
  "format_type": "single_post | short_thread | resource_thread",
  "recommended_length": 1,
  "format_decision": {
    "post_count_reason": "",
    "split_roles": "",
    "why_not_shorter": "",
    "why_not_longer": ""
  },
  "posts": [
    {
      "index": 1,
      "role": "hook | context | question | answer | example | criterion | action | ending",
      "body": ""
    }
  ],
  "cta": "",
  "risk_flags": []
}
```
