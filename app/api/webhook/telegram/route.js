import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { convertItemToMagazineDraft } from '@/lib/agent/convertItemToDraft';
import { parseUserDecision } from '@/lib/agent/parseUserDecision';
import { finishPlanningSession } from '@/lib/agent/finishPlanningSession';
import {
  verifyWebhookSecret, sendInlineMessage, editInlineMessage,
  answerCallbackQuery, buildItemCard, tgEscape,
} from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const text = (message.text || '').trim();

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
    return;
  }

  // 기존 사용자에게 메타 갱신.
  await supabaseAdmin
    .from('agent_telegram_recipients')
    .update({ username, display_name: displayName })
    .eq('chat_id', chatId);

  if (!existing.active) {
    await sendInlineMessage({ chatId, text: '⏳ 관리자 활성화 대기 중입니다.' });
    return;
  }

  // 활성 수신자의 자유 텍스트 → 진행 중인 planning_session 의 1차 보고 응답으로 해석.
  if (text) {
    const handled = await handleDailyReportReply({ chatId, text });
    if (handled) return;
  }

  await sendInlineMessage({
    chatId,
    text: '✅ 활성화된 수신자입니다. 다음 아침 보고를 받으면 자유롭게 답글로 결정 알려주세요.',
  });
}

// 정욱님이 1차 보고서에 자유 텍스트로 답하면 진행 중인 세션을 찾아 액션 결정.
// 가장 최근 phase1_reported 또는 awaiting_decision 상태의 세션 1건만 처리.
async function handleDailyReportReply({ chatId, text }) {
  const { data: session } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, status, candidates_summary, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .in('status', ['phase1_reported', 'awaiting_decision'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return false;

  // LLM 으로 사용자 의도 파싱.
  const parsed = await parseUserDecision({
    sessionId: session.id,
    userText: text,
    candidatesSummary: session.candidates_summary || {},
  });

  await supabaseAdmin
    .from('planning_sessions')
    .update({
      user_decision_raw: text,
      user_decision_parsed: parsed,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (parsed.action === 'cancel') {
    await supabaseAdmin
      .from('planning_sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', session.id);
    await sendInlineMessage({ chatId, text: '알겠습니다. 오늘은 발행 스킵하겠습니다. 내일 아침에 다시 정리해 보낼게요.' });
    return true;
  }

  if (parsed.action === 'request_research') {
    await supabaseAdmin
      .from('planning_sessions')
      .update({ status: 'awaiting_decision', updated_at: new Date().toISOString() })
      .eq('id', session.id);
    await sendInlineMessage({
      chatId,
      text:
        `요청 확인했습니다 (${tgEscape(parsed.user_intent_note || '추가 리서치')}).\n` +
        '내일 보고에 더 보강된 리서치를 반영하겠습니다. 지금 즉시 다른 후보로 진행하길 원하시면 [후보 N] 형태로 알려주세요.',
    });
    return true;
  }

  if (parsed.action === 'ambiguous' || !parsed.selected_item_id) {
    await supabaseAdmin
      .from('planning_sessions')
      .update({ status: 'awaiting_decision', updated_at: new Date().toISOString() })
      .eq('id', session.id);
    await sendInlineMessage({
      chatId,
      text: parsed.followup_message || '답변을 이해하지 못했습니다. 후보 라벨([후보 1] 같은 형태) 또는 "패스" / "추가 리서치" 로 답해 주세요.',
    });
    return true;
  }

  // select — 비동기로 2차 워크플로우 트리거. webhook 응답은 즉시 200 으로 빠지게.
  await sendInlineMessage({
    chatId,
    text: `OK, 선택하신 후보로 진행합니다. 2차 리서치 + 콘텐츠 생성 들어갈게요. 완성되면 다시 알려드리겠습니다.`,
  });

  // fire-and-forget. 실패 시 finishPlanningSession 내부에서 텔레그램으로 보고.
  finishPlanningSession({ sessionId: session.id, selectedItemId: parsed.selected_item_id })
    .catch((e) => console.error('[telegram webhook] finishPlanningSession 실패', e));

  return true;
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

  const isApprove = action === 'approve';
  const newStatus = isApprove ? 'approved' : 'rejected';
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
  const footer = isApprove ? '\n\n<b>✅ 승인됨</b>\n📝 매거진 draft 생성 중...' : '\n\n<b>❌ 반려됨</b>';
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
    text: isApprove ? '✅ 승인됨. draft 생성 중' : '❌ 반려 처리됨',
  });

  if (!isApprove) return;

  try {
    const draft = await convertItemToMagazineDraft(itemId);
    const resourceLine = draft.leadMagnetCreated ? '\n📎 리드마그넷 후보도 생성됨' : '';
    await editInlineMessage({
      chatId,
      messageId,
      text:
        newCard +
        '\n\n<b>✅ 승인됨</b>' +
        `\n📝 <b>매거진 draft 생성 완료</b>: ${tgEscape(draft.magazineUrl)}` +
        resourceLine,
      buttons: null,
    });
  } catch (e) {
    console.error('매거진 draft 생성 실패', e);
    try {
      await editInlineMessage({
        chatId,
        messageId,
        text:
          newCard +
          '\n\n<b>✅ 승인됨</b>' +
          `\n⚠️ 매거진 draft 생성 실패: ${tgEscape(e.message)}`,
        buttons: null,
      });
    } catch (editError) {
      console.error('draft 실패 메시지 편집 실패', editError.message);
      await sendInlineMessage({
        chatId,
        text: `⚠️ 매거진 draft 생성 실패: ${tgEscape(e.message)}`,
      });
    }
  }
}
