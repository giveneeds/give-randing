// 다이제스트 빌더 — 잡 1건의 신규 아이템을 텔레그램으로 발송.
//
// 두 가지 모드:
//   sendDailyDigest  : 상위 N건 묶음 1메시지 (개요용, 버튼 없음) — 레거시/요약 보고용
//   sendItemCards    : 건당 1메시지 + 콘텐츠 브리프 + 승인/반려 버튼 (메인 워크플로우)
//
// cron route 는 sendItemCards 를 호출해 매거진 draft 생성 워크플로우와 연결한다.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInlineMessage, tgEscape, buildItemCard, buildItemButtons } from '@/lib/telegram';

const SOURCE_LABEL = {
  naver_news: '네이버',
  google_news: '구글뉴스',
  hackernews: 'HN',
  youtube: 'YouTube',
  threads: 'Threads',
  instagram: 'IG',
  web: '웹',
};

const NUMBER_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function nowKstString() {
  // 한국 시간 표시. Date 객체에 KST offset 적용.
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} KST`;
}

function pickBest(items, max) {
  return items
    .slice()
    .sort((a, b) => {
      // posted_at 내림차순, 없으면 collected_at
      const ta = new Date(a.posted_at || a.collected_at).getTime();
      const tb = new Date(b.posted_at || b.collected_at).getTime();
      return tb - ta;
    })
    .slice(0, max);
}

function pickTitle(item) {
  return (
    item.translation?.translated_title ||
    item.normalized?.title ||
    item.post_url
  );
}

function pickSummary(item) {
  return (
    item.summary?.one_line_summary ||
    item.normalized?.meta_description ||
    ''
  );
}

/**
 * @param {{ jobId: string, max?: number, productionUrl?: string }} args
 * @returns {Promise<{ sent: number, recipients: number, message_ids: number[], skipped_reason?: string }>}
 */
export async function sendDailyDigest({ jobId, max = 5, productionUrl }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  // 1) 잡 통계 + 신규 아이템 로드
  const [{ data: job }, { data: items }] = await Promise.all([
    supabaseAdmin
      .from('agent_jobs')
      .select('id, stats, started_at')
      .eq('id', jobId)
      .maybeSingle(),
    supabaseAdmin
      .from('agent_items')
      .select('id, source, post_url, posted_at, collected_at, normalized, summary, translation')
      .eq('job_id', jobId)
      .eq('status', 'collected')
      .order('collected_at', { ascending: false })
      .limit(100),
  ]);

  if (!items || items.length === 0) {
    return { sent: 0, recipients: 0, message_ids: [], skipped_reason: '신규 아이템 없음' };
  }

  // 2) 활성 수신자 로드
  const { data: recipients } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('chat_id')
    .eq('active', true);

  if (!recipients || recipients.length === 0) {
    return { sent: 0, recipients: 0, message_ids: [], skipped_reason: '활성 수신자 없음' };
  }

  // 3) 다이제스트 메시지 빌드
  const totalCount = job?.stats?.collected ?? items.length;
  const best = pickBest(items, max);
  const adminUrl = (productionUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001')
    .replace(/\/+$/, '') + '/admin/content-studio';

  const lines = [
    `📰 <b>오늘의 마케팅 큐레이션</b>`,
    `${tgEscape(nowKstString())} · 신규 ${totalCount}건`,
    '',
    '━━━━━━━━━━',
    '',
  ];

  best.forEach((it, idx) => {
    const emoji = NUMBER_EMOJI[idx] || `${idx + 1}.`;
    const srcLabel = SOURCE_LABEL[it.source] || it.source;
    const title = pickTitle(it);
    const summary = pickSummary(it);

    lines.push(`${emoji} <b>[${tgEscape(srcLabel)}]</b> ${tgEscape(title)}`);
    if (summary) {
      const short = summary.length > 200 ? summary.slice(0, 200) + '…' : summary;
      lines.push(`   ${tgEscape(short)}`);
    }
    lines.push(`   🔗 <a href="${tgEscape(it.post_url)}">원문</a>`);
    lines.push('');
  });

  lines.push('━━━━━━━━━━');
  lines.push(`전체 검수: <a href="${tgEscape(adminUrl)}">${tgEscape(adminUrl)}</a>`);

  const text = lines.join('\n');

  // 4) 활성 수신자 전원에게 발송
  const message_ids = [];
  let sent = 0;
  for (const r of recipients) {
    try {
      const result = await sendInlineMessage({
        chatId: r.chat_id,
        text,
        // 다이제스트는 버튼 없음. 개별 검수는 어드민 또는 카드별 발송으로.
      });
      if (result?.message_id) message_ids.push(result.message_id);
      sent += 1;
    } catch (e) {
      console.error(`디지스트 발송 실패 chat=${r.chat_id}:`, e.message);
    }
  }

  return { sent, recipients: recipients.length, message_ids };
}

/**
 * 건당 1메시지 발송 — 콘텐츠 제작 브리프 + 승인/반려 버튼.
 * fit_score 가 낮거나 brief 가 없는 아이템은 자동 skip(부정확한 콘텐츠 알림 방지).
 *
 * @param {{ jobId: string, minFitScore?: number, productionUrl?: string }} args
 * @returns {Promise<{ sent_items: number, recipients: number, skipped_low_fit: number, skipped_reason?: string }>}
 */
export async function sendItemCards({ jobId, minFitScore = 0.3 }) {
  if (!supabaseAdmin) throw new Error('service role 미설정');

  const { data: items } = await supabaseAdmin
    .from('agent_items')
    .select('id, source, post_url, posted_at, collected_at, normalized, summary, translation, classification, notified_at')
    .eq('job_id', jobId)
    .eq('status', 'collected')
    .is('notified_at', null)
    .order('collected_at', { ascending: false })
    .limit(50);

  if (!items || items.length === 0) {
    return { sent_items: 0, recipients: 0, skipped_low_fit: 0, skipped_reason: '신규 아이템 없음' };
  }

  const { data: recipients } = await supabaseAdmin
    .from('agent_telegram_recipients')
    .select('chat_id')
    .eq('active', true);

  if (!recipients || recipients.length === 0) {
    return { sent_items: 0, recipients: 0, skipped_low_fit: 0, skipped_reason: '활성 수신자 없음' };
  }

  let sentItems = 0;
  let skippedLowFit = 0;

  for (const item of items) {
    const fit = item.classification?.fit_score;
    // fit_score 가 명시적으로 낮은 경우만 skip — null 은 통과(브리프 미생성도 일단 보냄).
    if (typeof fit === 'number' && fit < minFitScore) {
      skippedLowFit += 1;
      continue;
    }

    const cardText = buildItemCard(item);
    const buttons = buildItemButtons(item.id);

    let lastMessageId = null;
    let sentToAny = false;

    for (const r of recipients) {
      try {
        const result = await sendInlineMessage({ chatId: r.chat_id, text: cardText, buttons });
        if (result?.message_id) {
          lastMessageId = result.message_id;
          sentToAny = true;
        }
      } catch (e) {
        console.error(`카드 발송 실패 item=${item.id} chat=${r.chat_id}:`, e.message);
      }
    }

    if (sentToAny) {
      sentItems += 1;
      await supabaseAdmin
        .from('agent_items')
        .update({
          notified_at: new Date().toISOString(),
          notification_message_id: lastMessageId,
        })
        .eq('id', item.id);
    }
  }

  return {
    sent_items: sentItems,
    recipients: recipients.length,
    skipped_low_fit: skippedLowFit,
  };
}
