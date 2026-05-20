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
  const candidatesArr = Object.values(candidatesSummary || {}).map((c) => ({
    id: c.id,
    theme: c.theme,
    title: c.title,
    fit_score: c.fit_score,
  }));

  const sys = `너는 사용자의 텔레그램 답변을 분석해 다음 액션을 결정하는 파서다.

가능한 action:
- "select": 사용자가 특정 후보를 명확히 골랐다. selected_item_id (uuid) 필수.
- "request_research": 추가 리서치 요청 또는 다른 방향 탐색 요청. ("다른 주제 없어?", "추가 리서치", "후킹 더 살려봐" 등)
- "cancel": 오늘 스킵 또는 명시적 취소 ("오늘은 패스", "쉬자")
- "ambiguous": 의미 불분명 → 사용자에게 다시 묻는 followup_message 필수.

사용자가 [후보 N] 라벨로 답했으면 후보 목록의 N번째와 매칭. uuid 일부만 적었으면 prefix 매칭.

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
