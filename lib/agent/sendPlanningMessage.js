// 자동 워크플로우용 텔레그램 발송 헬퍼.
// 1차 보고서·2차 마무리 보고를 활성 수신자에게 일괄 발송. message_id 도 반환해 세션에 저장.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInlineMessage, tgEscape } from '@/lib/telegram';

/**
 * 평문(보고서 텍스트)을 활성 수신자에게 발송. HTML escape 적용.
 * @returns {Promise<{ sent: number, lastMessageId?: number, chatIds: number[] }>}
 */
export async function sendPlainReport({ text, header }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  const { data: recipients } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('chat_id')
    .eq('active', true);
  if (!recipients || recipients.length === 0) {
    return { sent: 0, chatIds: [] };
  }

  const headerLine = header ? `<b>${tgEscape(header)}</b>\n\n` : '';
  const body = tgEscape(text || '');
  const message = `${headerLine}${body}`;

  let sent = 0;
  let lastMessageId;
  const chatIds = [];
  for (const r of recipients) {
    try {
      const result = await sendInlineMessage({ chatId: r.chat_id, text: message });
      if (result?.message_id) lastMessageId = result.message_id;
      chatIds.push(r.chat_id);
      sent += 1;
    } catch (e) {
      console.error(`[sendPlainReport] chat=${r.chat_id} 실패:`, e.message);
    }
  }
  return { sent, lastMessageId, chatIds };
}
