#!/usr/bin/env node
/**
 * 콘텐츠 스튜디오 파이프라인 명세서 + 다이어그램 PNG를
 * agent_telegram_recipients 의 active 수신자 전체에게 발송.
 *
 * 콘텐츠 발송 로직과 동일하게 active=true 만 대상.
 * chat_id/username 은 transcript 에 출력하지 않음 (PII 보호).
 *
 * Node 18+ 의 내장 fetch / FormData / Blob 사용 (외부 의존 없음).
 *
 * 사용법:
 *   node scripts/send-spec-to-recipients.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 간이 파서
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOT_TOKEN) { console.error('TELEGRAM_BOT_TOKEN missing'); process.exit(1); }
if (!SB_URL || !SB_KEY) { console.error('Supabase env missing'); process.exit(1); }

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DIAG_DIR = path.join(__dirname, '..', 'docs', 'diagrams');
const SPEC = path.join(__dirname, '..', 'docs', 'content-studio-pipeline-spec.md');

const sb = createClient(SB_URL, SB_KEY);

async function sendText(chatId, text) {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.json();
}

function fileBlob(filePath) {
  const buf = fs.readFileSync(filePath);
  return new Blob([buf]);
}

async function sendPhoto(chatId, filePath, caption) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', caption);
  fd.append('parse_mode', 'HTML');
  fd.append('photo', fileBlob(filePath), path.basename(filePath));
  const res = await fetch(`${API}/sendPhoto`, { method: 'POST', body: fd });
  return res.json();
}

async function sendDoc(chatId, filePath, caption) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', caption);
  fd.append('parse_mode', 'HTML');
  fd.append('document', fileBlob(filePath), path.basename(filePath));
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: fd });
  return res.json();
}

const PAYLOAD = [
  { type: 'text', text:
`<b>📘 콘텐츠 스튜디오 파이프라인 명세서 (한국어판 재발송)</b>
<i>2026-05-20 기준 · 다이어그램 라벨을 한국어로 교체</i>

5탭 IA · 주제 → 리서치 → 검토함 → 발행 → 진행

다이어그램 4종 + 전체 명세서(.md) 순서로 전달합니다.
이전 발송본은 무시하셔도 됩니다.` },
  { type: 'photo', file: '01-overview.png', caption:
`<b>① 전체 파이프라인 오버뷰</b>
외부 소스 → 5탭 → Supabase DB 데이터 흐름` },
  { type: 'photo', file: '02-review-state.png', caption:
`<b>② 검토함 상태 머신</b>
collected → reviewed → approved → notified / thread_drafted` },
  { type: 'photo', file: '03-thread-conversion.png', caption:
`<b>③ 스레드 변환 흐름</b>
검토함 → convertItemToThreadDraft → KB 주입 → LLM → thread_drafts` },
  { type: 'photo', file: '04-collect-sequence.png', caption:
`<b>④ 수집 시퀀스</b>
cron → collect → enrich(LLM) → agent_items + agent_ai_logs` },
  { type: 'doc', file: SPEC, caption:
`<b>📎 전체 명세서 (Markdown)</b>
의존성 매트릭스 · 외부 의존성 · 알려진 취약점 · 변경 체크리스트 포함` },
];

async function sendOneRecipient(chatId) {
  let ok = 0, fail = 0;
  for (const step of PAYLOAD) {
    try {
      let r;
      if (step.type === 'text') r = await sendText(chatId, step.text);
      else if (step.type === 'photo') r = await sendPhoto(chatId, path.join(DIAG_DIR, step.file), step.caption);
      else if (step.type === 'doc') r = await sendDoc(chatId, step.file, step.caption);
      if (r && r.ok) ok++; else { fail++; console.error('  step fail:', step.type, '-', (r && r.description) || 'unknown'); }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      fail++;
      console.error('  step error:', step.type, '-', e.message);
    }
  }
  return { ok, fail };
}

(async () => {
  const { data: recipients, error } = await sb
    .from('agent_telegram_recipients')
    .select('id, chat_id, active')
    .eq('active', true);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  if (!recipients || recipients.length === 0) {
    console.log('활성 수신자 없음. (agent_telegram_recipients.active=true 행 0개)');
    process.exit(0);
  }
  console.log(`활성 수신자 ${recipients.length}명 발송 시작 (chat_id 출력 생략).`);
  let totalOk = 0, totalFail = 0, recipientsOk = 0, recipientsFail = 0;
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    console.log(`[${i + 1}/${recipients.length}] 발송 중...`);
    const { ok, fail } = await sendOneRecipient(r.chat_id);
    totalOk += ok; totalFail += fail;
    if (fail === 0) recipientsOk++; else recipientsFail++;
  }
  console.log(`완료: 수신자 ${recipientsOk} ok / ${recipientsFail} 실패  ·  스텝 ${totalOk} ok / ${totalFail} 실패 (수신자당 6스텝)`);
})();
