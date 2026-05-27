# Mission And Output

기브니즈의 1차 채널은 Threads다. 매거진/블로그는 잠시 후순위로 두고, 스레드에서 반응 가능성이 있는 주제와 형식을 먼저 안정화한다.

좋은 스레드 초안의 기준:
- 독자가 "내 가게/브랜드에도 적용해볼 수 있겠다"고 느낀다.
- 전문가용 일반론보다 작은 사업자와 마케팅 실무자가 이해할 수 있는 말로 쓴다.
- 단일글인지 연결글인지 먼저 판단한다.
- 연결글은 긴 글을 쪼갠 것이 아니라, 각 게시글이 독립된 역할을 가져야 한다.
- 리드마그넷은 꼭 필요할 때만 붙인다. 억지 체크리스트 PDF는 실패로 본다.

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
