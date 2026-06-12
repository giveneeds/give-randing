import { sendInlineMessage, tgEscape } from '@/lib/telegram';

function clamp(text, max = 700) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

export function buildIssueCandidateTelegramCard(issue, index) {
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

export async function fetchIssueCandidatesForTelegram({
  origin,
  recency,
  excludeHistory,
  customPrompt,
} = {}) {
  if (!origin) throw new Error('origin이 필요합니다.');

  const issuesRes = await fetch(new URL('/api/admin/content-studio/research-workbench/issues', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recency,
      excludeHistory,
      customPrompt,
    }),
  });
  const issuesJson = await issuesRes.json();
  if (!issuesRes.ok) {
    throw new Error(issuesJson.error || '이슈 후보 수집 실패');
  }

  const issues = Array.isArray(issuesJson.issues) ? issuesJson.issues.slice(0, 8) : [];
  if (!issues.length) {
    const error = new Error('Sonar 검색은 완료됐지만 보낼 이슈 후보가 없습니다.');
    error.meta = issuesJson;
    throw error;
  }

  return { issues, meta: issuesJson };
}

export async function sendIssueCandidatesToChat({ chatId, issues, introText } = {}) {
  if (!chatId) throw new Error('chatId가 필요합니다.');
  if (!Array.isArray(issues) || !issues.length) throw new Error('보낼 이슈 후보가 없습니다.');

  await sendInlineMessage({
    chatId,
    text:
      introText ||
      '<b>기브니즈 이슈 후보</b>\n' +
      '하나를 고르면 워크벤치에서 Claude 해석부터 이어갈 수 있습니다.\n' +
      '같은 기사·같은 angle은 로컬 이력 기준으로 제외 요청했습니다.',
  });

  for (const [index, issue] of issues.entries()) {
    const callbackIssueId = `i${index + 1}`;
    await sendInlineMessage({
      chatId,
      text: buildIssueCandidateTelegramCard(issue, index),
      buttons: [[
        {
          text: '이 이슈로 시작',
          callback_data: `issue_select:${callbackIssueId}`,
        },
      ]],
    });
  }
}
