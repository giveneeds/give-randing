import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  verifyWebhookSecret, sendInlineMessage, editInlineMessage,
  answerCallbackQuery, buildItemCard, tgEscape,
} from '@/lib/telegram';

export const runtime = 'nodejs';

const SELECT_COLS = 'id, job_id, source, source_account, post_id, post_url, posted_at, collected_at, normalized, classification, summary, translation, status, send_flag, reviewed_at, note, notified_at, notification_message_id, approved_via';

/**
 * POST /api/webhook/telegram
 *
 * 텔레그램 봇 webhook. 두 가지 업데이트 처리:
 * 1) message — 첫 대화 시 agent_telegram_recipients에 active=false로 INSERT
 * 2) callback_query — 인라인 버튼 [승인][반려] → agent_items.status 변경 + 메시지 편집
 *
 * 검증: X-Telegram-Bot-Api-Secret-Token 헤더가 TELEGRAM_WEBHOOK_SECRET 와 일치해야 함.
 */
export async function POST(request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  let update;
  try { update = await request.json(); } catch { return NextResponse.json({ ok: true }); }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (e) {
    console.error('webhook 처리 실패', e);
  }

  // Telegram은 200을 받으면 재전송 안 함. 내부 에러도 200 응답해 무한 재시도 방지.
  return NextResponse.json({ ok: true });
}

async function handleMessage(message) {
  const chat = message.chat;
  const from = message.from;
  if (!chat || chat.type !== 'private') return; // 그룹·채널은 무시

  const chatId = chat.id;
  const username = from?.username || null;
  const displayName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || username || `chat_${chatId}`;

  // upsert. 처음이면 active=false, 이미 있으면 메타만 갱신.
  const { data: existing } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('id, active')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from('agent_telegram_recipients')
      .insert({ chat_id: chatId, username, display_name: displayName, active: false });

    await sendInlineMessage({
      chatId,
      text:
        '🤖 <b>기브니즈 콘텐츠 봇</b>\n\n' +
        `안녕하세요 ${tgEscape(displayName)}님. 등록을 접수했습니다.\n` +
        '관리자가 어드민 페이지에서 활성화하면 이 봇이 콘텐츠 카드를 보내드립니다.',
    });
  } else {
    // 기존 사용자에게 메타 갱신만
    await supabaseAdmin
      .from('agent_telegram_recipients')
      .update({ username, display_name: displayName })
      .eq('chat_id', chatId);

    if (existing.active) {
      await sendInlineMessage({
        chatId,
        text: '✅ 이미 활성화된 수신자입니다. 새 콘텐츠가 도착하면 알려드릴게요.',
      });
    } else {
      await sendInlineMessage({
        chatId,
        text: '⏳ 관리자 활성화 대기 중입니다.',
      });
    }
  }
}

async function handleCallback(cb) {
  const data = cb.data || '';
  const callbackId = cb.id;
  const msg = cb.message;
  const chatId = msg?.chat?.id;
  const messageId = msg?.message_id;

  const [action, itemId] = data.split(':');
  if (!['approve', 'reject'].includes(action) || !itemId) {
    await answerCallbackQuery({ callbackId, text: '알 수 없는 액션' });
    return;
  }

  // 수신자가 active인지 확인 (스팸 방지)
  const { data: recipient } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('id, active')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (!recipient || !recipient.active) {
    await answerCallbackQuery({ callbackId, text: '활성화되지 않은 수신자입니다.' });
    return;
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const patch = {
    status: newStatus,
    reviewed_at: new Date().toISOString(),
    approved_via: 'telegram',
    ...(newStatus === 'approved' ? { send_flag: true } : { send_flag: false }),
  };

  const { data: updated, error } = await supabaseAdmin
    .from('agent_items')
    .update(patch)
    .eq('id', itemId)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error || !updated) {
    await answerCallbackQuery({ callbackId, text: '아이템을 찾을 수 없습니다.' });
    return;
  }

  // 인라인 메시지 편집 — 버튼 제거 + 상태 표시
  const newCard = buildItemCard(updated);
  const footer = newStatus === 'approved' ? '\n\n<b>✅ 승인됨</b>' : '\n\n<b>❌ 반려됨</b>';
  try {
    await editInlineMessage({
      chatId,
      messageId,
      text: newCard + footer,
      buttons: null,
    });
  } catch (e) {
    // 메시지가 너무 오래됐거나 변경 불가하면 무시
    console.error('editMessageText 실패', e.message);
  }

  await answerCallbackQuery({
    callbackId,
    text: newStatus === 'approved' ? '✅ 승인 처리됨' : '❌ 반려 처리됨',
  });
}
