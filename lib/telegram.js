// Telegram Bot API 얇은 래퍼.
// 서버 사이드에서만 import. TELEGRAM_BOT_TOKEN 없이 호출되면 throw.

const API_BASE = 'https://api.telegram.org';

function getToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN 미설정');
  return t;
}

async function tgFetch(method, body) {
  const res = await fetch(`${API_BASE}/bot${getToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram ${method} 실패: ${json.description || res.status}`);
  }
  return json.result;
}

// 인라인 키보드 버튼 + 텍스트 메시지 발송.
// buttons: [[{text, callback_data}, ...], ...] (행 단위 배열)
export async function sendInlineMessage({ chatId, text, buttons }) {
  return tgFetch('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

// 기존 메시지 텍스트·버튼 교체.
export async function editInlineMessage({ chatId, messageId, text, buttons }) {
  return tgFetch('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

// 콜백 응답 (작은 토스트 표시 + 로딩 스피너 종료).
export async function answerCallbackQuery({ callbackId, text }) {
  return tgFetch('answerCallbackQuery', {
    callback_query_id: callbackId,
    text: text || '',
  });
}

// webhook 요청 헤더 검증.
export function verifyWebhookSecret(request) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!want) return false;
  const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  return got === want;
}

// HTML escape — 텔레그램 parse_mode='HTML' 안전화.
export function tgEscape(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 아이템 1건을 텔레그램 카드 문자열로 변환.
// item: agent_items 행 (translation/summary/normalized/classification 포함)
export function buildItemCard(item) {
  const t = item.translation || {};
  const n = item.normalized || {};
  const s = item.summary || {};
  const c = item.classification || {};

  const title = tgEscape(t.translated_title || n.title || item.post_url);
  const oneLine = tgEscape(s.one_line_summary || '(요약 없음)');
  const keyPoints = Array.isArray(s.key_points) ? s.key_points.slice(0, 3) : [];
  const sourceLabel = ({
    youtube: 'YouTube',
    threads: 'Threads',
    instagram: 'Instagram',
    hackernews: 'Hacker News',
    web: 'Web',
  })[item.source] || item.source;

  const persona = c.suggested_persona && c.suggested_persona !== 'unknown' ? c.suggested_persona : null;
  const topic = c.suggested_topic_cluster && c.suggested_topic_cluster !== 'unclassified' ? c.suggested_topic_cluster : null;

  const lines = [
    `<b>[${tgEscape(sourceLabel)}]</b> ${title}`,
    '',
    `<i>${oneLine}</i>`,
  ];
  if (keyPoints.length > 0) {
    lines.push('');
    keyPoints.forEach((kp) => lines.push(`• ${tgEscape(kp)}`));
  }
  if (persona || topic) {
    lines.push('');
    const tags = [persona, topic].filter(Boolean).map((x) => `#${tgEscape(x)}`).join(' ');
    lines.push(tags);
  }
  if (t.translated_text) {
    const excerpt = t.translated_text.length > 350 ? t.translated_text.slice(0, 350) + '…' : t.translated_text;
    lines.push('');
    lines.push(`<blockquote>${tgEscape(excerpt)}</blockquote>`);
  }
  lines.push('');
  lines.push(`🔗 <a href="${tgEscape(item.post_url)}">원문 보기</a>`);

  return lines.join('\n');
}

// 인라인 키보드 — 승인/반려.
export function buildItemButtons(itemId) {
  return [[
    { text: '✅ 승인', callback_data: `approve:${itemId}` },
    { text: '❌ 반려', callback_data: `reject:${itemId}` },
  ]];
}
