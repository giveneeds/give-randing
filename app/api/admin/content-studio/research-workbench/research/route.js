import { NextResponse } from 'next/server';

const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';
const DEFAULT_SONAR_MODEL = process.env.PERPLEXITY_RESEARCH_MODEL || process.env.PERPLEXITY_MODEL || 'sonar-pro';

function buildPrompt(item, contentPlan) {
  const issuePlan = contentPlan.issue_plan || {};
  const psychologicalArc = contentPlan.psychological_arc || {};
  const isIssueExplainer = contentPlan.content_pattern === 'issue_explainer' || Boolean(issuePlan.issue_summary);

  if (isIssueExplainer) {
    return [
      '이 요청은 최근 이슈 기반 Threads issue_explainer 글을 위한 연계 리서치입니다.',
      '',
      'IssuePlan:',
      `- 대상 호출: ${issuePlan.audience_callout || ''}`,
      `- 사건 요약: ${issuePlan.issue_summary || contentPlan.topic_background || ''}`,
      `- 핵심 반전: ${issuePlan.key_reversal || ''}`,
      `- 왜 중요한가: ${issuePlan.why_it_matters || contentPlan.content_angle || ''}`,
      `- 독자가 가져갈 결론: ${issuePlan.reader_takeaway || contentPlan.promised_takeaway || ''}`,
      '',
      'Psychological Arc:',
      `- 첫 감정: ${psychologicalArc.reader_start_emotion || ''}`,
      `- 첫 질문: ${psychologicalArc.reader_first_question || ''}`,
      `- 신뢰를 만드는 디테일: ${psychologicalArc.credibility_hook || ''}`,
      `- 단발 사건이 아니라 흐름으로 커지는 지점: ${psychologicalArc.pattern_shift || ''}`,
      `- 구조적 의미: ${psychologicalArc.structural_meaning || ''}`,
      `- 마지막에 남길 깨달음: ${psychologicalArc.reader_end_realization || ''}`,
      '',
      '이번에 확인할 질문:',
      `- 질문: ${item.item_title || item.question || ''}`,
      `- 목적: ${item.research_purpose || item.purpose || ''}`,
      `- 필요한 증거 유형: ${item.expected_evidence_type}`,
      `- 우선순위: ${item.priority}`,
      '',
      '결과 조건:',
      '- 최근 7일~30일 자료와 원천 출처를 우선하세요.',
      '- 원천 발언/공식 발표/주요 보도/실제 커뮤니티 반응을 구분하세요.',
      '- 첫 화면에서 멈추게 하는 구체 장면을 믿게 만드는 날짜, 이름, 숫자, 장소, 직접 발언을 우선하세요.',
      '- 단발 사건이 아니라 흐름이라는 추가 사례나 시장 반응을 찾으세요.',
      '- 돈, 권한, 데이터, 역할, 선택권이 어디서 어디로 이동하는지 확인할 수 있는 근거를 찾으세요.',
      '- 검증이 부족한 내용은 “확인 부족”으로 표시하고 단정하지 마세요.',
      '- 글에 바로 넣을 수 있는 구체 디테일을 찾되, 루머를 사실처럼 쓰지 마세요.',
      '- 결과가 부족하면 부족하다고 명시하세요.',
      '',
      'JSON만 출력하세요:',
      '{',
      '  "item_id": "<same item_id>",',
      '  "search_succeeded": true,',
      '  "failure_reason": "",',
      '  "findings": [',
      '    {',
      '      "finding_text": "<검색 결과에서 확인한 사실/주장/사례. 검증 수준을 문장 안에 표시>",',
      '      "source_domain": "<도메인만>",',
      '      "evidence_type": "source_origin | case_detail | mechanism | official_position | public_reaction | risk_check | expert_quote | platform_policy",',
      '      "recency_note": "<자료 날짜/최신성>",',
      '      "applicability_to_korean_sme": "direct | requires_translation | not_applicable"',
      '    }',
      '  ],',
      '  "missing_evidence": "",',
      '  "quality_signal": "strong | partial | weak | not_found"',
      '}',
    ].join('\n');
  }

  return [
    '이 요청은 발행할 SNS 글의 알맹이를 강화하기 위한 보강 리서치입니다.',
    '',
    '글의 방향:',
    `- 핵심 각도: ${contentPlan.content_angle || ''}`,
    `- 독자가 얻어야 할 것: ${contentPlan.promised_takeaway || ''}`,
    `- 독자의 불안: ${contentPlan.reader_anxiety || ''}`,
    '',
    '지금 찾아야 할 자료:',
    `- 자료 제목: ${item.item_title}`,
    `- 이 자료가 필요한 이유: ${item.research_purpose}`,
    `- 필요한 증거 유형: ${item.expected_evidence_type}`,
    `- 우선순위: ${item.priority}`,
    '',
    '결과 조건:',
    '- 가능하면 2024년 이후 자료를 우선하세요.',
    '- 공식 플랫폼 문서, 업계 리포트, 실제 사례, 확인 가능한 수치/행동 항목을 우선하세요.',
    '- 추측성 블로그 의견이나 출처가 약한 주장은 구분해서 표시하세요.',
    '- AI 검색/GEO 효과를 보장한다고 단정하지 마세요.',
    '- 결과가 부족하면 부족하다고 명시하세요.',
    '',
    'JSON만 출력하세요:',
    '{',
    '  "item_id": "<same item_id>",',
    '  "search_succeeded": true,',
    '  "failure_reason": "",',
    '  "findings": [',
    '    {',
    '      "finding_text": "<검색 결과에서 확인한 사실/수치/사례>",',
    '      "source_domain": "<도메인만>",',
    '      "evidence_type": "statistic | case_example | platform_policy | expert_quote | checklist_item | failure_example | community_voc",',
    '      "recency_note": "<자료 날짜/최신성>",',
    '      "applicability_to_korean_sme": "direct | requires_translation | not_applicable"',
    '    }',
    '  ],',
    '  "missing_evidence": "",',
    '  "quality_signal": "strong | partial | weak | not_found"',
    '}',
  ].join('\n');
}

function parseJsonContent(content) {
  const cleaned = String(content || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function askSonar(item, contentPlan) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY 환경변수가 필요합니다.');

  const prompt = buildPrompt(item, contentPlan);
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
            'Only answer using search results. If evidence is weak or missing, say so explicitly. Do not include raw URLs in response text; citations are returned separately.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      search_recency_filter: contentPlan.content_pattern === 'issue_explainer' ? 'week' : undefined,
      web_search_options: { search_context_size: 'high' },
    }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Perplexity API 오류 (${res.status})`);
  }

  const content = json.choices?.[0]?.message?.content || '';
  let result = null;
  try {
    result = parseJsonContent(content);
  } catch {
    result = {
      item_id: item.item_id,
      search_succeeded: false,
      failure_reason: 'JSON 파싱 실패',
      findings: [
        {
          finding_text: content.slice(0, 1200),
          source_domain: '',
          evidence_type: item.expected_evidence_type,
          recency_note: '',
          applicability_to_korean_sme: 'requires_translation',
        },
      ],
      missing_evidence: '응답이 JSON 형식이 아니어서 수동 검토 필요',
      quality_signal: 'weak',
    };
  }

  return {
    ...result,
    item_id: result.item_id || item.item_id,
    prompt,
    citations: Array.isArray(json.citations) ? json.citations : [],
    search_results: Array.isArray(json.search_results) ? json.search_results : [],
    model: DEFAULT_SONAR_MODEL,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const contentPlan = body.contentPlan || {};
    const items = Array.isArray(body.researchItems)
      ? body.researchItems
      : Array.isArray(contentPlan.required_research_items)
        ? contentPlan.required_research_items
        : [];

    if (!items.length) {
      return NextResponse.json({ error: 'required_research_items가 필요합니다.' }, { status: 400 });
    }

    const results = [];
    for (const item of items.slice(0, 5)) {
      try {
        results.push(await askSonar(item, contentPlan));
      } catch (error) {
        results.push({
          item_id: item.item_id,
          search_succeeded: false,
          failure_reason: error.message,
          findings: [],
          missing_evidence: error.message,
          quality_signal: 'not_found',
          prompt: buildPrompt(item, contentPlan),
          citations: [],
          search_results: [],
          model: DEFAULT_SONAR_MODEL,
        });
      }
    }

    return NextResponse.json({ results, model: DEFAULT_SONAR_MODEL });
  } catch (error) {
    return NextResponse.json({ error: error.message || '리서치 실행 실패' }, { status: 500 });
  }
}
