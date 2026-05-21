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
`<b>📘 콘텐츠 스튜디오 파이프라인 명세서 (결정 맥락판)</b>
<i>2026-05-21 갱신</i>

이번 버전 추가/수정:
• <b>주요 결정 지점</b> 섹션 신설 — 왜 지금 이 모양인지 9개 결정 정리
• <b>매일 도는 자동 워크플로우 7단계</b> 추가 (이전 버전 누락분)
• 5탭 명칭 일부 변경: 발행 → 보관함
• 외래어를 한국어로 정리 (드래프트→초안, 트리거→실행, 다이제스트→일일 요약 등)
• 다이어그램 1·2·3 갱신 + 신규 5번 다이어그램 추가

다이어그램 5종 + 명세서(.md) 순서로 전달합니다.` },
  { type: 'photo', file: '01-overview.png', caption:
`<b>① 전체 파이프라인 (자동 루프 + 5탭 통합)</b>
외부 세계 · 매일 도는 7단계 자동 루프 · 어드민 5탭 · DB 한 그림에` },
  { type: 'photo', file: '05-auto-workflow.png', caption:
`<b>② 매일 도는 자동 워크플로우 7단계</b>
수집 → 1차 자연어 보고 → 정욱님 응답 → 의도 파싱 → 깊이 리서치 → 초안 생성 → 마무리 보고` },
  { type: 'photo', file: '04-collect-sequence.png', caption:
`<b>③ 수집 단계 상세 (자동 루프 1단계)</b>
크론 → 매체별 1건 cap → enrich(LLM) → agent_items` },
  { type: 'photo', file: '02-review-state.png', caption:
`<b>④ 검토함 상태 머신</b>
새자료 → 살펴봄 → 채택됨 → 알림완료 / 초안화됨` },
  { type: 'photo', file: '03-thread-conversion.png', caption:
`<b>⑤ 스레드 초안 생성 흐름</b>
채택 → convertItemToThreadDraft → KB 5종 주입 → LLM → thread_drafts` },
  { type: 'doc', file: SPEC, caption:
`<b>📎 명세서 전문 (Markdown · 25KB+)</b>
주요 결정 지점 9개 · 자동 워크플로우 7단계 · 의존성 표 · 문제 해결 · 회귀 시험 절차` },
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
