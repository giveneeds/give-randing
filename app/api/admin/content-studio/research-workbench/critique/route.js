import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_PLANNING_MODEL || 'claude-sonnet-4-5-20250929';

const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall_verdict: {
      type: 'string',
      enum: ['pass', 'needs_revision', 'rewrite'],
    },
    score: { type: 'number' },
    weak_points: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          criterion: { type: 'string' },
          status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
          location: { type: 'string' },
          fix_direction: { type: 'string' },
        },
        required: ['criterion', 'status', 'location', 'fix_direction'],
      },
    },
    strong_points: {
      type: 'array',
      items: { type: 'string' },
    },
    revision_brief: { type: 'string' },
  },
  required: ['overall_verdict', 'score', 'weak_points', 'strong_points', 'revision_brief'],
};

function buildCritiquePrompt({ draft, contentPlan }) {
  const posts = Array.isArray(draft?.posts) ? draft.posts : [];
  const firstThreeLines = posts.slice(0, 2).join('\n').split('\n').slice(0, 6).join('\n');
  const lastPost = posts[posts.length - 1] || '';
  const audienceCallout = contentPlan?.issue_plan?.audience_callout || '';
  const keyReversal = contentPlan?.issue_plan?.key_reversal || '';
  const internalContradiction = contentPlan?.issue_plan?.internal_contradiction || '';

  return [
    '당신은 기브니즈 Threads 발행글 품질 편집장입니다.',
    '아래 R1 초안을 5가지 기준으로 채점하고, 약점과 구체적인 수정 방향을 제시하세요.',
    '글을 다시 쓰지 마세요. 평가와 지시만 합니다.',
    '',
    '## 채점 기준 (각 20점, 총 100점)',
    '',
    '### 기준 1: 반전 노출 (reversal_exposure)',
    '첫 2개 post의 첫 3~5줄 안에 반전/역설이 명확히 드러나는가?',
    '반전이란: 기존 통념과 반대되는 사실, 또는 동일 주체의 모순된 행동.',
    '- pass(20점): 반전이 첫 2개 post 안에 선명하게 보임',
    '- warn(12점): 반전 내용은 있지만 뒤에 묻혀 있음 (3번 post 이후)',
    '- fail(0점): 반전 없이 단순 뉴스 요약',
    `참고 — ContentPlan의 반전: "${keyReversal || '(미지정)'}"`,
    `참고 — 동일 주체 모순: "${internalContradiction || '(없음)'}"`,
    '',
    '### 기준 2: 독자 호출 특이성 (audience_specificity)',
    '독자 호출이 좁고 구체적인가?',
    '- pass(20점): "취업 준비하는 사람", "직장인", "혼자 마케팅 챙기는 사장님"처럼 특정 상황을 호출',
    '- warn(12점): "마케터", "사업자"처럼 직군명은 있지만 상황이 없음',
    '- fail(0점): "많은 분들", "요즘 시대", "여러분"처럼 넓은 호출, 또는 독자 호출 없음',
    `참고 — ContentPlan의 독자 설정: "${audienceCallout || '(미지정)'}"`,
    '',
    '### 기준 3: 수치/인물/날짜 앵커 (factual_anchor)',
    '첫 2개 post 안에 구체 수치, 고유명사(인물·회사·기관), 날짜 중 2개 이상 있는가?',
    '- pass(20점): 수치+인물+날짜 중 2개 이상이 첫 2개 post에 있음',
    '- warn(12점): 1개만 있거나 3번 post 이후에 나옴',
    '- fail(0점): 구체 앵커 없이 추상적 설명으로만 시작',
    '',
    '### 기준 4: 한국 관점 번역 (korean_perspective)',
    '"그래서 한국 독자인 나에게 이게 왜 중요한가?"가 글 어딘가에 명시적으로 번역됐는가?',
    '- pass(20점): "한국 기준으로 보면", "취준생 입장에선", "국내에서는" 등 명시적 번역 지점 있음',
    '- warn(12점): 맥락상 이해는 되지만 한국 관점이 명시적으로 표현되지 않음',
    '- fail(0점): 해외 사실 나열에 그침, 한국 관점 번역 없음',
    '',
    '### 기준 5: 마무리 품질 (ending_quality)',
    '마지막 post가 AI식 일반론으로 끝나지 않는가?',
    '- pass(20점): 구체 장면/수치/행동 촉구/감정적 반전으로 마무리',
    '- warn(12점): 일반론이지만 계정과 연결된 인사이트가 있음',
    '- fail(0점): "결국 사람이 중요", "AI는 도구일 뿐", "어떻게 활용하고 계신가요?" 같은 AI식 일반론',
    '',
    '## 채점 방법',
    '- 각 기준별 pass/warn/fail 판정',
    '- score = 각 기준의 점수 합산 (pass=20, warn=12, fail=0)',
    '- overall_verdict: score 85+ → pass, 60~84 → needs_revision, 60 미만 → rewrite',
    '- weak_points: fail/warn인 기준만 포함, fix_direction은 1~2줄로 구체적으로',
    '- revision_brief: Polish 단계에서 GPT-5가 바로 읽고 수정할 수 있게 2~3줄 지시서',
    '',
    '## 평가할 초안',
    '',
    `<첫_2개_post>`,
    firstThreeLines,
    `</첫_2개_post>`,
    '',
    `<마지막_post>`,
    lastPost,
    `</마지막_post>`,
    '',
    `<전체_post_수>`,
    `${posts.length}개`,
    `</전체_post_수>`,
    '',
    '<r1_draft_전문>',
    JSON.stringify(draft || {}, null, 2),
    '</r1_draft_전문>',
    '',
    '<content_plan_요약>',
    JSON.stringify({
      audience_callout: audienceCallout,
      key_reversal: keyReversal,
      internal_contradiction: internalContradiction,
      reader_takeaway: contentPlan?.issue_plan?.reader_takeaway || '',
      why_it_matters: contentPlan?.issue_plan?.why_it_matters || '',
    }, null, 2),
    '</content_plan_요약>',
  ].join('\n');
}

function parseToolInput(json) {
  const toolUse = (json.content || []).find(
    (block) => block.type === 'tool_use' && block.name === 'critique_draft'
  );
  if (toolUse?.input) return toolUse.input;

  const text = (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude 응답에서 비평 결과를 찾지 못했습니다.');
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

export async function POST(request) {
  try {
    const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY 환경변수가 필요합니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const draft = body.draft && typeof body.draft === 'object' ? body.draft : null;
    const contentPlan = body.contentPlan && typeof body.contentPlan === 'object' ? body.contentPlan : {};

    if (!draft || !Array.isArray(draft.posts)) {
      return NextResponse.json({ error: '비평할 draft가 필요합니다.' }, { status: 400 });
    }

    const promptText = buildCritiquePrompt({ draft, contentPlan });

    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1500,
        temperature: 0.1,
        system: '당신은 Threads 발행글 품질 편집장입니다. 초안을 채점하고 수정 지시서를 작성합니다. 글을 다시 쓰지 말고 평가와 지시만 합니다.',
        messages: [{ role: 'user', content: promptText }],
        tools: [
          {
            name: 'critique_draft',
            description: 'Threads 초안을 5가지 기준으로 채점하고 수정 지시서를 작성한다.',
            input_schema: CRITIQUE_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: 'critique_draft' },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `Claude API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    const critique = parseToolInput(json);
    return NextResponse.json({
      critique,
      model: DEFAULT_CLAUDE_MODEL,
      usage: json.usage || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '초안 비평 실패' }, { status: 500 });
  }
}
