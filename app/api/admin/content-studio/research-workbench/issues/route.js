import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CURATED_DOMAINS } from '@/lib/research/issueSourceDirectory';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Sonar 이슈 후보 수집 — 2-트랙 병렬 호출이라 Vercel 기본 타임아웃을 넘길 수 있다.
export const runtime = 'nodejs';
export const maxDuration = 300;

const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';
const DEFAULT_SONAR_MODEL = process.env.PERPLEXITY_ISSUE_MODEL || process.env.PERPLEXITY_RESEARCH_MODEL || process.env.PERPLEXITY_MODEL || 'sonar-pro';

// 이야기 자격 조건 — 카테고리 대신 쓰는 선별 기준.
// 5개 지정 소스(stratechery, firstround, notboring, verge, BI)의 공통 결에서 유추.
const STORY_QUALIFICATION = [
  '① 구체적인 사람/회사에게 실제로 일어난 사건 — 주인공이 있는 이야기 (추상 트렌드론 제외)',
  '② 돈, 권한, 데이터, 일의 방식 중 무엇이 어디서 어디로 이동하는지 보여주는 사건',
  '③ 속보가 아니라 해석/관점이 붙어 있거나 붙일 수 있는 사건',
  '④ 한국 사업자/직장인 관점에서 "그래서 나는?" 으로 번역 가능한 사건',
];

function loadLocalIssueHistory() {
  try {
    const dir = path.join(process.cwd(), 'docs', 'reference-data');
    const files = fs.readdirSync(dir)
      .filter((filename) => /^threads-user-.+\.json$/.test(filename))
      .sort()
      .slice(-12);
    const rows = [];
    for (const file of files) {
      let parsed = [];
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      } catch {
        parsed = [];
      }
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const title = String(
          item?.topic ||
          item?.reference_label ||
          item?.title ||
          item?.issue_title ||
          item?.root_text ||
          item?.text_content ||
          ''
        ).trim();
        if (!title) continue;
        rows.push({
          title: title.replace(/\s+/g, ' ').slice(0, 180),
          url: String(item?.source_url || item?.url || '').trim(),
          source_domain: file,
          type: item?.reference_type || 'local_user_reference',
        });
      }
    }
    return rows.slice(-30);
  } catch {
    return [];
  }
}

function mergeIssueHistory(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const title = String(item?.title || '').trim();
      const url = String(item?.url || '').trim();
      const key = url || title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push({ ...item, title, url });
    }
  }
  return merged.slice(0, 40);
}

function parseJsonContent(content) {
  const cleaned = String(content || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function formatExcludedItems(excludeHistory, max = 30) {
  return Array.isArray(excludeHistory)
    ? excludeHistory
        .map((item, index) => {
          const title = String(item?.title || '').trim();
          const url = String(item?.url || '').trim();
          const domain = String(item?.source_domain || '').trim();
          if (!title && !url) return '';
          return `${index + 1}. ${title}${domain ? ` (${domain})` : ''}${url ? ` — ${url}` : ''}`;
        })
        .filter(Boolean)
        .slice(0, max)
    : [];
}

// 두 트랙이 공유하는 출력 JSON 스키마 블록.
const ISSUE_JSON_SCHEMA = [
  '{',
  '  "issues": [',
  '    {',
  '      "issue_id": "i1",',
  '      "issue_title": "짧은 제목",',
  '      "one_line_hook": "Threads 첫 문장 후보",',
  '      "why_interesting": "왜 사람들이 궁금해할 만한지",',
  '      "what_changed": "무엇이 바뀌었거나 어떤 일이 있었는지",',
  '      "structural_shift": "돈, 권한, 데이터, 일의 방식 중 무엇이 어디서 어디로 이동하는지 1문장",',
  '      "source_summary": "주요 출처/언급 요약",',
  '      "source_url": "이 이슈의 1차 출처 원문 URL. 검색 결과에서 실제로 확인한 URL만. 추측 금지",',
  '      "recency_note": "언제 나온 이슈인지",',
  '      "novelty_note": "선택/발행 이력과 왜 겹치지 않는지",',
  '      "needs_deeper_research": true,',
  '      "reversal_score": 3,',
  '      "internal_contradiction": "동일 주체가 짧은 기간 내 모순된 행동을 했다면 서술. 없으면 빈 문자열",',
  '      "audience_callout_candidate": "취업 준비하는 사람 | 직장인 | 혼자 마케팅 챙기는 사장님 등 좁은 독자 1문장",',
  '      "korean_hook": "한국 독자 관점에서 이 이슈의 핵심 한 줄 번역"',
  '    }',
  '  ]',
  '}',
].join('\n');

const ISSUE_FIELD_NOTES = [
  '필드 설명:',
  '- reversal_score: 1(단순 뉴스) ~ 5(기존 통념과 완전히 반대). 반전성이 높을수록 높은 점수.',
  '- structural_shift: 표면 사건이 아니라 그 아래에서 이동 중인 것. 예: "광고 셀프서브 권한이 대행사에서 광고주 본인에게 넘어가는 중".',
  '- internal_contradiction: 같은 사람/회사가 며칠~몇 주 사이에 모순된 행동을 한 사실이 있으면 서술. 없으면 빈 문자열.',
  '- audience_callout_candidate: 이 이슈로 글을 쓸 때 첫 줄에 호출할 수 있는 좁은 독자.',
  '- korean_hook: 이 이슈가 한국 독자에게 왜 중요한지 1문장. 번역이 어려우면 "해외 이슈, 번역 필요"로 표시.',
  '- source_url: 검색 결과에 실제로 나온 원문 URL만 적으세요. 기억이나 추측으로 URL을 만들면 안 됩니다. 확실한 URL이 없으면 빈 문자열.',
].join('\n');

// 트랙 1 — 지정 소스 강제. 검색 쿼리가 영어로 생성되도록 지시문은 영어로 쓴다.
// JSON 값은 한국어로 받아 다운스트림(plan/write)과 호환.
function buildCuratedPrompt({ recency, excludeHistory }) {
  const excludedItems = formatExcludedItems(excludeHistory, 20);
  const recencyLabel = recency === 'day' ? '7 days' : recency === 'month' ? '60 days' : '30 days';
  return [
    'You are researching recent articles and essays from a curated set of publications:',
    '- stratechery.com (deep structural analysis of tech business models)',
    '- review.firstround.com (operator first-person stories with concrete numbers and steps)',
    '- notboring.co (personal-perspective narrative deep dives)',
    '- theverge.com (tech meeting everyday life and culture)',
    '- businessinsider.com (person/company-driven business stories)',
    '',
    `Time window: prefer the last ${recencyLabel}.`,
    '',
    'Find 4-6 recent articles/essays from these publications that qualify as:',
    '- A concrete event that happened to a specific person or company (a story with a protagonist, not an abstract trend piece)',
    '- Shows a structural shift: money, power, data, or the way work gets done moving from one place to another',
    '- Carries interpretation/perspective, not just breaking news',
    '- Translatable for Korean small-business owners and office workers: they should be able to ask "so what does this mean for me?"',
    '',
    ...(excludedItems.length
      ? [
          'EXCLUDE any candidate covering the same news event, same company pivot, or same core angle as these previously selected/published items:',
          ...excludedItems,
          '',
        ]
      : []),
    'Output JSON only. Write ALL JSON field values in Korean, except source_url which must be the exact URL from your search results:',
    ISSUE_JSON_SCHEMA,
    '',
    ISSUE_FIELD_NOTES,
    '',
    'Return 4-6 issues.',
  ].join('\n');
}

// 트랙 2 — 자유 검색. 카테고리 대신 이야기 자격 조건으로 선별.
function buildOpenPrompt({ recency, excludeHistory }) {
  const excludedItems = formatExcludedItems(excludeHistory, 20);
  return [
    '최근 이슈 기반 Threads 글감을 찾는 리서치입니다.',
    '',
    `기간: 최근 ${recency === 'day' ? '24시간' : recency === 'month' ? '30일' : '7일'} 우선`,
    '검색은 한국어와 영어 양쪽으로 하세요. 영어 1차 소스(공식 릴리즈, 회사 블로그, 규제기관 발표)도 적극 살피세요.',
    '',
    '찾을 것 — 아래 이야기 자격 조건 4개를 모두(최소 3개) 충족하는 사건:',
    ...STORY_QUALIFICATION,
    '',
    '우선순위가 높은 형태:',
    '- 공식 릴리즈, 기업 공식 블로그, 규제기관 발표, 주요 보도, 데이터 리포트처럼 원문 URL이 추적 가능한 것',
    '- "기존 상식이 깨지는 지점"이 있는 사건. 동일 주체가 짧은 기간 내 모순된 행동을 한 사건은 매우 강한 후보 (reversal_score 4-5)',
    '- "취업 준비생", "직장인", "혼자 마케팅 챙기는 사장님"처럼 특정 상황을 한 문장으로 호출 가능한 이슈',
    '',
    '제외:',
    '- 출처가 약한 루머만 있는 이슈',
    '- 주인공 없는 추상 트렌드론, 단순 리스트 기사 요약',
    '- 한국어로 쉽게 풀기 어려운 너무 좁은 금융/정치 이슈',
    ...(excludedItems.length
      ? [
          '- 아래 선택/발행 이력과 같은 뉴스기사, 같은 사건, 같은 핵심 angle은 제외',
          '- 같은 회사라도 후속 사건이면 follow-up으로 명시하고, 실질적으로 새 내용이 없으면 제외',
          '',
          '선택/발행 이력:',
          ...excludedItems,
        ]
      : []),
    '',
    'JSON만 출력하세요:',
    ISSUE_JSON_SCHEMA,
    '',
    ISSUE_FIELD_NOTES,
    '',
    'issues는 4~6개만 반환하세요.',
  ].join('\n');
}

function appendExclusionRules(prompt, excludeHistory) {
  const excludedItems = formatExcludedItems(excludeHistory, 30);
  if (!excludedItems.length) return prompt;
  return [
    prompt,
    '',
    '추가 중복 제외 규칙:',
    '- 아래 로컬 선택/발행/레퍼런스 이력과 같은 뉴스기사, 같은 사건, 같은 핵심 angle은 절대 후보로 반환하지 마세요.',
    '- 특히 같은 회사명과 같은 전환/발표/논란을 다루는 후보는 제외하세요.',
    '- 후속 기사라도 실질적으로 새 사실이 없으면 제외하세요.',
    '',
    '로컬 선택/발행/레퍼런스 이력:',
    ...excludedItems,
  ].join('\n');
}

// 커스텀 프롬프트 사용 시에도 이야기 자격 조건과 출력 스키마는 유지.
function appendStoryQualification(prompt) {
  return [
    prompt,
    '',
    '이야기 자격 조건 (아래 4개 중 최소 3개 충족하는 사건만):',
    ...STORY_QUALIFICATION,
    '',
    'JSON만 출력하세요:',
    ISSUE_JSON_SCHEMA,
    '',
    ISSUE_FIELD_NOTES,
  ].join('\n');
}

async function callSonar({ key, prompt, recency, domainFilter }) {
  const body = {
    model: DEFAULT_SONAR_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Only use current search results. Prefer source-traceable, recent issues. If evidence is weak, mark needs_deeper_research true.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    search_recency_filter: recency,
    web_search_options: {
      search_context_size: 'high',
    },
  };
  if (Array.isArray(domainFilter) && domainFilter.length) {
    body.search_domain_filter = domainFilter;
  }

  const res = await fetch(PERPLEXITY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Perplexity API 오류 (${res.status})`);
  }

  const content = json.choices?.[0]?.message?.content || '';
  let parsed = { issues: [] };
  try {
    parsed = parseJsonContent(content);
  } catch {
    parsed = { issues: [] };
  }

  return {
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    citations: Array.isArray(json.citations) ? json.citations : [],
    search_results: Array.isArray(json.search_results) ? json.search_results : [],
  };
}

// curated 소스는 발행 주기가 길어 기간을 한 단계 넓힌다.
function widenRecency(recency) {
  if (recency === 'day') return 'week';
  return 'month';
}

function dedupeIssues(issues) {
  const seen = new Set();
  const out = [];
  for (const issue of issues) {
    // 제목 없는 이슈는 저장/표시 모두 불가하므로 버린다 (Sonar가 간혹 필드를 빼먹음).
    if (!String(issue?.issue_title || '').trim()) continue;
    const key = String(issue.source_url || '').trim() || String(issue.issue_title || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

async function saveIssuesToAgentItems(issues) {
  if (!supabaseAdmin || !Array.isArray(issues) || !issues.length) return 0;

  const now = new Date().toISOString();
  const rows = issues.map((issue) => {
    const titleHash = crypto.createHash('sha256').update(String(issue.issue_title || '')).digest('hex').slice(0, 24);
    // 이슈별 1차 출처 URL만 사용 — citations[0]을 전체 이슈에 돌려쓰면 링크가 전부 틀어진다.
    const sourceUrl = String(issue.source_url || '').trim();
    return {
      source: 'sonar',
      post_id: titleHash,
      post_url: sourceUrl,
      collected_at: now,
      theme_id: null,
      status: 'collected',
      raw_data: { issue },
      normalized: {
        title: issue.issue_title || '',
        extracted_text: [issue.source_summary, issue.what_changed, issue.why_interesting].filter(Boolean).join('\n\n'),
      },
      summary: {
        one_line_summary: issue.one_line_hook || '',
        key_points: [issue.what_changed, issue.structural_shift, issue.recency_note].filter(Boolean),
        why_it_matters: issue.why_interesting || '',
      },
      classification: {
        suggested_persona: 'general',
        suggested_topic_cluster: issue.track || 'open',
        reversal_score: issue.reversal_score || null,
        structural_shift: issue.structural_shift || '',
        audience_callout: issue.audience_callout_candidate || '',
        content_angles: [issue.korean_hook].filter(Boolean),
      },
    };
  });

  const { error } = await supabaseAdmin
    .from('agent_items')
    .upsert(rows, { onConflict: 'source,post_id', ignoreDuplicates: true });

  if (error) console.error('[issues] agent_items 저장 실패:', error.message);
  return error ? 0 : rows.length;
}

export async function POST(request) {
  try {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'PERPLEXITY_API_KEY 환경변수가 필요합니다.' }, { status: 500 });
    }

    const body = await request.json();
    const recency = ['day', 'week', 'month'].includes(body.recency) ? body.recency : 'week';
    const clientExcludeHistory = Array.isArray(body.excludeHistory) ? body.excludeHistory.slice(0, 20) : [];
    const localExcludeHistory = loadLocalIssueHistory();
    const excludeHistory = mergeIssueHistory(clientExcludeHistory, localExcludeHistory);
    const customPrompt = String(body.customPrompt || '').trim();

    // 트랙 2(open) 프롬프트 — 커스텀 프롬프트가 있으면 자격 조건/스키마를 덧붙여 사용.
    const openPrompt = customPrompt
      ? appendExclusionRules(appendStoryQualification(customPrompt), excludeHistory)
      : buildOpenPrompt({ recency, excludeHistory });
    const curatedPrompt = buildCuratedPrompt({ recency, excludeHistory });

    const [curatedResult, openResult] = await Promise.allSettled([
      callSonar({ key, prompt: curatedPrompt, recency: widenRecency(recency), domainFilter: CURATED_DOMAINS }),
      callSonar({ key, prompt: openPrompt, recency }),
    ]);

    if (curatedResult.status === 'rejected' && openResult.status === 'rejected') {
      return NextResponse.json(
        { error: `두 트랙 모두 실패 — curated: ${curatedResult.reason?.message} / open: ${openResult.reason?.message}` },
        { status: 502 }
      );
    }

    const curatedIssues = curatedResult.status === 'fulfilled'
      ? curatedResult.value.issues.map((issue) => ({ ...issue, track: 'curated' }))
      : [];
    const openIssues = openResult.status === 'fulfilled'
      ? openResult.value.issues.map((issue) => ({ ...issue, track: 'open' }))
      : [];

    const merged = dedupeIssues([...curatedIssues, ...openIssues])
      .sort((a, b) => (b.reversal_score || 0) - (a.reversal_score || 0))
      .slice(0, 10);

    const citations = [
      ...(curatedResult.status === 'fulfilled' ? curatedResult.value.citations : []),
      ...(openResult.status === 'fulfilled' ? openResult.value.citations : []),
    ];
    const searchResults = [
      ...(curatedResult.status === 'fulfilled' ? curatedResult.value.search_results : []),
      ...(openResult.status === 'fulfilled' ? openResult.value.search_results : []),
    ];

    // 검토함(agent_items)에 이슈 후보 저장 — 실패해도 응답은 정상 반환
    const savedCount = await saveIssuesToAgentItems(merged);

    return NextResponse.json({
      issues: merged,
      prompt: openPrompt,
      curated_prompt: curatedPrompt,
      prompt_source: customPrompt ? 'custom' : 'default',
      model: DEFAULT_SONAR_MODEL,
      citations,
      search_results: searchResults,
      excluded_history_count: excludeHistory.length,
      local_excluded_history_count: localExcludeHistory.length,
      track_status: {
        curated: curatedResult.status === 'fulfilled' ? `${curatedIssues.length}건` : `실패: ${curatedResult.reason?.message}`,
        open: openResult.status === 'fulfilled' ? `${openIssues.length}건` : `실패: ${openResult.reason?.message}`,
      },
      saved_to_inbox: savedCount,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '이슈 후보 수집 실패' }, { status: 500 });
  }
}
