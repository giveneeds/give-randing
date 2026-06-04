import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  ISSUE_SOURCE_DIRECTORY,
  formatIssueSourceDirectory,
  formatIssueSourceDomains,
  formatIssueSourceStrategy,
  formatIssueTopicMap,
  normalizeIssueCategories,
} from '@/lib/research/issueSourceDirectory';

// Sonar 이슈 후보 수집도 외부 호출이라 Vercel 기본 타임아웃을 넘길 수 있다. webhook 패턴과 동일하게 한도 상향.
export const runtime = 'nodejs';
export const maxDuration = 300;

const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';
const DEFAULT_SONAR_MODEL = process.env.PERPLEXITY_ISSUE_MODEL || process.env.PERPLEXITY_RESEARCH_MODEL || process.env.PERPLEXITY_MODEL || 'sonar-pro';

const DEFAULT_CATEGORIES = ['ai_marketing_tools', 'platform_policy', 'consumer_behavior', 'regulation_business'];

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

function buildIssuePrompt({ categories, recency, excludeHistory }) {
  const excludedItems = Array.isArray(excludeHistory)
    ? excludeHistory
        .map((item, index) => {
          const title = String(item?.title || '').trim();
          const url = String(item?.url || '').trim();
          const domain = String(item?.source_domain || '').trim();
          if (!title && !url) return '';
          return `${index + 1}. ${title}${domain ? ` (${domain})` : ''}${url ? ` — ${url}` : ''}`;
        })
        .filter(Boolean)
        .slice(0, 20)
    : [];

  return [
    '최근 이슈 기반 Threads 글감을 찾는 리서치입니다.',
    '',
    `범위: ${categories.join(', ')}`,
    `기간: 최근 ${recency === 'day' ? '24시간' : recency === 'month' ? '30일' : '7일'} 우선`,
    '',
    '기브니즈 주제 확장 맵:',
    formatIssueTopicMap(),
    '',
    '선택 주제별 검색 전략:',
    formatIssueSourceStrategy({ categories }),
    '',
    '찾을 것:',
    '- AI, 마케팅, 테크, 비즈니스 영역에서 짧은 설명형 Threads 글로 만들 만한 최근 이슈',
    '- AI가 아니어도 소비자 행동, 플랫폼 정책, 브랜드 흥망성쇠, 규제, 돈의 흐름, 일의 방식 변화, 로컬/커머스 실무와 연결되면 후보로 포함',
    '- 단순 제품 홍보보다 “기존 상식이 깨지는 지점”, “사람들이 왜 궁금해할지”, “구체적 사건/변화”가 있는 것',
    '- 공식 릴리즈, 기업 공식 블로그, 규제기관 발표, 주요 보도, 데이터 리포트처럼 원문 URL이 추적 가능한 것',
    '',
    '우선 살펴볼 원문/발췌 소스 풀:',
    formatIssueSourceDirectory({ maxPerType: 12 }),
    '',
    '소스 활용 규칙:',
    '- 위 소스만 보라는 뜻은 아닙니다. 다만 뻔한 대형 테크 뉴스만 반복하지 말고 선택 주제별 우선 소스를 먼저 살피세요.',
    '- 가능하면 기사 요약보다 원문 릴리즈, 공식 발표, 회사 블로그, 규제기관 문서, 데이터 리포트 URL을 먼저 잡으세요.',
    '- 후보마다 source_summary에 어떤 원문/보도/릴리스를 근거로 삼았는지 적으세요.',
    `- 참고 도메인: ${formatIssueSourceDomains()}`,
    '',
    '제외:',
    '- 출처가 약한 루머만 있는 이슈',
    '- 한국어로 쉽게 풀기 어려운 너무 좁은 금융/정치 이슈',
    '- 단순 리스트 기사 요약',
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
    '{',
    '  "issues": [',
    '    {',
    '      "issue_id": "i1",',
    '      "issue_title": "짧은 제목",',
    '      "one_line_hook": "Threads 첫 문장 후보",',
    '      "category": "ai_marketing_tools | platform_policy | consumer_behavior | brand_story | regulation_business | capital_flow | work_shift | local_commerce",',
    '      "why_interesting": "왜 사람들이 궁금해할 만한지",',
    '      "what_changed": "무엇이 바뀌었거나 어떤 일이 있었는지",',
    '      "source_summary": "주요 출처/언급 요약",',
    '      "recency_note": "언제 나온 이슈인지",',
    '      "novelty_note": "선택/발행 이력과 왜 겹치지 않는지",',
    '      "needs_deeper_research": true',
    '    }',
    '  ]',
    '}',
    '',
    'issues는 5~8개만 반환하세요.',
  ].join('\n');
}

function appendExclusionRules(prompt, excludeHistory) {
  const excludedItems = Array.isArray(excludeHistory)
    ? excludeHistory
        .map((item, index) => {
          const title = String(item?.title || '').trim();
          const url = String(item?.url || '').trim();
          const domain = String(item?.source_domain || '').trim();
          if (!title && !url) return '';
          return `${index + 1}. ${title}${domain ? ` (${domain})` : ''}${url ? ` — ${url}` : ''}`;
        })
        .filter(Boolean)
        .slice(0, 30)
    : [];
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

function appendSourceDirectory(prompt) {
  return [
    prompt,
    '',
    '기브니즈 주제 확장 맵:',
    formatIssueTopicMap(),
    '',
    '추가 원문/발췌 소스 풀:',
    formatIssueSourceDirectory({ maxPerType: 12 }),
    '',
    '소스 활용 규칙:',
    '- 위 소스만 보라는 뜻은 아닙니다.',
    '- 뻔한 대형 테크 뉴스만 반복하지 말고 규제기관, 공식 발표, 개발자 릴리스, 비메이저 리서치/뉴스레터를 섞어 후보를 찾으세요.',
    '- 사용자의 탐색 의도와 맞는 주제 축을 먼저 고르고, 그 축의 우선 소스 타입부터 살피세요.',
    '- 후보는 반드시 최근 뉴스기사, 공식 발표, 릴리스, 원문 발췌가 가능한 링크를 기반으로 해야 합니다.',
    `- 참고 도메인: ${formatIssueSourceDomains()}`,
  ].join('\n');
}

export async function POST(request) {
  try {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'PERPLEXITY_API_KEY 환경변수가 필요합니다.' }, { status: 500 });
    }

    const body = await request.json();
    const requestedCategories = Array.isArray(body.categories) && body.categories.length ? body.categories : DEFAULT_CATEGORIES;
    const normalizedCategories = normalizeIssueCategories(requestedCategories);
    const categories = normalizedCategories.length ? normalizedCategories : DEFAULT_CATEGORIES;
    const recency = ['day', 'week', 'month'].includes(body.recency) ? body.recency : 'week';
    const clientExcludeHistory = Array.isArray(body.excludeHistory) ? body.excludeHistory.slice(0, 20) : [];
    const localExcludeHistory = loadLocalIssueHistory();
    const excludeHistory = mergeIssueHistory(clientExcludeHistory, localExcludeHistory);
    const customPrompt = String(body.customPrompt || '').trim();
    const basePrompt = customPrompt || buildIssuePrompt({ categories, recency, excludeHistory });
    const sourceAwarePrompt = customPrompt ? appendSourceDirectory(basePrompt) : basePrompt;
    const prompt = appendExclusionRules(sourceAwarePrompt, excludeHistory);

    const res = await fetch(PERPLEXITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
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
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `Perplexity API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    const content = json.choices?.[0]?.message?.content || '';
    let parsed = { issues: [] };
    try {
      parsed = parseJsonContent(content);
    } catch {
      parsed = {
        issues: [
          {
            issue_id: 'i1',
            issue_title: 'JSON 파싱 실패 — 수동 검토 필요',
            one_line_hook: '',
            category: 'tech',
            why_interesting: content.slice(0, 900),
            what_changed: '',
            source_summary: '',
            recency_note: '',
            novelty_note: '',
            needs_deeper_research: true,
          },
        ],
      };
    }

    return NextResponse.json({
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 10) : [],
      prompt,
      prompt_source: customPrompt ? 'custom' : 'default',
      model: DEFAULT_SONAR_MODEL,
      citations: Array.isArray(json.citations) ? json.citations : [],
      search_results: Array.isArray(json.search_results) ? json.search_results : [],
      excluded_history_count: excludeHistory.length,
      local_excluded_history_count: localExcludeHistory.length,
      source_directory_count: ISSUE_SOURCE_DIRECTORY.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '이슈 후보 수집 실패' }, { status: 500 });
  }
}
