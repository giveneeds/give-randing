import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  ISSUE_SOURCE_DIRECTORY,
  formatIssueSourceDirectory,
  formatIssueSourceStrategy,
  formatIssueTopicMap,
  getIssueCategoryValues,
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
    preferred_categories: {
      type: 'array',
      items: { type: 'string', enum: getIssueCategoryValues() },
    },
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
    'preferred_categories',
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

    if (!searchIntent) {
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
      '사용자의 짧은 탐색 의도를 Perplexity/Sonar가 최근 뉴스기사를 잘 찾을 수 있는 user prompt로 바꾸는 것입니다.',
      '결과는 뉴스기사 기준이어야 합니다. 단순 블로그, 출처 약한 루머, 오래된 일반론은 제외하세요.',
      '다만 뉴스기사만 고집하지 말고 공식 릴리즈, 규제기관 발표, 기업 공식 블로그, 데이터 리포트처럼 원문 발췌 가능한 출처를 우선하게 만드세요.',
      '찾을 이슈는 Threads issue_explainer 글감이어야 합니다.',
      '좋은 후보 기준은 기존 상식이 깨지는 지점, 구체 사건/변화, 독자가 궁금해할 이유, 원천 추적 가능성입니다.',
      '주제 축은 AI에만 묶지 않습니다. 마케팅 도구, 플랫폼 정책, 소비자 행동, 브랜드 흥망성쇠, 규제, 돈의 흐름, 일의 방식, 로컬/커머스 실무로 확장할 수 있습니다.',
      '사용자가 특정 소스를 지정하지 않아도 아래 source directory를 참고해 규제기관, 공식 발표, 개발자 릴리스, 비메이저 리서치/뉴스레터를 섞어 탐색하게 만드세요.',
      '뻔한 대형 테크 뉴스만 반복하지 말고 원문 발췌하기 좋은 출처를 우선하세요.',
      '선택/발행 이력이 있으면 같은 기사, 같은 사건, 같은 핵심 angle을 제외하도록 novelty_rule에 반영하세요.',
      'sonar_user_prompt는 Sonar에 그대로 넣을 수 있게 한국어로 작성하세요.',
      'sonar_user_prompt 안에는 JSON 출력 형식 요구를 포함하세요.',
    ].join('\n');

    const user = [
      '<search_intent>',
      searchIntent,
      '</search_intent>',
      '<topic_map>',
      formatIssueTopicMap(),
      '</topic_map>',
      '<default_source_strategy>',
      formatIssueSourceStrategy({ categories: getIssueCategoryValues().slice(0, 4) }),
      '</default_source_strategy>',
      '<source_directory>',
      formatIssueSourceDirectory({ maxPerType: 12 }),
      '</source_directory>',
      excludedText
        ? ['<selected_or_publish_history>', excludedText, '</selected_or_publish_history>'].join('\n')
        : '<selected_or_publish_history>없음</selected_or_publish_history>',
      '',
      '위 탐색 의도를 Sonar 이슈 후보 수집용 프롬프트로 바꾸세요.',
    ].join('\n\n');

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
