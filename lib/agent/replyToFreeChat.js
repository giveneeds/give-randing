// 텔레그램에서 사용자가 자유 텍스트로 일반 질문을 보냈을 때 LLM 으로 답변.
// "오늘 1차 보고서 답글" 흐름과 별도. 진행 중 세션이 없을 때 호출된다.
//
// 답변 톤:
// - 기브니즈 콘텐츠 자동화 봇 페르소나. "정욱님" 호칭.
// - 콘텐츠·마케팅·운영 관련 질문이면 실용적으로 답.
// - 시스템 상태(오늘 자료 수집·세션 진행)도 물어보면 답할 수 있게 컨텍스트 주입.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { callOpenAI } from '@/lib/llm';

const MAX_TG_MESSAGE = 3800;   // 텔레그램 4096자 한도 + 여유.
const PROMPT_VERSION = 'free_chat_v1';

/**
 * @param {{ chatId: number, userText: string, displayName?: string }} args
 * @returns {Promise<{ replyText: string, model: string }>}
 */
export async function composeFreeChatReply({ chatId, userText, displayName }) {
  const context = await loadContext();

  const greetingName = displayName ? `${displayName}님` : '정욱님';

  const sys = `너는 기브니즈(B2B 마케팅 에이전시)의 콘텐츠 자동화 보조 비서다.
주 사용자는 ${greetingName}. 텔레그램으로 일반 질문/상의를 받았을 때 짧고 실용적으로 답한다.

캐릭터:
- "정욱님" 호칭. 형식적이지 않게, 가깝지만 사무적이지 않게.
- 답은 3~6문장 내외. 길어지면 핵심만 추리고 마무리.
- 마케팅/콘텐츠/플레이스/운영 맥락이면 구체 액션 한 개 제안.
- 모르거나 데이터 부족이면 솔직히 "잘 모르겠습니다" 또는 "추가 정보가 필요합니다" 라고 답.
- 자기 자랑이나 광고티 X. 텔레그램이라 HTML 태그·마크다운 X (일반 텍스트만).

시스템 컨텍스트 — 이 정보를 활용해 사용자 질문에 답해도 된다:
- 오늘 모은 자료: ${context.todayCollected}건 (이번 주 ${context.weekCollected}건)
- 진행 중 세션: ${context.activeSessionCount}건 (상태: ${context.activeSessionStatuses.join(', ') || '없음'})
- 활성 주제: ${context.themeCount}개${context.themes.length ? ' — ' + context.themes.join(', ') : ''}
- 최근 완성된 스레드 드래프트: ${context.recentDraftCount}건
${context.lastReportSummary ? `- 가장 최근 1차 보고 요약(앞 200자): ${context.lastReportSummary}` : ''}

답변 규칙:
- 사용자가 "오늘 자료 어때?", "진행 상황?", "최근 보고는?" 같은 시스템 상태 질문을 하면 위 컨텍스트로 답.
- 마케팅/콘텐츠 일반 질문이면 짧은 실무 답.
- 인사면 가볍게 인사로 응대.
- 답 길이는 3800자를 절대 넘기지 말 것.`;

  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  let replyText = '';
  try {
    const { content } = await callOpenAI({
      stage: 'free_chat_reply',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userText },
      ],
      model,
      params: { temperature: 0.4 },
    });
    replyText = (content || '').trim();
    if (replyText.length > MAX_TG_MESSAGE) {
      replyText = replyText.slice(0, MAX_TG_MESSAGE - 30) + '\n\n(메시지 길어서 줄였습니다)';
    }
  } catch (e) {
    replyText = `답변 생성 중 문제가 발생했습니다 (사유: ${e.message}). 잠시 후 다시 보내주세요.`;
  }

  return { replyText, model };
}

// 빠른 컨텍스트 — DB 4쿼리. 자유 채팅마다 호출되므로 가볍게 유지.
async function loadContext() {
  if (!supabaseAdmin) {
    return { todayCollected: 0, weekCollected: 0, activeSessionCount: 0, activeSessionStatuses: [],
      themeCount: 0, themes: [], recentDraftCount: 0, lastReportSummary: '' };
  }
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7); startWeek.setHours(0, 0, 0, 0);

  const [todayItems, weekItems, sessions, themes, recentDrafts] = await Promise.all([
    supabaseAdmin.from('agent_items').select('id', { count: 'exact', head: true }).gte('collected_at', startToday.toISOString()),
    supabaseAdmin.from('agent_items').select('id', { count: 'exact', head: true }).gte('collected_at', startWeek.toISOString()),
    supabaseAdmin
      .from('planning_sessions')
      .select('status, report_text_phase1')
      .in('status', ['phase1_reported', 'awaiting_decision', 'phase2_running'])
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin.from('content_themes').select('name').eq('active', true).order('sort_order'),
    supabaseAdmin.from('thread_drafts').select('id', { count: 'exact', head: true }).gte('created_at', startWeek.toISOString()),
  ]);

  return {
    todayCollected: todayItems.count || 0,
    weekCollected: weekItems.count || 0,
    activeSessionCount: (sessions.data || []).length,
    activeSessionStatuses: (sessions.data || []).map((s) => s.status),
    themeCount: (themes.data || []).length,
    themes: (themes.data || []).slice(0, 5).map((t) => t.name),
    recentDraftCount: recentDrafts.count || 0,
    lastReportSummary: (sessions.data?.[0]?.report_text_phase1 || '').slice(0, 200),
  };
}

export { PROMPT_VERSION as FREE_CHAT_PROMPT_VERSION };
