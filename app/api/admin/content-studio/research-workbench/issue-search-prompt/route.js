import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  ISSUE_SOURCE_DIRECTORY,
  formatIssueSourceDirectory,
} from '@/lib/research/issueSourceDirectory';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_PLANNING_MODEL || 'claude-sonnet-4-5-20250929';

const SEARCH_PROMPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    search_title: { type: 'string' },
    user_intent_summary: { type: 'string' },
    sonar_user_prompt: { type: 'string' },
    recency: { type: 'string', enum: ['day', 'week', 'month'] },
    must_include: { type: 'array', items: { type: 'string' } },
    must_exclude: { type: 'array', items: { type: 'string' } },
    source_preferences: { type: 'array', items: { type: 'string' } },
    novelty_rule: { type: 'string' },
    issue_selection_criteria: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'search_title',
    'user_intent_summary',
    'sonar_user_prompt',
    'recency',
    'must_include',
    'must_exclude',
    'source_preferences',
    'novelty_rule',
    'issue_selection_criteria',
  ],
};

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

function parseToolInput(json) {
  const toolUse = (json.content || []).find((block) => block.type === 'tool_use' && block.name === 'create_sonar_issue_search_prompt');
  if (toolUse?.input) return toolUse.input;

  const text = (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude 응답에서 Sonar 검색 프롬프트를 찾지 못했습니다.');
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

export async function POST(request) {
  try {
    const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY 환경변수가 필요합니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const searchIntent = String(body.searchIntent || '').trim();
    const clientExcludeHistory = Array.isArray(body.excludeHistory) ? body.excludeHistory.slice(0, 20) : [];
    const localExcludeHistory = loadLocalIssueHistory();
    const excludeHistory = mergeIssueHistory(clientExcludeHistory, localExcludeHistory);
    // 대화형 수정 모드: 직전에 만든 프롬프트 + 사용자의 자연어 수정 요청을 함께 받으면
    // Claude 가 *기존 프롬프트* 를 *수정 요청대로* 다듬어 반환. 처음 작성과 흐름 통일.
    const currentPrompt = String(body.currentPrompt || '').trim();
    const refineInstruction = String(body.refineInstruction || '').trim();
    const isRefineMode = currentPrompt.length > 0 && refineInstruction.length > 0;

    if (!searchIntent && !isRefineMode) {
      return NextResponse.json({ error: '찾고 싶은 이슈 방향을 입력해야 합니다.' }, { status: 400 });
    }

    const excludedText = excludeHistory
      .map((item, index) => {
        const title = String(item?.title || '').trim();
        const url = String(item?.url || '').trim();
        const domain = String(item?.source_domain || '').trim();
        if (!title && !url) return '';
        return `${index + 1}. ${title}${domain ? ` (${domain})` : ''}${url ? ` — ${url}` : ''}`;
      })
      .filter(Boolean)
      .join('\n');

    const system = [
      '당신은 기브니즈 research workbench의 Sonar 이슈 탐색 프롬프트 설계자입니다.',
      '역할은 글을 기획하거나 작성하는 것이 아닙니다.',
      isRefineMode
        ? '이번 호출은 *수정 모드* 입니다. <current_prompt> 의 기존 Sonar 프롬프트를 <refine_request> 의 사용자 자연어 요청대로 다듬어서 새 버전을 만드세요. 처음부터 새로 쓰지 말고 *기존 의도를 유지하면서 요청된 부분만 정밀히 반영* 하세요. 결과는 동일한 JSON 형식.'
        : '사용자의 짧은 탐색 의도를 Perplexity/Sonar가 최근 뉴스기사를 잘 찾을 수 있는 user prompt로 바꾸는 것입니다.',
      '결과는 뉴스기사 기준이어야 합니다. 단순 블로그, 출처 약한 루머, 오래된 일반론은 제외하세요.',
      '다만 뉴스기사만 고집하지 말고 공식 릴리즈, 규제기관 발표, 기업 공식 블로그, 데이터 리포트처럼 원문 발췌 가능한 출처를 우선하게 만드세요.',
      '찾을 이슈는 Threads issue_explainer 글감이어야 합니다.',
      '좋은 후보 기준은 기존 상식이 깨지는 지점, 구체 사건/변화, 독자가 궁금해할 이유, 원천 추적 가능성입니다.',
      '',
      '[이슈 선별 우선순위 — 3가지 신호를 반드시 살피세요]',
      '① 반전/역설 우선: 기존 통념과 반대되는 행동을 한 이슈를 최우선으로 선택하세요. 특히 동일 주체(같은 사람/회사)가 짧은 기간 내 모순된 행동을 한 사건은 매우 강력한 후보입니다. 예: "AI로 일자리 없어진다던 회사가 AI 때문에 신입 채용 시작", "Windows 만드는 회사가 Windows 없는 기기 발표".',
      '② 좁은 독자 호출 가능: "취업 준비생", "직장인", "혼자 마케팅 챙기는 사장님"처럼 매우 특정한 상황에 있는 사람을 한 문장으로 호출할 수 있는 이슈를 우선합니다. "많은 사람", "요즘 사람들"처럼 넓은 독자를 타깃으로 하는 이슈는 하순위입니다.',
      '③ 한국 관점 번역 가능: 해외 이슈라도 한국 직장인·사업자 관점에서 "그래서 나는?" 번역이 가능한 이슈 우선. 예: 미국 헤지펀드 신입 채용 변화 → 한국 취준생 관점에서 "5년 차 경험이 22살 AI 친숙도보다 싸게 거래되는 시장". 번역 힌트도 이슈 데이터에 포함하세요.',
      '',
      '[이야기 자격 조건 — 후보는 아래 4개 중 최소 3개를 충족해야 합니다]',
      '① 구체적인 사람/회사에게 실제로 일어난 사건 — 주인공이 있는 이야기 (추상 트렌드론 제외)',
      '② 돈, 권한, 데이터, 일의 방식 중 무엇이 어디서 어디로 이동하는지 보여주는 사건',
      '③ 속보가 아니라 해석/관점이 붙어 있거나 붙일 수 있는 사건',
      '④ 한국 사업자/직장인 관점에서 "그래서 나는?" 으로 번역 가능한 사건',
      '',
      '사용자가 특정 소스를 지정하지 않아도 아래 source directory를 참고해 규제기관, 공식 발표, 개발자 릴리스, 비메이저 리서치/뉴스레터를 섞어 탐색하게 만드세요.',
      '뻔한 대형 테크 뉴스만 반복하지 말고 원문 발췌하기 좋은 출처를 우선하세요.',
      '선택/발행 이력이 있으면 같은 기사, 같은 사건, 같은 핵심 angle을 제외하도록 novelty_rule에 반영하세요.',
      'sonar_user_prompt는 Sonar에 그대로 넣을 수 있게 한국어로 작성하세요.',
      'sonar_user_prompt 안에는 JSON 출력 형식 요구를 포함하세요.',
    ].join('\n');

    const userSections = [
      '<search_intent>',
      searchIntent || '(직접 의도 미지정 — refine 모드)',
      '</search_intent>',
      '<source_directory>',
      formatIssueSourceDirectory({ maxPerType: 12 }),
      '</source_directory>',
      excludedText
        ? ['<selected_or_publish_history>', excludedText, '</selected_or_publish_history>'].join('\n')
        : '<selected_or_publish_history>없음</selected_or_publish_history>',
    ];
    if (isRefineMode) {
      userSections.push('<current_prompt>', currentPrompt, '</current_prompt>');
      userSections.push('<refine_request>', refineInstruction, '</refine_request>');
      userSections.push('', '<current_prompt> 의 기존 프롬프트를 <refine_request> 의 사용자 자연어 요청대로 다듬어 새 버전을 만드세요. 처음부터 새로 쓰지 말 것.');
    } else {
      userSections.push('', '위 탐색 의도를 Sonar 이슈 후보 수집용 프롬프트로 바꾸세요.');
    }
    const user = userSections.join('\n\n');

    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1800,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: user }],
        tools: [
          {
            name: 'create_sonar_issue_search_prompt',
            description: '사용자 탐색 의도를 Sonar 뉴스기사 이슈 검색 프롬프트로 변환한다.',
            input_schema: SEARCH_PROMPT_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: 'create_sonar_issue_search_prompt' },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `Claude API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    return NextResponse.json({
      searchPrompt: parseToolInput(json),
      model: DEFAULT_CLAUDE_MODEL,
      usage: json.usage || null,
      sourceDirectoryCount: ISSUE_SOURCE_DIRECTORY.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sonar 검색 프롬프트 생성 실패' }, { status: 500 });
  }
}
