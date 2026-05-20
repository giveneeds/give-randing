// 텔레그램으로 사용자가 자유 텍스트로 답한 메시지를 LLM 으로 파싱.
// 후보 [후보 N] 라벨이나 id 일부, 또는 자연어 ("A로 가자", "추가 리서치 해줘") 모두 인식.

import { callOpenAI } from '@/lib/llm';

const PROMPT_VERSION = 'planning_phase1_parse_v1';

/**
 * @param {{ sessionId: string, userText: string, candidatesSummary: object }} args
 * @returns {Promise<{
 *   action: 'select' | 'request_research' | 'cancel' | 'ambiguous',
 *   selected_item_id?: string,
 *   user_intent_note?: string,
 *   followup_message?: string,
 *   model: string,
 * }>}
 */
export async function parseUserDecision({ sessionId, userText, candidatesSummary }) {
  // candidate_index 가 있으면 그 순서대로, 없으면 객체 순서대로 정렬.
  const candidatesArr = Object.values(candidatesSummary || {})
    .map((c) => ({
      candidate_index: c.candidate_index || null,
      label: c.label || (c.candidate_index ? `[후보 ${c.candidate_index}]` : null),
      id: c.id,
      theme: c.theme,
      title: c.title,
      fit_score: c.fit_score,
    }))
    .sort((a, b) => (a.candidate_index || 999) - (b.candidate_index || 999));

  // candidate_index 기반 빠른 매칭 — LLM 결정 전에 먼저 시도.
  // "후보 1", "[후보 2]", "1번", "2번으로" 같은 명시적 표현은 결정적으로 매핑.
  const indexFromText = extractCandidateIndex(userText);
  if (indexFromText !== null) {
    const matched = candidatesArr.find((c) => c.candidate_index === indexFromText);
    if (matched) {
      return {
        action: 'select',
        selected_item_id: matched.id,
        user_intent_note: `사용자가 ${matched.label || `[후보 ${indexFromText}]`} 를 선택함.`,
        followup_message: null,
        model: 'rule_based',
      };
    }
  }

  const sys = `너는 사용자의 텔레그램 답변을 분석해 다음 액션을 결정하는 파서다.

가능한 action:
- "select": 사용자가 특정 후보를 명확히 골랐다. selected_item_id (uuid) 필수.
- "request_research": 추가 리서치 요청 또는 다른 방향 탐색 요청. ("다른 주제 없어?", "추가 리서치", "후킹 더 살려봐" 등)
- "cancel": 오늘 스킵 또는 명시적 취소 ("오늘은 패스", "쉬자")
- "ambiguous": 의미 불분명 → 사용자에게 다시 묻는 followup_message 필수.

매칭 규칙 (중요):
- 입력 candidates 배열에는 candidate_index 와 label 이 있다. 사용자가 "후보 2", "[후보 3]", "2번", "두 번째" 등으로 답하면 그 index 의 id 를 반환.
- 사용자가 자료 제목이나 주제로 답하면 가장 가까운 후보의 id 를 반환.
- 절대 임의로 다른 후보를 고르지 마라.

출력은 JSON 만:
{
  "action": "select" | "request_research" | "cancel" | "ambiguous",
  "selected_item_id": "uuid 또는 null",
  "user_intent_note": "사용자 의도 요약 한 줄",
  "followup_message": "ambiguous 일 때 정욱님께 다시 물을 한 줄. 다른 case 면 null"
}`;

  const user = `오늘 보고된 후보들:
${JSON.stringify(candidatesArr, null, 2)}

정욱님 답변:
"""
${userText}
"""

위 답변을 파싱해 JSON 으로 출력해 주세요.`;

  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  try {
    const { content } = await callOpenAI({
      stage: 'planning_phase1_parse',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      model,
      params: { response_format: { type: 'json_object' }, temperature: 0.1 },
    });
    const parsed = JSON.parse(content || '{}');
    const validActions = ['select', 'request_research', 'cancel', 'ambiguous'];
    const action = validActions.includes(parsed.action) ? parsed.action : 'ambiguous';
    const selectedId = typeof parsed.selected_item_id === 'string' ? parsed.selected_item_id : null;
    return {
      action,
      selected_item_id: action === 'select' && selectedId && candidatesSummary[selectedId] ? selectedId : null,
      user_intent_note: typeof parsed.user_intent_note === 'string' ? parsed.user_intent_note : null,
      followup_message: typeof parsed.followup_message === 'string' ? parsed.followup_message : null,
      model,
    };
  } catch (e) {
    return {
      action: 'ambiguous',
      followup_message: `정욱님 답변을 이해하지 못했습니다. 후보 번호([후보 1] 같은 형태) 또는 "추가 리서치" / "패스" 식으로 답해 주실 수 있을까요? (사유: ${e.message})`,
      model,
    };
  }
}

export { PROMPT_VERSION as PLANNING_PARSE_PROMPT_VERSION };

// 명시적 후보 번호 표현을 텍스트에서 추출. 매칭 없으면 null.
// 우선순위: "[후보 N]" > "후보 N" > "N번" > "N 번" > 마지막에 끝자리 단독 숫자.
function extractCandidateIndex(text) {
  if (!text) return null;
  const patterns = [
    /\[후보\s*(\d+)\]/,
    /후보\s*(\d+)\s*(?:로|을|를|이|가|만)?/,
    /(\d+)\s*번\s*(?:후보)?(?:로|을|를|이|가)?/,
    /(?:첫|두|세|네|다섯|여섯)\s*번째/, // 한글 서수 후처리
    /^\s*(\d+)\s*$/,
  ];
  for (const re of patterns.slice(0, 3).concat(patterns[4])) {
    const m = text.match(re);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
    }
  }
  // 한글 서수 매핑.
  const ordinalMap = { '첫': 1, '두': 2, '세': 3, '네': 4, '다섯': 5, '여섯': 6 };
  const ord = text.match(/(첫|두|세|네|다섯|여섯)\s*번째/);
  if (ord && ordinalMap[ord[1]]) return ordinalMap[ord[1]];
  return null;
}
