#!/usr/bin/env node
/**
 * 바이럴 품질 강화(engagement_intent + hook 5종 + 고백 3인칭) e2e 검증.
 * - 테스트 job/item/session 을 source='goal_test' 로 격리 생성 (기존 데이터 안 건드림)
 * - 로컬 webhook 에 X-Giveneeds-Sync-Finish:1 로 "후보 1" 동기 실행
 * - 생성된 variants 의 hook_pattern / engagement_intent 다양성 + 고백 1인칭 날조 여부 확인
 * - 검증 후 생성 데이터 정리 여부는 --cleanup 플래그로
 *
 * 사용법:
 *   node scripts/goal-e2e-test.js            # 생성+검증 (정리 안 함)
 *   node scripts/goal-e2e-test.js --cleanup  # 직전 생성한 테스트 데이터 삭제
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CTX_FILE = path.join(__dirname, '..', 'docs', 'reference-data', 'goal-e2e-context.json');
const WEBHOOK = 'http://localhost:3000/api/webhook/telegram';

async function cleanup() {
  if (!fs.existsSync(CTX_FILE)) { console.log('정리할 컨텍스트 파일 없음'); return; }
  const ctx = JSON.parse(fs.readFileSync(CTX_FILE, 'utf8'));
  await sb.from('thread_drafts').delete().eq('agent_item_id', ctx.itemId);
  await sb.from('planning_sessions').delete().eq('id', ctx.sessionId);
  await sb.from('agent_items').delete().eq('id', ctx.itemId);
  await sb.from('agent_jobs').delete().eq('id', ctx.jobId);
  fs.unlinkSync(CTX_FILE);
  console.log('테스트 데이터 삭제 완료:', ctx.itemId);
}

async function run() {
  const { data: recipients } = await sb.from('agent_telegram_recipients').select('chat_id').eq('active', true).limit(1);
  if (!recipients?.length) throw new Error('active telegram recipient 없음');
  const chatId = recipients[0].chat_id;
  const now = new Date().toISOString();

  const { data: job, error: jobErr } = await sb.from('agent_jobs')
    .insert({ started_at: now, finished_at: now, status: 'success', trigger: 'goal_test', stats: { purpose: 'viral_quality_e2e' } })
    .select('id').single();
  if (jobErr) throw jobErr;

  const itemPayload = {
    job_id: job.id, source: 'goal_test', source_account: 'e2e', post_id: `goal-e2e-${Date.now()}`,
    post_url: 'https://example.com/goal-e2e', posted_at: now, raw_data: { goal_test: true },
    normalized: { title: '에이전틱 AI가 마케팅 업무에 들어오기 시작했다', extracted_text: '해외에서 에이전틱 AI가 광고 세팅, 리뷰 응대, 콘텐츠 초안까지 사람 대신 처리하는 사례가 늘고 있다. 도구 이름만 늘어나는 게 아니라 실제 업무 흐름의 일부를 맡기 시작했다. 작은 사업자 입장에선 "이걸 지금 써야 하나, 아직 이른가" 가 헷갈린다.' },
    classification: {
      suggested_persona: 'small_business_owner', suggested_topic_cluster: 'ai_marketing', fit_score: 0.86,
      reader_problem: 'AI가 실제 마케팅 업무에 어디까지 들어왔는지 감이 안 온다',
      why_now: '해외에서 실제 업무를 맡기는 사례가 나오기 시작했다',
      content_angle: 'AI가 도구 이름이 아니라 업무 흐름으로 들어오는 변화',
      content_angles: ['AI에게 맡길 수 있는 마케팅 업무 경계', '아직 사람이 해야 하는 부분'],
      recommended_title: 'AI에게 마케팅을 어디까지 맡겨도 될까',
      practical_takeaway: '도구 이름이 아니라 어떤 업무를 줄이는지로 봐야 한다', risk_flags: [],
    },
    summary: { one_line_summary: '에이전틱 AI가 마케팅 업무 흐름으로 들어오는 변화를 작은 사업자 관점에서 풀 수 있다' },
    translation: { translated_title: '에이전틱 AI 마케팅 업무 진입', translated_text: '해외에서 에이전틱 AI가 광고/리뷰/콘텐츠 초안 업무를 맡는 사례가 늘고 있다.' },
    research_context: { source: 'goal_test', pain_points: ['AI가 실제로 어디 쓰이는지 모호', '도구명만 많고 적용 기준 없음'] },
    status: 'collected', send_flag: false,
  };
  const { data: item, error: itemErr } = await sb.from('agent_items').insert(itemPayload).select('id, normalized, classification, summary, post_url').single();
  if (itemErr) throw itemErr;

  const candidatesSummary = {
    [item.id]: {
      label: '[후보 1]', candidate_index: 1, id: item.id, theme: 'goal_test',
      persona: 'small_business_owner', topic_cluster: 'ai_marketing', fit_score: 0.86,
      title: item.normalized.title, one_line: item.summary.one_line_summary,
      recommended_title: item.classification.recommended_title, content_angle: item.classification.content_angle,
      reader_problem: item.classification.reader_problem, risk_flags: [], source: 'goal_test',
      url: item.post_url,
    },
  };
  const { data: session, error: sessErr } = await sb.from('planning_sessions')
    .insert({ job_id: job.id, status: 'phase1_reported', candidate_item_ids: [item.id], candidates_summary: candidatesSummary, report_text_phase1: 'e2e 테스트', telegram_chat_id: chatId })
    .select('id').single();
  if (sessErr) throw sessErr;

  fs.writeFileSync(CTX_FILE, JSON.stringify({ jobId: job.id, sessionId: session.id, itemId: item.id, chatId }, null, 2));
  console.log('테스트 데이터 생성:', { jobId: job.id, sessionId: session.id, itemId: item.id });
  console.log('webhook 동기 실행 중... (LLM 7 variant 생성, 수십 초 소요)');

  const update = { update_id: Date.now(), message: { message_id: Date.now(), date: Math.floor(Date.now() / 1000), chat: { id: chatId, type: 'private' }, from: { id: chatId, is_bot: false, first_name: 'E2E' }, text: '후보 1' } };
  const res = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TELEGRAM_WEBHOOK_SECRET, 'X-Giveneeds-Sync-Finish': '1' }, body: JSON.stringify(update) });
  console.log('webhook 응답:', res.status, await res.text());

  const { data: drafts } = await sb.from('thread_drafts')
    .select('id, title, posts, hook_pattern, tone_pattern, format_type, research_context_used')
    .eq('agent_item_id', item.id).order('created_at', { ascending: true });

  console.log(`\n=== 생성된 variants: ${drafts?.length || 0}개 ===`);
  const hookSet = new Set(), intentSet = new Set();
  for (const d of drafts || []) {
    const posts = Array.isArray(d.posts) ? d.posts : [];
    const totalChars = posts.reduce((s, p) => s + String(p.body || '').length, 0);
    const gen = d.research_context_used?.generation_decision || {};
    const intent = gen.engagement_intent || '(없음)';
    hookSet.add(d.hook_pattern); intentSet.add(intent);
    const fullText = posts.map((p) => p.body).join(' ');
    // 1인칭 날조 의심 패턴
    const firstPersonClaim = /(저는|제가|저도)\s*[^.]*?(써봤|해봤|날렸|운영|경험)/.test(fullText);
    console.log(`\n[${d.title}]`);
    console.log(`  hook=${d.hook_pattern} / intent=${intent} / format=${d.format_type} / ${posts.length}p ${totalChars}자`);
    console.log(`  1인칭 경험 날조 의심: ${firstPersonClaim ? '⚠️ YES' : 'no'}`);
    console.log(`  미리보기: ${(posts[0]?.body || '').slice(0, 90)}…`);
  }
  console.log(`\n=== 다양성 ===`);
  console.log(`hook_pattern 종류: ${[...hookSet].join(', ')}`);
  console.log(`engagement_intent 종류: ${[...intentSet].join(', ')}`);
}

(async () => {
  if (process.argv.includes('--cleanup')) { await cleanup(); return; }
  await run();
})().catch((e) => { console.error(e); process.exit(1); });
