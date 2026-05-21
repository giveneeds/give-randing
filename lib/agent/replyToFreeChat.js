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

[가장 최근 1차 보고 후보 목록 — 사용자가 "후보 N" 같은 표현 쓰면 여기서 매칭]
${context.latestCandidates.length > 0
  ? context.latestCandidates.map((c) => `${c.label || '[?]'} (id: ${c.id?.slice(0, 8)}…) — ${c.title || '제목 없음'} · 주제 "${c.theme || '?'}" · 적합도 ${typeof c.fit_score === 'number' ? Math.round(c.fit_score * 100) + '%' : '?'}`).join('\n')
  : '(아직 1차 보고 받은 게 없습니다.)'}

[최근 3개 세션 요약 — "어제 그 거 어떻게 됐어?" 같은 질문 대응]
${context.recentSessionSummaries.length > 0
  ? context.recentSessionSummaries.map((s) => {
      const date = new Date(s.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const result = s.status === 'completed' ? `완성됨 (스레드 ${s.thread_draft_id?.slice(0, 8) || '?'}…)`
                   : s.status === 'failed' ? `실패: ${(s.error || '').slice(0, 80)}`
                   : s.status === 'cancelled' ? '사용자가 취소'
                   : `진행 중 (${s.status})`;
      return `- ${date} 세션 ${s.id.slice(0, 8)}… → ${result}`;
    }).join('\n')
  : '(최근 세션 이력 없음)'}

[최근 스레드 드래프트 ${context.recentDraftCount}건 — "방금 만든 스레드" 류 질문]
${context.recentDrafts.length > 0
  ? context.recentDrafts.map((d) => {
      const date = new Date(d.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit' });
      return `- ${date} "${d.title || '제목 없음'}" (${d.format_type}, ${d.status})`;
    }).join('\n')
  : '(아직 생성된 스레드 없음)'}

답변 규칙:
- 사용자가 "후보 N", "어제 그 거", "방금 만든 스레드" 같이 과거 산출물을 가리키면 위 컨텍스트로 매칭해 답.
- 막힌 세션이 있어 사용자가 답답해하면 "어드민 '빠른 모음' 또는 내일 새벽 6시 cron 에 새 보고가 오고, 거기서 새로 [후보 N] 답해 달라" 고 친절히 안내.
- "오늘 자료 어때?", "진행 상황?" 같은 상태 질문은 위 컨텍스트로 답.
- 봇이 직접 새 콘텐츠 만들기 같은 작업은 못 한다 — 자료 모으기는 cron 또는 어드민에서만. 그 점 명확히 알려준다.
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

// 빠른 컨텍스트 — DB 6쿼리. 자유 채팅마다 호출되므로 가볍게 유지.
// 핵심: "최근 세션 후보 정보" 와 "최근 thread_draft" 를 같이 줘서
// 사용자가 "후보 N", "방금 만든 스레드" 같이 과거 산출물을 가리키는 표현도 봇이 이해할 수 있게.
async function loadContext() {
  if (!supabaseAdmin) {
    return emptyContext();
  }
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7); startWeek.setHours(0, 0, 0, 0);

  const [todayItems, weekItems, activeSessions, recentSessions, themes, recentDrafts] = await Promise.all([
    supabaseAdmin.from('agent_items').select('id', { count: 'exact', head: true }).gte('collected_at', startToday.toISOString()),
    supabaseAdmin.from('agent_items').select('id', { count: 'exact', head: true }).gte('collected_at', startWeek.toISOString()),
    supabaseAdmin
      .from('planning_sessions')
      .select('id, status, report_text_phase1, candidates_summary, created_at')
      .in('status', ['phase1_reported', 'awaiting_decision', 'phase2_running'])
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('planning_sessions')
      .select('id, status, candidates_summary, selected_item_id, thread_draft_id, error, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin.from('content_themes').select('name').eq('active', true).order('sort_order'),
    supabaseAdmin
      .from('thread_drafts')
      .select('id, title, format_type, status, theme_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  // 가장 최근 세션의 후보 라벨·제목 압축 — 봇이 "후보 N" 표현을 해석할 때 사용.
  const latestCandidates = summarizeCandidates(recentSessions.data?.[0]);
  // 최근 종료/실패 세션도 짧게 — "후보 4번 어떻게 됐어?" 류 질문 대응.
  const recentSessionSummaries = (recentSessions.data || []).map((s) => ({
    id: s.id,
    status: s.status,
    selected_item_id: s.selected_item_id,
    thread_draft_id: s.thread_draft_id,
    error: s.error,
    created_at: s.created_at,
    candidates: summarizeCandidates(s),
  }));

  return {
    todayCollected: todayItems.count || 0,
    weekCollected: weekItems.count || 0,
    activeSessionCount: (activeSessions.data || []).length,
    activeSessionStatuses: (activeSessions.data || []).map((s) => s.status),
    themeCount: (themes.data || []).length,
    themes: (themes.data || []).slice(0, 5).map((t) => t.name),
    recentDraftCount: (recentDrafts.data || []).length,
    recentDrafts: (recentDrafts.data || []).map((d) => ({
      id: d.id,
      title: d.title,
      format_type: d.format_type,
      status: d.status,
      created_at: d.created_at,
    })),
    lastReportSummary: (activeSessions.data?.[0]?.report_text_phase1 || recentSessions.data?.[0]?.report_text_phase1 || '').slice(0, 200),
    latestCandidates,
    recentSessionSummaries,
  };
}

function summarizeCandidates(session) {
  if (!session?.candidates_summary || typeof session.candidates_summary !== 'object') return [];
  return Object.values(session.candidates_summary)
    .map((c) => ({
      label: c.label || (c.candidate_index ? `[후보 ${c.candidate_index}]` : null),
      candidate_index: c.candidate_index || null,
      id: c.id,
      title: c.title,
      theme: c.theme,
      fit_score: c.fit_score,
    }))
    .sort((a, b) => (a.candidate_index || 999) - (b.candidate_index || 999));
}

function emptyContext() {
  return {
    todayCollected: 0, weekCollected: 0, activeSessionCount: 0, activeSessionStatuses: [],
    themeCount: 0, themes: [], recentDraftCount: 0, recentDrafts: [],
    lastReportSummary: '', latestCandidates: [], recentSessionSummaries: [],
  };
}

export { PROMPT_VERSION as FREE_CHAT_PROMPT_VERSION };
