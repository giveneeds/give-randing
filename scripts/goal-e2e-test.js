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
  if (!ctx.realItem) {
    await sb.from('agent_items').delete().eq('id', ctx.itemId);
    await sb.from('agent_jobs').delete().eq('id', ctx.jobId);
  }
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

  // --item=<id> 로 실제 수집 item 사용. 없으면 가짜 테스트 item 생성.
  const useItemId = (process.argv.find((a) => a.startsWith('--item=')) || '').split('=')[1];
  let item;
  if (useItemId) {
    const { data, error } = await sb.from('agent_items')
      .select('id, source, normalized, classification, summary, post_url').eq('id', useItemId).single();
    if (error || !data) throw new Error('실제 item 조회 실패: ' + useItemId);
    item = data;
    console.log('실제 수집 item 사용:', item.id, '/', (item.normalized?.title || '').slice(0, 40));
  } else {
    const itemPayload = {
      job_id: job.id, source: 'goal_test', source_account: 'e2e', post_id: `goal-e2e-${Date.now()}`,
      post_url: 'https://example.com/goal-e2e', posted_at: now, raw_data: { goal_test: true },
      normalized: { title: '에이전틱 AI가 마케팅 업무에 들어오기 시작했다', extracted_text: '해외에서 에이전틱 AI가 광고 세팅, 리뷰 응대, 콘텐츠 초안까지 사람 대신 처리하는 사례가 늘고 있다.' },
      classification: {
        suggested_persona: 'small_business_owner', suggested_topic_cluster: 'ai_marketing', fit_score: 0.86,
        reader_problem: 'AI가 실제 마케팅 업무에 어디까지 들어왔는지 감이 안 온다',
        content_angle: 'AI가 도구 이름이 아니라 업무 흐름으로 들어오는 변화',
        recommended_title: 'AI에게 마케팅을 어디까지 맡겨도 될까', risk_flags: [],
      },
      summary: { one_line_summary: '에이전틱 AI가 마케팅 업무 흐름으로 들어오는 변화' },
      translation: { translated_title: '에이전틱 AI 마케팅 업무 진입', translated_text: '해외에서 AI가 마케팅 업무를 맡는 사례가 늘고 있다.' },
      research_context: { source: 'goal_test', pain_points: ['AI가 실제로 어디 쓰이는지 모호'] },
      status: 'collected', send_flag: false,
    };
    const { data, error: itemErr } = await sb.from('agent_items').insert(itemPayload).select('id, source, normalized, classification, summary, post_url').single();
    if (itemErr) throw itemErr;
    item = data;
  }

  const c = item.classification || {};
  // 후보 1개를 composeDailyReport.baseCandidate 와 동일한 모양으로 구성.
  // creative_brief 는 enrich 의 generic 값으로 초기화한 뒤, 아래서 LLM sharpening 을 거쳐 덮어쓴다.
  const candidate = {
    label: '[후보 1]', candidate_index: 1, id: item.id, theme: 'goal_test',
    persona: c.suggested_persona || 'general', topic_cluster: c.suggested_topic_cluster || '', fit_score: c.fit_score || 0.8,
    title: item.normalized?.title, one_line: item.summary?.one_line_summary,
    recommended_title: c.recommended_title, content_angle: c.content_angle,
    reader_problem: c.reader_problem, risk_flags: [], source: item.source || 'goal_test',
    url: item.post_url,
    creative_brief: {
      topic_title: c.recommended_title || item.normalized?.title || null,
      reader_problem: c.reader_problem || null,
      core_angle: c.content_angle || (Array.isArray(c.content_angles) ? c.content_angles[0] : null),
      hook_candidate: null,
      evidence_needed: Array.isArray(c.content_angles) ? c.content_angles.slice(0, 3) : [],
    },
  };
  console.log('\n=== sharpening 전 creative_brief ===');
  console.log('  core_angle:', candidate.creative_brief.core_angle);
  console.log('  evidence_needed:', JSON.stringify(candidate.creative_brief.evidence_needed));
  // composeDailyReport.sharpenCreativeBriefs 의 프롬프트를 그대로 미러해 직접 OpenAI 호출.
  // (raw node 는 @/lib 별칭을 못 풀어서 production 함수 dynamic import 불가 — 같은 프롬프트로 결과는 동등하게 검증.)
  await sharpenInline(candidate);
  console.log('=== sharpening 후 creative_brief ===');
  console.log('  topic_title:', candidate.creative_brief.topic_title);
  console.log('  reader_problem:', candidate.creative_brief.reader_problem);
  console.log('  core_angle:', candidate.creative_brief.core_angle);
  console.log('  hook_candidate:', candidate.creative_brief.hook_candidate);
  console.log('  evidence_needed:', JSON.stringify(candidate.creative_brief.evidence_needed));
  const candidatesSummary = { [item.id]: candidate };
  const { data: session, error: sessErr } = await sb.from('planning_sessions')
    .insert({ job_id: job.id, status: 'phase1_reported', candidate_item_ids: [item.id], candidates_summary: candidatesSummary, report_text_phase1: 'e2e 테스트', telegram_chat_id: chatId })
    .select('id').single();
  if (sessErr) throw sessErr;

  fs.writeFileSync(CTX_FILE, JSON.stringify({ jobId: job.id, sessionId: session.id, itemId: item.id, chatId, realItem: Boolean(useItemId) }, null, 2));
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

// composeDailyReport.sharpenCreativeBriefs 의 production 프롬프트 미러.
// 같은 시스템 프롬프트 + 같은 JSON 스키마 → e2e 결과가 production 과 동등.
// production 코드와 분리돼 있으니 프롬프트 변경 시 양쪽 동기화 필요(주석 표기).
async function sharpenInline(candidate) {
  const sys = [
    '[금지어 — 이유와 대안]',
    '1) "AI는 도구일 뿐" / "결국 본질은 사람" / "차별점이 중요하다" → 어디 붙여도 맞는 결론. 금지.',
    '2) "전환율" "퍼널" "고객 의도" "구매 여정" → 독자가 안 쓰는 말. 현장어로 ("광고비는 그대로인데 전화가 줄었다").',
    '3) "망합니다" "끝입니다" "무조건 해야" → 공포 일회성. 대신 "잘하는 곳은 조용히 바꾸고 있다".',
    '4) "저도 해봤어요" 봇 1인칭 날조 금지. "어떤 사장님이…" 3인칭.',
    '5) "자영업자 여러분" 단정 호칭 금지.',
    '',
    '너는 기브니즈 콘텐츠의 "콘셉트 다듬기 + 기획 에이전트" 다. 각 후보를 "발행 가능한 날선 콘셉트" + "글이 독자에게 일으킬 변화" 로 다시 적는다.',
    '',
    '각 후보마다 8개 필드 JSON.',
    '[기존 5필드]',
    '- topic_title: 30자 이내. 자료 원제 반복 X.',
    '- reader_problem: 마케터·운영자가 지금 갖고 있는 고민 1줄. 현장어. 마케팅 용어 금지.',
    '- core_angle: 날선 주장 1문장. 양비론·"둘 다 중요" 금지.',
    '- hook_candidate: 첫 줄 후보 30자 이내, 결론 미완성.',
    '- evidence_needed: 구체 근거 2~4개. 추상어 금지.',
    '[신규 3필드 — 기획]',
    '- planning_purpose: ["change"|"resolve"|"improve"] 의 1~2개. change=관점/기준 바꾸기, resolve=문제 풀기, improve=지금 하는 걸 더 잘하게.',
    '- reader_takeaway: 읽고 나면 머릿속에 남는 1문장. **"행동:" / "관점:" / "기준:" prefix 강제**. 추상("영감을 얻는다") 금지.',
    '- proof_anchor_type: ["numbers"|"case"|"workflow"|"comparison"] 의 1~2개.',
    '',
    '[GOOD] core_angle "AI 가 초안을 쓰는 지금, 마케터의 값어치는 어떤 초안을 버릴지 아는 판단에서 나온다" / planning_purpose ["change"] / reader_takeaway "기준: AI 카피를 채택하기 전에 독자가 멈춰 읽을 단어 한 개가 있는지부터 본다" / proof_anchor_type ["case","comparison"].',
    '',
    '출력은 JSON 만: {"briefs":[{"id":"<원본 id>","topic_title":"...","reader_problem":"...","core_angle":"...","hook_candidate":"...","evidence_needed":["..."],"planning_purpose":["..."],"reader_takeaway":"<prefix>: ...","proof_anchor_type":["..."]}]}',
  ].join('\n');
  const payload = [{
    id: candidate.id, label: candidate.label, title: candidate.title,
    content_angle: candidate.content_angle, reader_problem: candidate.reader_problem,
    persona: candidate.persona, source: candidate.source, theme: candidate.theme,
  }];
  const userMsg = `다듬을 후보들:\n${JSON.stringify(payload, null, 2)}\n\n같은 id 를 유지하면서 5개 필드를 날카롭게 다시 적어라.`;
  const model = process.env.OPENAI_PLANNING_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model, temperature: 0.4, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) { console.error('sharpenInline 실패:', res.status, (await res.text()).slice(0, 200)); return; }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '{}';
  let obj; try { obj = JSON.parse(content); } catch { console.error('JSON parse 실패'); return; }
  const sharp = (obj.briefs || []).find((b) => String(b?.id) === String(candidate.id));
  if (!sharp) { console.warn('sharp id 매칭 실패'); return; }
  const str = (v) => typeof v === 'string' && v.trim() ? v.trim() : null;
  const ev = Array.isArray(sharp.evidence_needed)
    ? sharp.evidence_needed.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4)
    : candidate.creative_brief?.evidence_needed || [];
  const VALID_PURPOSE = new Set(['change', 'resolve', 'improve']);
  const VALID_PROOF = new Set(['numbers', 'case', 'workflow', 'comparison']);
  const planningPurpose = Array.isArray(sharp.planning_purpose)
    ? sharp.planning_purpose.filter((x) => typeof x === 'string' && VALID_PURPOSE.has(x)).slice(0, 2)
    : [];
  const proofAnchor = Array.isArray(sharp.proof_anchor_type)
    ? sharp.proof_anchor_type.filter((x) => typeof x === 'string' && VALID_PROOF.has(x)).slice(0, 2)
    : [];
  let takeaway = str(sharp.reader_takeaway) || null;
  if (takeaway && !/^(행동|관점|기준)\s*[:：]/.test(takeaway)) takeaway = `행동: ${takeaway}`;
  candidate.creative_brief = {
    topic_title: (str(sharp.topic_title) || candidate.creative_brief?.topic_title || null)?.slice(0, 80) || null,
    reader_problem: (str(sharp.reader_problem) || candidate.creative_brief?.reader_problem || null)?.slice(0, 200) || null,
    core_angle: (str(sharp.core_angle) || candidate.creative_brief?.core_angle || null)?.slice(0, 240) || null,
    hook_candidate: (str(sharp.hook_candidate) || candidate.creative_brief?.hook_candidate || null)?.slice(0, 60) || null,
    evidence_needed: ev,
    planning_purpose: planningPurpose,
    reader_takeaway: takeaway?.slice(0, 240) || null,
    proof_anchor_type: proofAnchor,
  };
}

(async () => {
  if (process.argv.includes('--cleanup')) { await cleanup(); return; }
  await run();
})().catch((e) => { console.error(e); process.exit(1); });
