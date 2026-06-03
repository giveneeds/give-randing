import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchIssueCandidatesForTelegram,
  sendIssueCandidatesToChat,
} from '@/lib/agent/sendIssueResearchCandidates';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { data: recipients, error: recipientError } = await supabaseAdmin
      .from('agent_telegram_recipients')
      .select('chat_id')
      .eq('active', true);

    if (recipientError) throw recipientError;
    if (!recipients?.length) {
      return NextResponse.json({ error: '활성 텔레그램 수신자가 없습니다.' }, { status: 400 });
    }

    const { issues, meta } = await fetchIssueCandidatesForTelegram({
      origin: request.nextUrl.origin,
      categories: body.categories,
      recency: body.recency,
      excludeHistory: body.excludeHistory,
      customPrompt: body.customPrompt,
    });

    let delivered = 0;
    const errors = [];
    for (const recipient of recipients) {
      try {
        await sendIssueCandidatesToChat({
          chatId: recipient.chat_id,
          issues,
        });
        delivered += 1;
      } catch (error) {
        errors.push({ chat_id: recipient.chat_id, error: error.message });
      }
    }

    return NextResponse.json({
      ok: delivered > 0,
      delivered_count: delivered,
      recipient_count: recipients.length,
      issue_count: issues.length,
      errors,
      model: meta.model,
      excluded_history_count: meta.excluded_history_count || 0,
      local_excluded_history_count: meta.local_excluded_history_count || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '이슈 후보 텔레그램 발송 실패' }, { status: 500 });
  }
}
