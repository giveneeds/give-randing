import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { convertItemToMagazineDraft } from '@/lib/agent/convertItemToDraft';
import { parseUserDecision } from '@/lib/agent/parseUserDecision';
import { finishPlanningSession } from '@/lib/agent/finishPlanningSession';
import { composeFreeChatReply } from '@/lib/agent/replyToFreeChat';
import {
  fetchIssueCandidatesForTelegram,
  sendIssueCandidatesToChat,
} from '@/lib/agent/sendIssueResearchCandidates';
import {
  verifyWebhookSecret, sendInlineMessage, editInlineMessage,
  answerCallbackQuery, buildItemCard, tgEscape,
} from '@/lib/telegram';

export const runtime = 'nodejs';
// 사용자 답변 → 2차 워크플로우(깊이 리서치 + 스레드 생성 + 마무리 보고) 30~60초 소요.
// after() 가 응답 후에도 작업을 끝까지 실행하지만 Vercel 함수 limit 안에 들어와야 함.
export const maxDuration = 300;

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
  const syncFinish = request.headers.get('X-Giveneeds-Sync-Finish') === '1';

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message, { syncFinish, requestOrigin: request.nextUrl.origin });
    }
  } catch (e) {
    console.error('webhook 처리 실패', e);
  }

  // Telegram은 200을 받으면 재전송 안 함. 내부 에러도 200 응답해 무한 재시도 방지.
  return NextResponse.json({ ok: true });
}

async function handleMessage(message, { syncFinish = false, requestOrigin = '' } = {}) {
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

  if (!text) {
    await sendInlineMessage({ chatId, text: '✅ 활성화된 수신자입니다. 텍스트로 질문하시면 답변해 드릴게요.' });
    return;
  }

  // 1) 짧은 명령어 "리서치"는 즉시 issue_explainer 후보 수집으로 처리.
  if (isIssueResearchCommand(text)) {
    await handleIssueResearchCommand({ chatId, requestOrigin });
    return;
  }

  // 2) 진행 중 세션이 있으면 의사결정 답변으로 처리.
  const handled = await handleDailyReportReply({ chatId, text, message, syncFinish });
  if (handled) return;

  // 3) 이미 완료된 보고에 "후보 4도"처럼 추가 생성을 요청하면 최근 완료 세션에서 후보를 다시 집어 처리.
  const handledCompletedFollowup = await handleCompletedSessionFollowup({ chatId, text, message, syncFinish });
  if (handledCompletedFollowup) return;

  // 4) 진행 중 세션이 없으면 일반 LLM 자유 채팅으로 응답.
  try {
    const { replyText } = await composeFreeChatReply({
      chatId,
      userText: text,
      displayName,
    });
    await sendInlineMessage({ chatId, text: replyText });
  } catch (e) {
    console.error('[telegram webhook] free chat 실패', e);
    await sendInlineMessage({
      chatId,
      text: '답변 생성 중 문제가 발생했습니다. 잠시 후 다시 보내주세요.',
    });
  }
}

function isIssueResearchCommand(text) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  return [
    '리서치',
    '/리서치',
    '이슈 리서치',
    '뉴스 리서치',
    '최근 이슈',
  ].includes(normalized);
}

async function handleIssueResearchCommand({ chatId, requestOrigin }) {
  try {
    await sendInlineMessage({
      chatId,
      text:
        '<b>이슈 리서치 시작</b>\n' +
        '최근 뉴스기사/릴리스 기준으로 후보를 찾고 있습니다. 잠시만 기다려 주세요.',
    });

    const { issues } = await fetchIssueCandidatesForTelegram({
      origin: requestOrigin,
      recency: 'week',
    });

    await sendIssueCandidatesToChat({
      chatId,
      issues,
      introText:
        '<b>기브니즈 이슈 후보</b>\n' +
        '텔레그램에서 `리서치` 명령으로 가져온 최근 후보입니다.\n' +
        '하나를 고르면 워크벤치에서 Claude 해석부터 이어갈 수 있습니다.',
    });
  } catch (error) {
    console.error('[telegram webhook] issue research command 실패', error);
    await sendInlineMessage({
      chatId,
      text:
        '이슈 후보를 가져오지 못했습니다.\n' +
        `사유: ${tgEscape(error.message || '알 수 없는 오류')}`,
    });
  }
}

// 정욱님이 1차 보고서에 자유 텍스트로 답하면 진행 중인 세션을 찾아 액션 결정.
// 가장 최근 phase1_reported 또는 awaiting_decision 상태의 세션 1건만 처리.
async function handleDailyReportReply({ chatId, text, message, syncFinish = false }) {
  const { data: session } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, job_id, status, candidate_item_ids, candidates_summary, telegram_chat_id, telegram_message_id_phase1')
    .eq('telegram_chat_id', chatId)
    .in('status', ['phase1_reported', 'awaiting_decision'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return false;

  if (!isPlanningDecisionMessage({ text, message, session })) {
    return false;
  }

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
        '다음 후보 제안 때 기둥/방향 재평가에 반영하겠습니다. 지금 즉시 특정 후보로 진행하길 원하시면 [후보 N] 형태로 알려주세요.',
    });
    return true;
  }

  const selectedItemIds = getSelectedItemIds(parsed);

  if (parsed.action === 'ambiguous' || selectedItemIds.length === 0) {
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

  // select — 세션을 즉시 phase2_running 으로 잠가서 다음 메시지가 같은 세션을 다시 트리거하지 않게 한 뒤,
  // after() 로 응답 이후에도 2차 워크플로우(깊이 리서치 → 스레드 생성 → 마무리 보고) 가 끝까지 실행되도록 보장한다.
  // Vercel serverless 는 응답 후 즉시 종료가 기본이라 단순 fire-and-forget 은 잘림.
  const [primaryItemId, ...additionalItemIds] = selectedItemIds;
  const variantCounts = distributeVariantCounts(selectedItemIds.length);
  await supabaseAdmin
    .from('planning_sessions')
    .update({
      status: 'phase2_running',
      selected_item_id: primaryItemId,
      user_decision_parsed: {
        ...parsed,
        selected_item_id: primaryItemId,
        selected_item_ids: selectedItemIds,
        variant_count: variantCounts[0],
        total_variant_budget: 7,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  const extraSessions = [];
  for (const [idx, itemId] of additionalItemIds.entries()) {
    const extraSession = await createAdditionalPlanningSession({
      baseSession: session,
      selectedItemId: itemId,
      userText: text,
      parsed,
      variantCount: variantCounts[idx + 1],
    });
    if (extraSession?.id) extraSessions.push(extraSession);
  }

  await sendInlineMessage({
    chatId,
    text: selectedItemIds.length > 1
      ? `OK, 선택하신 후보 ${selectedItemIds.length}개로 총 7개 글 후보를 나눠 만들겠습니다. 분배: ${variantCounts.join('/')}개. 완성되면 후보별로 다시 알려드리겠습니다.`
      : `OK, 선택하신 주제로 진행합니다. 2차 리서치 후 글 후보 7개를 만들겠습니다. 완성되면 다시 알려드리겠습니다.`,
  });

  const selections = [
    { sessionId: session.id, selectedItemId: primaryItemId, variantCount: variantCounts[0] },
    ...extraSessions.map((s) => ({ sessionId: s.id, selectedItemId: s.selectedItemId, variantCount: s.variantCount })),
  ];
  if (syncFinish) {
    await finishSelectedSessions(selections);
  } else {
    after(finishSelectedSessions(selections));
  }

  return true;
}

async function handleCompletedSessionFollowup({ chatId, text, message, syncFinish = false }) {
  if (!isCompletedSessionCandidateFollowup(text)) return false;

  const { data: session } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, job_id, status, candidate_item_ids, candidates_summary, telegram_chat_id, telegram_message_id_phase1')
    .eq('telegram_chat_id', chatId)
    .eq('status', 'completed')
    .not('candidates_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return false;

  const parsed = await parseUserDecision({
    sessionId: session.id,
    userText: text,
    candidatesSummary: session.candidates_summary || {},
  });
  const selectedItemIds = getSelectedItemIds(parsed);
  if (parsed.action !== 'select' || selectedItemIds.length === 0) return false;

  const variantCounts = distributeVariantCounts(selectedItemIds.length);
  const childSessions = [];
  for (const [idx, itemId] of selectedItemIds.entries()) {
    const childSession = await createAdditionalPlanningSession({
      baseSession: session,
      selectedItemId: itemId,
      userText: text,
      parsed,
      variantCount: variantCounts[idx],
    });
    if (childSession?.id) childSessions.push(childSession);
  }

  if (childSessions.length === 0) {
    await sendInlineMessage({
      chatId,
      text: '추가 후보 생성 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
    return true;
  }

  await sendInlineMessage({
    chatId,
    text: selectedItemIds.length > 1
      ? `확인했습니다. 완료된 보고서의 후보 ${childSessions.length}개로 총 7개 글 후보를 ${variantCounts.join('/')}개로 나눠 추가 생성해볼게요.`
      : `확인했습니다. 완료된 보고서의 후보 1개로 글 후보 7개를 추가 생성해볼게요.`,
  });

  const selections = childSessions.map((s) => ({ sessionId: s.id, selectedItemId: s.selectedItemId, variantCount: s.variantCount }));
  if (syncFinish) {
    await finishSelectedSessions(selections);
  } else {
    after(finishSelectedSessions(selections));
  }

  return true;
}

async function finishSelectedSessions(selections) {
  for (const selection of selections) {
    try {
      await finishPlanningSession(selection);
    } catch (e) {
      console.error('[telegram webhook] finishPlanningSession 실패', e);
    }
  }
}

async function createAdditionalPlanningSession({ baseSession, selectedItemId, userText, parsed, variantCount = 7 }) {
  const now = new Date().toISOString();
  const childParsed = {
    ...parsed,
    selected_item_id: selectedItemId,
    selected_item_ids: [selectedItemId],
    variant_count: variantCount,
    total_variant_budget: 7,
    user_intent_note: `${parsed.user_intent_note || '사용자 추가 선택'} (추가 생성 세션)`,
  };
  const { data, error } = await supabaseAdmin
    .from('planning_sessions')
    .insert({
      job_id: baseSession.job_id,
      status: 'phase2_running',
      candidate_item_ids: baseSession.candidate_item_ids || [],
      candidates_summary: baseSession.candidates_summary || {},
      telegram_chat_id: baseSession.telegram_chat_id,
      telegram_message_id_phase1: baseSession.telegram_message_id_phase1,
      user_decision_raw: userText,
      user_decision_parsed: childParsed,
      selected_item_id: selectedItemId,
      decided_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[telegram webhook] 추가 planning_session 생성 실패', error);
    return null;
  }
  return { id: data.id, selectedItemId, variantCount };
}

function getSelectedItemIds(parsed) {
  const ids = Array.isArray(parsed?.selected_item_ids) ? parsed.selected_item_ids : [];
  const withFallback = ids.length > 0 ? ids : [parsed?.selected_item_id].filter(Boolean);
  return [...new Set(withFallback.filter((id) => typeof id === 'string' && id))];
}

function distributeVariantCounts(selectionCount) {
  const count = Math.max(1, Math.min(7, Number(selectionCount) || 1));
  const base = Math.floor(7 / count);
  const remainder = 7 % count;
  return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

// 진행 중 세션이 없을 때 들어온 "후보 N" 류 메시지는 가장 최근 완료 세션의 후보 메타를 재사용해 추가 생성한다.
// 어미("도/추가/같이/...")는 옵셔널 — "후보 4" 단독도 충분히 의도가 명확함.
// 패스/취소/리서치 요청은 이 경로로 받지 않는다 (완료된 세션을 재오픈할 의미가 없음).
// LLM 파싱 결과 action !== 'select' 면 호출자에서 false 처리되므로 광범위 매칭이라도 안전망 있음.
function isCompletedSessionCandidateFollowup(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return false;
  return [
    /\[?\s*후보\s*\d+\s*\]?/,
    /\b\d+\s*번\s*(?:후보)?/,
    /(?:첫|두|세|네|다섯|여섯)\s*번째/,
  ].some((pattern) => pattern.test(normalized));
}

function isPlanningDecisionMessage({ text, message, session }) {
  const replyToMessageId = message?.reply_to_message?.message_id;
  if (replyToMessageId && replyToMessageId === session.telegram_message_id_phase1) {
    return true;
  }

  // 오래된 awaiting_decision 세션이 일반 대화를 가로채지 않도록,
  // 명시적으로 후보/패스/리서치 의도가 보이는 문장만 의사결정 플로우로 보낸다.
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return false;

  return [
    /\[?\s*후보\s*\d+\s*\]?/,
    /\b\d+\s*번\b/,
    /^\d+$/,
    /(?:첫|두|세|네|다섯|여섯)\s*번째/,
    /(?:패스|스킵|취소|그만|오늘은\s*쉬)/,
    /(?:추가\s*리서치|더\s*(?:찾아|봐|조사)|다른\s*(?:후보|주제|자료|방향|기둥)|기둥|전략|뉴스성|실행형|관찰형)/,
  ].some((pattern) => pattern.test(normalized));
}

async function handleCallback(cb) {
  const data = cb.data || '';
  const callbackId = cb.id;
  const msg = cb.message;
  const chatId = msg?.chat?.id;
  const messageId = msg?.message_id;

  const [action, itemId] = data.split(':');
  if (action === 'issue_select') {
    await handleIssueSelectCallback({ cb, callbackId, chatId, messageId, issueId: itemId });
    return;
  }

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

async function handleIssueSelectCallback({ cb, callbackId, chatId, messageId, issueId }) {
  if (!chatId || !messageId || !issueId) {
    await answerCallbackQuery({ callbackId, text: '선택 정보를 읽지 못했습니다.' });
    return;
  }

  const { data: recipient } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('id, active')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (!recipient || !recipient.active) {
    await answerCallbackQuery({ callbackId, text: '활성화되지 않은 수신자입니다.' });
    return;
  }

  const issue = parseIssueCardText(cb.message?.text || '');
  const workbenchUrl = buildIssueWorkbenchUrl({ issueId, issue });

  try {
    await editInlineMessage({
      chatId,
      messageId,
      text:
        `${tgEscape(cb.message?.text || '')}\n\n` +
        '<b>✅ 이슈 선택됨</b>\n' +
        '워크벤치에서 Claude 해석, Sonar 연계 리서치, R1/R2 작성으로 이어가세요.',
      buttons: null,
    });
  } catch (error) {
    console.error('[telegram webhook] issue_select 메시지 편집 실패', error.message);
  }

  await answerCallbackQuery({ callbackId, text: '이슈 선택 완료' });
  await sendInlineMessage({
    chatId,
    text:
      '<b>선택한 이슈로 이어가기</b>\n' +
      `${tgEscape(issue.title || issueId)}\n\n` +
      '아래 버튼을 누르면 워크벤치에 이 이슈가 선택된 상태로 열립니다.',
    buttons: [[{ text: '워크벤치 열기', url: workbenchUrl }]],
  });
}

function parseIssueCardText(text) {
  const result = {};
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('제목:')) result.title = trimmed.replace(/^제목:\s*/, '').trim();
    if (trimmed.startsWith('훅:')) result.hook = trimmed.replace(/^훅:\s*/, '').trim();
    if (trimmed.startsWith('왜 볼 만한가:')) result.why = trimmed.replace(/^왜 볼 만한가:\s*/, '').trim();
    if (trimmed.startsWith('무엇이 바뀌었나:')) result.changed = trimmed.replace(/^무엇이 바뀌었나:\s*/, '').trim();
    if (trimmed.startsWith('출처 신호:')) result.source = trimmed.replace(/^출처 신호:\s*/, '').trim();
  }
  return result;
}

function buildIssueWorkbenchUrl({ issueId, issue }) {
  const base = (
    process.env.CONTENT_STUDIO_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('telegramIssue', '1');
  params.set('issueId', issueId);
  if (issue.title) params.set('issueTitle', issue.title);
  if (issue.hook) params.set('issueHook', issue.hook);
  if (issue.why) params.set('issueWhy', issue.why);
  if (issue.changed) params.set('issueChanged', issue.changed);
  if (issue.source) params.set('issueSource', issue.source);
  return `${base}/admin/content-studio/research-workbench?${params.toString()}`;
}
