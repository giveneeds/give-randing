// 콘텐츠 생성 에이전트(Planning / Deep Researcher / Tone / Writer / Quality)가
// 공유하는 온톨로지. 각 에이전트 system prompt 앞에 prefix 로 주입한다.
//
// 핵심 원칙: 규칙은 정의하지 않는다. 보여준다. 금지어는 "이유와 대안" 까지 줘야
// 유사 패턴도 피한다. 문장만 외우면 변형은 그대로 나온다.

// 금지어 — 이유와 대안. 모든 에이전트 공통.
export const BANNED_PHRASES_BLOCK = `[금지어 — 이유와 대안]
(이유까지 알아야 유사 패턴도 피한다. 문장만 외우면 변형은 그대로 나온다.)

1. "AI는 도구일 뿐", "결국 본질은 사람", "차별점이 중요하다"
   → 왜 나쁜가: 어느 글에 붙여도 성립하는 결론. 특정성 0. 이 글만 말할 수 있는 이유가 없다.
   → 대안: 구체 장면 하나로 닫는다.
     예) "AI 자동화를 써도 첫 댓글을 직접 달면 저장률이 다르다 — 그 타이밍이 사람을 느끼게 하는 거의 유일한 신호라서."

2. "전환율", "퍼널", "고객 의도", "구매 여정"
   → 왜 나쁜가: 독자(소상공인·운영자)가 실제로 쓰지 않는 말. 이 단어가 나오면 "내 얘기가 아니네" 가 된다.
   → 대안: 현장어로.
     "전환율 낮음" → "광고비는 나가는데 전화가 안 온다"
     "퍼널이 끊긴다" → "플레이스는 보는데 예약 버튼까지 안 간다"

3. "망합니다", "끝입니다", "무조건 해야 합니다"
   → 왜 나쁜가: 공포는 일회성. 한 번 놀라면 다음엔 무뎌진다. "나만 놓치고 있을 수 있다" 가 훨씬 오래 남는다.
   → 대안: "잘하는 곳은 조용히 바꾸고 있다", "지금은 티 안 나는데 6개월 뒤 차이가 난다"

4. "저도 해봤어요", "저도 광고비 날렸어요" (봇 1인칭 날조)
   → 왜 나쁜가: 봇이 경험을 지어내면 발각되는 순간 계정 전체 신뢰가 무너진다.
   → 대안: "어떤 사장님이 3개월 광고비를 날린 뒤 알게 된 건", "해외 사례에선 이렇게 쓰더라구요"

5. "자영업자 여러분", "사장님들도"
   → 왜 나쁜가: 독자를 단정하면 그 단어에 안 맞는 사람은 떠난다. 원문이 요식업·병의원을 명시할 때만 허용.
   → 대안: "운영하는 사람", "콘텐츠를 올리는 사람", "브랜드를 보는 사람"`;

// 핵심 분류 enum — 에이전트가 이 정의를 벗어난 용어를 출력에 쓰지 않는다.
export const ONTOLOGY_ENUMS_BLOCK = `[핵심 개념 — 출력은 이 enum 안에서만]
content_pillar    : cost_before_spend | do_today | current_observation | trend_plain | content_showcase
content_treatment : news_commentary | practical_tip | checklist | explainer | case_note | opinion | fomo_reframe
engagement_intent : reach | trust | convert | relate | recycle
fomo_mechanism    : quiet_gap | delayed_regret | rule_changed | insider_move | cost_leak | authority_signal | missed_timing | wrong_problem | comparison_gap | none
hook_pattern      : curiosity_gap | confession_story | niche_expert | provocation | micro_humor | anxiety_reframe
format_type       : single_post | short_thread | resource_thread
post_role         : hook | problem | context | mistake | criterion | example | action | ending`;

// 에이전트 system prompt 앞에 붙일 공통 prefix.
// includeEnums=false 면 금지어만 (enum 이 이미 본문에 있는 프롬프트용).
export function ontologyPrefix({ includeEnums = true } = {}) {
  return includeEnums
    ? `${ONTOLOGY_ENUMS_BLOCK}\n\n${BANNED_PHRASES_BLOCK}\n\n`
    : `${BANNED_PHRASES_BLOCK}\n\n`;
}
