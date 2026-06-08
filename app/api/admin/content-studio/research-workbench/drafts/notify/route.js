import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInlineMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 30;

function formatDraftMessage({ polishedDraft, contentPlan, issueTitle, mode, critiqueScore }) {
  const posts = Array.isArray(polishedDraft?.posts) ? polishedDraft.posts : [];
  const title = issueTitle || contentPlan?.planning_title || '이슈 발행 완성본';
  const modeLabel = mode === 'b' ? 'B안 (소나르 리서치)' : 'A안 (소나르 없이)';
  const scoreText = typeof critiqueScore === 'number' ? ` | 비평 ${critiqueScore}/100` : '';

  const header = `📝 <b>[자동 발행 완성본]</b>\n${title}\n<i>${modeLabel}${scoreText}</i>`;

  // Telegram 4096자 제한 — 앞 4개 포스트만 발송, 나머지는 개수 안내
  const preview = posts.slice(0, 4);
  const remaining = posts.length - preview.length;
  const postsText = preview.map((p, i) => `<b>[${i + 1}]</b>\n${p}`).join('\n\n—\n\n');
  const footer = remaining > 0 ? `\n\n<i>... 외 ${remaining}개 포스트 (총 ${posts.length}개)</i>` : '';

  return `${header}\n\n${postsText}${footer}`;
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { polishedDraft, contentPlan, issueTitle, mode, critiqueScore } = body;

    if (!Array.isArray(polishedDraft?.posts) || !polishedDraft.posts.length) {
      return NextResponse.json({ error: '발송할 초안이 없습니다.' }, { status: 400 });
    }

    const { data: recipients, error: recipientError } = await supabaseAdmin
      .from('agent_telegram_recipients')
      .select('chat_id')
      .eq('active', true);

    if (recipientError) throw recipientError;
    if (!recipients?.length) {
      return NextResponse.json({ error: '활성 텔레그램 수신자가 없습니다.' }, { status: 400 });
    }

    const text = formatDraftMessage({ polishedDraft, contentPlan, issueTitle, mode, critiqueScore });

    let delivered = 0;
    const errors = [];
    for (const recipient of recipients) {
      try {
        await sendInlineMessage({ chatId: recipient.chat_id, text });
        delivered += 1;
      } catch (error) {
        errors.push({ chat_id: recipient.chat_id, error: error.message });
      }
    }

    return NextResponse.json({
      ok: delivered > 0,
      delivered_count: delivered,
      recipient_count: recipients.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '초안 텔레그램 발송 실패' }, { status: 500 });
  }
}
