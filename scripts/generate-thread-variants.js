#!/usr/bin/env node
/**
 * 동일 agent_item 1건에 대해 4가지 루브릭 변형으로 스레드 드래프트를 만들어
 * thread_drafts 에 저장한다. 어드민 보관함에서 4개를 나란히 비교하기 위한 도구.
 *
 * 변형:
 *   V1 baseline       — 현재 production 로직 그대로 (대조군)
 *   V2 strong_hook    — 첫 포스트 구체 수치/실수 + 글머리식 금지 + forward pull
 *   V3 narrow_persona — 요식업 사장님 전용 (병원·일반 표현 금지)
 *   V4 anxiety_reframe — 불안 재구성 톤 + 댓글형 CTA
 *
 * 사용법:
 *   node scripts/generate-thread-variants.js <itemId>
 *   (itemId 생략 시 가장 최근 1차 보고에서 채택됐던 item 사용)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정');
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error('OPENAI_API_KEY 미설정');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// docs 인라인 로더 — convertItemToThreadDraft 의 KB 와 등가.
const DOCS_DIR = path.join(__dirname, '..', 'docs');
function readDoc(rel, max = 4000) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, rel), 'utf8').slice(0, max);
  } catch {
    return '';
  }
}

function readDocDirectory(relDir, max = 2800) {
  try {
    return fs.readdirSync(path.join(DOCS_DIR, relDir))
      .filter((filename) => /^\d{2}-.+\.md$/.test(filename))
      .sort()
      .map((filename) => ({
        filename: `${relDir}/${filename}`,
        content: readDoc(`${relDir}/${filename}`, max),
      }))
      .filter((doc) => doc.content);
  } catch {
    return [];
  }
}
function readLatestAudit(max = 4000) {
  try {
    const dir = path.join(DOCS_DIR, 'reference-data');
    const files = fs.readdirSync(dir)
      .filter((f) => /^threads-popular-post-audit-.*\.md$/.test(f))
      .sort();
    if (files.length === 0) return '';
    return fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8').slice(0, max);
  } catch {
    return '';
  }
}

function buildKBBlock({ topicCluster, persona }) {
  const blocks = [];
  const placeRelated = ['place_visibility', 'review_trust', 'local_acquisition', 'local_retention'].includes(topicCluster);
  if (placeRelated) {
    const kb = readDoc('place-marketing-knowledge-base.md');
    const gov = readDoc('place-marketing-content-governance.md');
    if (kb) blocks.push(`[플레이스 마케팅 지식베이스]\n${kb}`);
    if (gov) blocks.push(`[채널별 표현 거버넌스]\n${gov}`);
  }
  const harness = readDoc('threads-content-pattern-harness.md');
  if (harness) blocks.push(`[스레드 콘텐츠 형식 가이드: index]\n${harness}`);
  readDocDirectory('content-logic/threads').forEach((doc) => {
    blocks.push(`[스레드 콘텐츠 형식 가이드: ${doc.filename}]\n${doc.content}`);
  });
  const audit = readLatestAudit();
  if (audit) blocks.push(`[Threads 인기 게시글 관찰 기록]\n${audit}`);
  if (persona && persona !== 'unknown') {
    const personas = readDoc('content-personas.md', 3000);
    if (personas) blocks.push(`[타겟 페르소나 프로필]\n${personas}`);
  }
  return blocks.join('\n\n---\n\n');
}

// 4가지 변형. extraSystemRules 가 system prompt 끝에 주입된다.
const VARIANTS = [
  {
    label: 'V1 baseline',
    titlePrefix: '[V1 베이스라인]',
    formatTypeHint: 'short_thread',
    extraSystemRules: '',
  },
  {
    label: 'V2 strong_hook',
    titlePrefix: '[V2 강한훅+ForwardPull]',
    formatTypeHint: 'short_thread',
    extraSystemRules: `
[변형 규칙 V2 — 강한 훅 + Forward pull]
- 첫 포스트(인덱스 1)는 반드시 구체 수치/시간/실수/관찰 중 1개 이상 포함한다. 예시: "광고비 200만원 써봤는데", "3년차 식당 사장님이 작년에 했던 실수", "월 매출의 7% 가 광고비로 빠지는데도".
- "가장 먼저", "또한", "마지막으로", "스스로 질문해보세요" 같은 글머리식·교과서 톤 어휘 금지.
- 마지막 포스트를 제외한 각 포스트는 끝에 다음 포스트로 잇는 떡밥 한 줄을 둔다. 예: "근데 진짜 문제는 다음 포스트에 있어요" / "이게 끝이 아닙니다 — 다음 단계가 더 중요해요".
- 동일 어구·동일 동사 반복(같은 문장이 2회 이상) 금지.
`.trim(),
  },
  {
    label: 'V3 narrow_persona_restaurant',
    titlePrefix: '[V3 식당사장님전용]',
    formatTypeHint: 'short_thread',
    extraSystemRules: `
[변형 규칙 V3 — 요식업 사장님 전용]
- 타겟은 요식업 사장님 한 명만이다. 병원·원장님·시술·환자·진료 표현 절대 사용 금지.
- "가게나 병원", "사장님/원장님" 같이 두 페르소나 동시 호명 금지.
- 어휘는 다음 영역 안에서만: 메뉴, 대표메뉴, 시즌메뉴, 플레이스, 사진, 리뷰, 답글, 재방문, 단골, 동네, 상권, 마진, 객단가.
- 사장님이 오늘 30분 안에 매장에서 할 수 있는 행동만 제안 (장기 전략 X).
- AI/툴 이야기여도 결국 식당 마케팅 한 장면(메뉴 사진/리뷰 답글/플레이스 첫 화면 등)에 붙여 설명한다.
`.trim(),
  },
  {
    label: 'V4 anxiety_reframe_comment_cta',
    titlePrefix: '[V4 불안재구성+댓글CTA]',
    formatTypeHint: 'short_thread',
    extraSystemRules: `
[변형 규칙 V4 — 불안 재구성 + 댓글형 CTA]
- 톤은 anxiety_reframe — 사장님의 막연한 불안을 정확한 문장으로 잡아주는 데서 시작한다.
- 첫 포스트는 "마케팅을 하고 있는데도 계속 불안한 이유는…" / "광고비를 더 써도 안심이 안 되는 이유는…" 류 패턴.
- 불안을 점검 가능한 구조로 낮춘다(개인 능력 부족이 아니라 플레이스·콘텐츠·유입 구조의 끊김으로 설명).
- 공포·확정몰락·"지금 안 하면 망함" 같은 표현 금지. "100%", "유일한", "최고", "보장" 어휘 금지.
- 마지막 포스트는 댓글형 CTA. 형식: "댓글에 업종(또는 지역) 한 줄 남겨주시면 비슷한 케이스로 진단 예시 만들어 답글로 드릴게요." 같은 자연스러운 응답 유도.
- 마지막 포스트 본문 자체는 호기심 갭으로 닫는다 (단정·결론형 X).
`.trim(),
  },
];

// system prompt — lib/agent/convertItemToThreadDraft.js 와 동등한 베이스 + variant rules.
function buildSystem({ knowledgeBlock, extraSystemRules }) {
  return `너는 기브니즈(B2B 마케팅 에이전시)의 Threads 콘텐츠 작가다.
주 타겟은 요식업 사장님·병의원 원장. 광고티가 강하면 안 되지만, 사장님이 자기 가게/병원에 적용해볼 수 있는 실용적 조언이 보여야 한다.

규칙:
- 각 포스트는 500자 이내. 한글 줄바꿈 활용.
- 첫 포스트는 강한 hook(부정형 자기진단/조건+약속/숫자/통념 거스르기/희소성 등). 첫 줄은 30자 이내.
- 거버넌스에서 "사용하지 않는 표현" 으로 분류된 어휘는 절대 쓰지 않는다.
- 의료광고 영역이면 효과 보장 표현 금지, 진료 권유성 어휘 금지.
- 마지막 포스트에 자연스러운 CTA. 강매 X.
- 본문에 광고/기브니즈 자기소개는 안 한다. CTA에만 가볍게.

${knowledgeBlock ? `[참조 지식·거버넌스]\n${knowledgeBlock}\n\n` : ''}${extraSystemRules ? `${extraSystemRules}\n\n` : ''}출력 형식: JSON 만. 형식:
{
  "title": "내부 식별용 짧은 라벨 (40자 이내)",
  "format_type": "single_post | short_thread | resource_thread",
  "hook_pattern": "curiosity_gap | pain_confession | resource_promise | misconception_break | proof_story | question | anxiety_reframe",
  "tone_pattern": "friendly_practical | expert_plain | personal_story | hype_warning",
  "engagement_drivers": ["save_value" | "share_value" | "identity" | "curiosity" | "free_resource" | "proof" | "anxiety_relief"],
  "posts": [
    { "index": 1, "body": "..." },
    { "index": 2, "body": "..." }
  ],
  "cta": "마지막 포스트 끝에 들어갈 CTA 한 줄",
  "hashtags": ["#사장님마케팅", "#플레이스"],
  "risk_flags": ["과장 위험" 등 주의점, 없으면 빈 배열]
}`;
}

function buildUserPrompt({ item, brief, rc, originalTitle, originalText, formatTypeHint }) {
  return `원문 제목: ${originalTitle}
원문 발췌:
${originalText.slice(0, 1500)}

[브리프]
페르소나: ${brief.suggested_persona || 'general'}
토픽: ${brief.suggested_topic_cluster || '(미지정)'}
추천 제목: ${brief.recommended_title || '(없음)'}
독자 문제: ${brief.reader_problem || '(없음)'}
왜 지금: ${brief.why_now || '(없음)'}
핵심 앵글: ${brief.content_angle || (Array.isArray(brief.content_angles) ? brief.content_angles[0] : '') || '(없음)'}
실용 takeaway: ${brief.practical_takeaway || '(없음)'}
실행 단계: ${(Array.isArray(brief.execution_steps) ? brief.execution_steps.join(' / ') : '(없음)')}
적합도: ${typeof brief.fit_score === 'number' ? Math.round(brief.fit_score * 100) + '%' : '?'}

${rc?.pain_points?.length ? `[리서치에서 관찰된 현재 사장님 페인포인트]\n${rc.pain_points.join(' / ')}\n` : ''}${rc?.viral_hooks?.length ? `[자주 쓰이는 후킹]\n${rc.viral_hooks.map((h) => `${h?.pattern}${h?.example ? ' (예: ' + h.example + ')' : ''}`).join('\n')}\n` : ''}
원문 출처: ${item.post_url}

요청:
- 위 브리프와 리서치를 반영해 ${formatTypeHint === 'single_post' ? 'single_post 1개' : 'short_thread(2~4 포스트)'}로 스레드 초안을 만든다.
- 광고티 X, 실무 적용 가능한 인사이트 중심.
- 출력은 JSON 만.`;
}

async function callOpenAIChat({ model, system, user, temperature }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: temperature ?? 0.5,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';
  return { content, usage: json.usage };
}

const VALID_FORMATS = new Set(['single_post', 'short_thread', 'resource_thread', 'mega_thread']);

async function generateOne({ item, theme, knowledgeBlock, variant }) {
  const brief = item.classification || {};
  const rc = item.research_context || {};
  const originalTitle = item.translation?.translated_title || item.normalized?.title || '';
  const originalText = item.translation?.translated_text || item.normalized?.extracted_text || '';
  const system = buildSystem({ knowledgeBlock, extraSystemRules: variant.extraSystemRules });
  const user = buildUserPrompt({
    item, brief, rc, originalTitle, originalText, formatTypeHint: variant.formatTypeHint,
  });

  const model = process.env.OPENAI_THREAD_MODEL || 'gpt-4o-mini';
  const { content, usage } = await callOpenAIChat({ model, system, user, temperature: 0.5 });

  let parsed;
  try { parsed = JSON.parse(content); } catch (e) {
    throw new Error(`JSON 파싱 실패: ${e.message}\n응답: ${content.slice(0, 300)}`);
  }
  const postsArr = Array.isArray(parsed.posts) ? parsed.posts : [];
  const posts = postsArr.slice(0, 8).map((p, i) => ({
    index: typeof p.index === 'number' ? p.index : i + 1,
    body: typeof p.body === 'string' ? p.body.slice(0, 600) : '',
    char_count: typeof p.body === 'string' ? p.body.length : 0,
  })).filter((p) => p.body);
  if (posts.length === 0) throw new Error('유효한 포스트 0건');

  const PRICE = { 'gpt-4o-mini': { in: 0.15, out: 0.6 }, 'gpt-4o': { in: 2.5, out: 10 } };
  const p = PRICE[model];
  const cost = (usage && p) ? ((usage.prompt_tokens || 0) * p.in + (usage.completion_tokens || 0) * p.out) / 1_000_000 : null;

  const rawTitle = typeof parsed.title === 'string' ? parsed.title.slice(0, 120) : '';
  const titleWithPrefix = `${variant.titlePrefix} ${rawTitle}`.slice(0, 200);

  const insertRow = {
    agent_item_id: item.id,
    theme_id: item.theme_id || null,
    channel: 'threads',
    format_type: VALID_FORMATS.has(parsed.format_type) ? parsed.format_type : variant.formatTypeHint,
    hook_pattern: typeof parsed.hook_pattern === 'string' ? parsed.hook_pattern : null,
    tone_pattern: typeof parsed.tone_pattern === 'string' ? parsed.tone_pattern : null,
    engagement_drivers: Array.isArray(parsed.engagement_drivers) ? parsed.engagement_drivers.filter((x) => typeof x === 'string') : [],
    title: titleWithPrefix,
    posts,
    cta: typeof parsed.cta === 'string' ? parsed.cta : null,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((x) => typeof x === 'string').slice(0, 10) : [],
    risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags.filter((x) => typeof x === 'string') : [],
    status: 'draft',
    generator_model: model,
    generator_cost_usd: cost,
    generator_prompt_version: `thread_variant_${variant.label.split(' ')[0]}_2026_05_21`,
    auto_generated: true,
  };

  const { data: row, error } = await sb
    .from('thread_drafts')
    .insert(insertRow)
    .select('id, title, format_type, hook_pattern, tone_pattern')
    .single();
  if (error) throw new Error(`INSERT 실패: ${error.message}`);
  return { ...row, cost, postCount: posts.length };
}

async function main() {
  let itemId = process.argv[2];
  if (!itemId) {
    // 가장 최근 채택된 item 사용 (planning_sessions.selected_item_id)
    const { data } = await sb
      .from('planning_sessions')
      .select('selected_item_id')
      .not('selected_item_id', 'is', null)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    itemId = data?.selected_item_id;
    if (!itemId) {
      console.error('itemId 인자 없이 호출됐고, 최근 채택된 item 도 못 찾았습니다.');
      process.exit(1);
    }
  }
  console.log(`▶ item ${itemId} 기반 4 variants 생성 시작`);

  const { data: item, error: itemErr } = await sb
    .from('agent_items')
    .select('id, theme_id, source, post_url, normalized, classification, summary, translation, research_context')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr || !item) {
    console.error('아이템 로드 실패:', itemErr?.message || '없음');
    process.exit(1);
  }

  let theme = null;
  if (item.theme_id) {
    const { data } = await sb
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .eq('id', item.theme_id)
      .maybeSingle();
    theme = data || null;
  }
  const brief = item.classification || {};
  const knowledgeBlock = buildKBBlock({
    topicCluster: theme?.target_topic_cluster || brief.suggested_topic_cluster,
    persona: theme?.target_persona || brief.suggested_persona,
  });
  console.log(`  KB 크기: ${knowledgeBlock.length} chars, theme: ${theme?.name || '(없음)'}, persona: ${brief.suggested_persona || 'general'}, cluster: ${brief.suggested_topic_cluster || '(없음)'}`);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr').replace(/\/+$/, '');

  const results = [];
  for (const variant of VARIANTS) {
    console.log(`\n▶ ${variant.label} 생성 중...`);
    try {
      const r = await generateOne({ item, theme, knowledgeBlock, variant });
      console.log(`  ✓ draft ${r.id.slice(0, 8)}… title="${r.title}" posts=${r.postCount} hook=${r.hook_pattern} tone=${r.tone_pattern} cost=$${(r.cost || 0).toFixed(5)}`);
      console.log(`    ${baseUrl}/admin/content-studio/thread-drafts/${r.id}`);
      results.push({ variant: variant.label, ...r, url: `${baseUrl}/admin/content-studio/thread-drafts/${r.id}` });
    } catch (e) {
      console.error(`  ✗ ${variant.label} 실패: ${e.message}`);
      results.push({ variant: variant.label, error: e.message });
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`item: ${itemId} (${item.normalized?.title?.slice(0, 60) || '제목 없음'})`);
  console.log('생성된 변형:');
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.variant}: 실패 — ${r.error}`);
    } else {
      console.log(`  ${r.variant}: ${r.url}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
