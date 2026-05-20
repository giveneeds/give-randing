// 1차 오케스트레이터 — cron 의 runCollection 직후 호출.
//
// 흐름:
//   1) composeDailyReport 로 자연어 1차 보고서 생성 + planning_sessions 행 저장
//   2) sendPlainReport 로 활성 수신자에게 텔레그램 발송
//   3) 세션에 텔레그램 message_id·chat_id 저장 (webhook 이 답변 매핑 시 사용)
//
// 사용자 응답은 webhook 이 받아 finishPlanningSession 트리거.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { composeDailyReport } from './composeDailyReport.js';
import { sendPlainReport } from './sendPlanningMessage.js';

/**
 * @param {{ jobId: string }} args
 * @returns {Promise<{
 *   sessionId: string,
 *   sent: number,
 *   candidateCount: number,
 *   skippedReason?: string,
 * }>}
 */
export async function runAutoContentPlanning({ jobId }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  const { sessionId, reportText, candidateCount, skippedReason } = await composeDailyReport({ jobId });

  if (!reportText || candidateCount === 0) {
    // 스킵 — 후보 없음.
    if (sessionId) {
      await supabaseAdmin
        .from('planning_sessions')
        .update({ error: skippedReason || '후보 없음', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
    return { sessionId, sent: 0, candidateCount, skippedReason };
  }

  const header = '📨 오늘의 콘텐츠 1차 보고';
  const { sent, lastMessageId, chatIds } = await sendPlainReport({ text: reportText, header });

  // 세션에 텔레그램 흔적 저장 — webhook 이 사용자 답변 매핑 시 참조.
  // 활성 수신자 1명 가정. 여러명이면 마지막 chat_id 만 — 운영자 정욱님 단일이라 충분.
  if (sent > 0) {
    await supabaseAdmin
      .from('planning_sessions')
      .update({
        telegram_chat_id: chatIds[chatIds.length - 1],
        telegram_message_id_phase1: lastMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }

  return { sessionId, sent, candidateCount };
}
