import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInlineMessage, tgEscape } from '@/lib/telegram';

function clamp(text, max = 700) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function buildIssueCard(issue, index) {
  const title = issue.issue_title || `이슈 후보 ${index + 1}`;
  const hook = issue.one_line_hook || '';
  const why = issue.why_interesting || '';
  const changed = issue.what_changed || '';
  const source = issue.source_summary || issue.recency_note || '';
  const novelty = issue.novelty_note || '';

  return [
    `<b>[이슈 후보 ${index + 1}]</b>`,
    `ID: ${tgEscape(issue.issue_id || `i${index + 1}`)}`,
    `제목: ${tgEscape(title)}`,
    hook ? `훅: ${tgEscape(clamp(hook, 220))}` : '',
    why ? `왜 볼 만한가: ${tgEscape(clamp(why, 420))}` : '',
    changed ? `무엇이 바뀌었나: ${tgEscape(clamp(changed, 360))}` : '',
    source ? `출처 신호: ${tgEscape(clamp(source, 300))}` : '',
    novelty ? `중복 제외: ${tgEscape(clamp(novelty, 260))}` : '',
  ].filter(Boolean).join('\n');
}

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

    const issuesRes = await fetch(new URL('/api/admin/content-studio/research-workbench/issues', request.nextUrl.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: body.categories,
        recency: body.recency,
        excludeHistory: body.excludeHistory,
        customPrompt: body.customPrompt,
      }),
    });
    const issuesJson = await issuesRes.json();
    if (!issuesRes.ok) {
      return NextResponse.json(
        { error: issuesJson.error || '이슈 후보 수집 실패', raw: issuesJson },
        { status: issuesRes.status }
      );
    }

    const issues = Array.isArray(issuesJson.issues) ? issuesJson.issues.slice(0, 8) : [];
    if (!issues.length) {
      return NextResponse.json({
        error: 'Sonar 검색은 완료됐지만 보낼 이슈 후보가 없습니다.',
        meta: issuesJson,
      }, { status: 422 });
    }

    let delivered = 0;
    const errors = [];
    for (const recipient of recipients) {
      try {
        await sendInlineMessage({
          chatId: recipient.chat_id,
          text:
            '<b>기브니즈 이슈 후보</b>\n' +
            '하나를 고르면 워크벤치에서 Claude 해석부터 이어갈 수 있습니다.\n' +
            '같은 기사·같은 angle은 로컬 이력 기준으로 제외 요청했습니다.',
        });
        for (const [index, issue] of issues.entries()) {
          const callbackIssueId = `i${index + 1}`;
          await sendInlineMessage({
            chatId: recipient.chat_id,
            text: buildIssueCard(issue, index),
            buttons: [[
              {
                text: '이 이슈로 시작',
                callback_data: `issue_select:${callbackIssueId}`,
              },
            ]],
          });
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
      issue_count: issues.length,
      errors,
      model: issuesJson.model,
      excluded_history_count: issuesJson.excluded_history_count || 0,
      local_excluded_history_count: issuesJson.local_excluded_history_count || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '이슈 후보 텔레그램 발송 실패' }, { status: 500 });
  }
}
