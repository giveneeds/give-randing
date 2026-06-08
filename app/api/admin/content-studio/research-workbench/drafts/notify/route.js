import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInlineMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    const posts = polishedDraft.posts;
    const title = issueTitle || contentPlan?.planning_title || '이슈 발행 완성본';
    const modeLabel = mode === 'b' ? 'B안 (소나르 리서치)' : 'A안 (소나르 없이)';
    const scoreText = typeof critiqueScore === 'number' ? ` | 비평 ${critiqueScore}/100` : '';
    const headerText = `📝 <b>[자동 발행 완성본]</b>\n${title}\n<i>${modeLabel}${scoreText} · 총 ${posts.length}개 포스트</i>`;

    let delivered = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        // 헤더 메시지 먼저
        await sendInlineMessage({ chatId: recipient.chat_id, text: headerText });
        // 포스트 1개 = 메시지 1개
        for (const post of posts) {
          await sendInlineMessage({ chatId: recipient.chat_id, text: post });
        }
        delivered += 1;
      } catch (error) {
        errors.push({ chat_id: recipient.chat_id, error: error.message });
      }
    }

    return NextResponse.json({
      ok: delivered > 0,
      delivered_count: delivered,
      recipient_count: recipients.length,
      post_count: posts.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '초안 텔레그램 발송 실패' }, { status: 500 });
  }
}
