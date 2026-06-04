import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Claude ContentPlan 생성이 큰 스키마를 강제 출력하느라 ~70초까지 걸린다.
// Vercel 기본 함수 타임아웃에 걸려 죽지 않도록 webhook 라우트와 동일하게 한도를 올린다.
export const runtime = 'nodejs';
export const maxDuration = 300;

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_PLANNING_MODEL || 'claude-sonnet-4-5-20250929';

const CONTENT_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    planning_title: { type: 'string' },
    topic_background: { type: 'string' },
    target_reader: { type: 'string', enum: ['general', 'unknown'] },
    reader_anxiety: { type: 'string' },
    reader_desired_information: { type: 'string' },
    content_angle: { type: 'string' },
    why_now: { type: 'string' },
    promised_takeaway: { type: 'string' },
    suggested_content_pillar: {
      type: 'string',
      enum: ['cost_before_spend', 'do_today', 'current_observation', 'trend_plain', 'content_showcase'],
    },
    suggested_engagement_intent: {
      type: 'string',
      enum: ['reach', 'trust', 'convert', 'relate', 'recycle'],
    },
    suggested_treatment: {
      type: 'string',
      enum: ['news_commentary', 'practical_tip', 'checklist', 'explainer', 'case_note', 'opinion', 'fomo_reframe'],
    },
    suggested_format_type: {
      type: 'string',
      enum: ['single_post', 'short_thread', 'resource_thread'],
    },
    content_pattern: {
      type: 'string',
      enum: ['issue_explainer'],
    },
    source_mode: {
      type: 'string',
      enum: ['source_article', 'issue_candidate'],
    },
    target_reaction: {
      type: 'string',
      enum: ['share_save', 'comment_discussion', 'trust_authority'],
    },
    issue_plan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        audience_callout: { type: 'string' },
        issue_summary: { type: 'string' },
        key_reversal: { type: 'string' },
        why_it_matters: { type: 'string' },
        turning_point: { type: 'string' },
        reader_takeaway: { type: 'string' },
        expression_direction: { type: 'string' },
      },
      required: [
        'audience_callout',
        'issue_summary',
        'key_reversal',
        'why_it_matters',
        'turning_point',
        'reader_takeaway',
        'expression_direction',
      ],
    },
    psychological_arc: {
      type: 'object',
      additionalProperties: false,
      properties: {
        reader_start_emotion: { type: 'string' },
        reader_first_question: { type: 'string' },
        credibility_hook: { type: 'string' },
        curiosity_ladder: { type: 'array', items: { type: 'string' } },
        pattern_shift: { type: 'string' },
        structural_meaning: { type: 'string' },
        proof_needed: { type: 'array', items: { type: 'string' } },
        reader_end_realization: { type: 'string' },
      },
      required: [
        'reader_start_emotion',
        'reader_first_question',
        'credibility_hook',
        'curiosity_ladder',
        'pattern_shift',
        'structural_meaning',
        'proof_needed',
        'reader_end_realization',
      ],
    },
    deep_research_questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question_id: { type: 'string' },
          question: { type: 'string' },
          purpose: { type: 'string' },
          expected_evidence_type: {
            type: 'string',
            enum: ['source_origin', 'case_detail', 'mechanism', 'official_position', 'public_reaction', 'risk_check'],
          },
          priority: { type: 'string', enum: ['required', 'optional'] },
        },
        required: ['question_id', 'question', 'purpose', 'expected_evidence_type', 'priority'],
      },
    },
    evidence_map: {
      type: 'object',
      additionalProperties: false,
      properties: {
        hook_fact: { type: 'string' },
        case_detail: { type: 'string' },
        mechanism: { type: 'string' },
        authority_signal: { type: 'string' },
        official_position: { type: 'string' },
        uncertainty: { type: 'array', items: { type: 'string' } },
      },
      required: ['hook_fact', 'case_detail', 'mechanism', 'authority_signal', 'official_position', 'uncertainty'],
    },
    article_slot_map: {
      type: 'object',
      additionalProperties: false,
      properties: {
        strange_scene: { type: 'string' },
        reader_decision: { type: 'string' },
        old_order: { type: 'string' },
        new_signal: { type: 'string' },
        coordinated_players: { type: 'array', items: { type: 'string' } },
        hard_numbers: { type: 'array', items: { type: 'string' } },
        named_entities: { type: 'array', items: { type: 'string' } },
        direct_quotes: { type: 'array', items: { type: 'string' } },
        past_failure_or_history: { type: 'string' },
        why_now_changed: { type: 'string' },
        counter_signal_or_uncertainty: { type: 'string' },
        closing_frame: { type: 'string' },
      },
      required: [
        'strange_scene',
        'reader_decision',
        'old_order',
        'new_signal',
        'coordinated_players',
        'hard_numbers',
        'named_entities',
        'direct_quotes',
        'past_failure_or_history',
        'why_now_changed',
        'counter_signal_or_uncertainty',
        'closing_frame',
      ],
    },
    required_research_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          item_id: { type: 'string' },
          item_title: { type: 'string' },
          research_purpose: { type: 'string' },
          expected_evidence_type: {
            type: 'string',
            enum: [
              'statistic',
              'case_example',
              'platform_policy',
              'expert_quote',
              'checklist_item',
              'failure_example',
              'community_voc',
              'source_origin',
              'case_detail',
              'mechanism',
              'official_position',
              'public_reaction',
              'risk_check',
            ],
          },
          priority: { type: 'string', enum: ['required', 'optional'] },
        },
        required: ['item_id', 'item_title', 'research_purpose', 'expected_evidence_type', 'priority'],
      },
    },
    risk_flags: { type: 'array', items: { type: 'string' } },
    do_not_claim: { type: 'array', items: { type: 'string' } },
    stop_condition: { type: 'string', enum: ['proceed', 'needs_user_review', 'stop'] },
    stop_reason: { type: 'string' },
    user_review_questions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'planning_title',
    'topic_background',
    'target_reader',
    'reader_anxiety',
    'reader_desired_information',
    'content_angle',
    'why_now',
    'promised_takeaway',
    'suggested_content_pillar',
    'suggested_engagement_intent',
    'suggested_treatment',
    'suggested_format_type',
    'content_pattern',
    'source_mode',
    'target_reaction',
    'issue_plan',
    'psychological_arc',
    'deep_research_questions',
    'evidence_map',
    'article_slot_map',
    'required_research_items',
    'risk_flags',
    'do_not_claim',
    'stop_condition',
    'stop_reason',
    'user_review_questions',
  ],
};

async function readProjectFile(relativePath) {
  return fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), relativePath), 'utf8');
}

function extractPersonaSection(fullText, persona = 'general') {
  const escaped = persona.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+\\d+\\.\\s+${escaped}\\b[^\\n]*$[\\s\\S]*?(?=^##\\s+\\d+\\.|^##\\s+운영 메모|\\Z)`, 'm');
  const match = fullText.match(re);
  return (match?.[0] || fullText).slice(0, 3000);
}

function compactJsonText(text, maxChars = 5000) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2).slice(0, maxChars);
  } catch {
    return text.slice(0, maxChars);
  }
}

async function loadPlanningContext() {
  const [personasRaw, pillarsRaw, treatmentsRaw] = await Promise.all([
    readProjectFile('docs/content-personas.md'),
    readProjectFile('config/content-pillars.json'),
    readProjectFile('docs/content-logic/threads/04-pillars-and-treatments.md'),
  ]);

  return {
    personas: extractPersonaSection(personasRaw),
    pillars: compactJsonText(pillarsRaw),
    treatments: treatmentsRaw.slice(0, 5000),
  };
}

function parseToolInput(json) {
  const toolUse = (json.content || []).find((block) => block.type === 'tool_use' && block.name === 'create_content_plan');
  if (toolUse?.input) return toolUse.input;

  const text = (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude 응답에서 ContentPlan을 찾지 못했습니다.');
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
    const issueCandidate = body.issueCandidate && typeof body.issueCandidate === 'object' ? body.issueCandidate : null;
    const sourceArticle = body.sourceArticle && typeof body.sourceArticle === 'object' ? body.sourceArticle : null;
    // 사용자가 UI 에서 고른 모델 우선. 없으면 env 기본값. claude-* 화이트리스트로 안전 확보.
    const requestedModel = typeof body.claudeModel === 'string' && /^claude-/.test(body.claudeModel.trim())
      ? body.claudeModel.trim()
      : DEFAULT_CLAUDE_MODEL;

    if (!sourceArticle && !issueCandidate) {
      return NextResponse.json(
        { error: '원문 기사 또는 선택된 이슈 후보가 필요합니다. 수동 기획 프롬프트 모드는 비활성화되었습니다.' },
        { status: 400 }
      );
    }

    const userPrompt = sourceArticle
      ? [
          `원문 URL: ${sourceArticle.url || ''}`,
          `매체/도메인: ${sourceArticle.source_domain || ''}`,
          `원문 제목: ${sourceArticle.title || ''}`,
          `원문 설명: ${sourceArticle.description || ''}`,
          '',
          '<source_article_text>',
          String(sourceArticle.article_text || '').slice(0, 16000),
          '</source_article_text>',
          '',
          '이 원문 하나를 중심축으로 삼아 issue_explainer Threads 글감을 만드세요.',
          '원문에서 충분히 확인되는 내용과 추가 리서치가 필요한 내용을 분리하세요.',
        ].join('\n')
      : issueCandidate
      ? [
          `선택된 최근 이슈 후보: ${issueCandidate.issue_title || ''}`,
          `한 줄 훅 후보: ${issueCandidate.one_line_hook || ''}`,
          `카테고리: ${issueCandidate.category || ''}`,
          `왜 흥미로운가: ${issueCandidate.why_interesting || ''}`,
          `무엇이 바뀌었나: ${issueCandidate.what_changed || ''}`,
          `출처 요약: ${issueCandidate.source_summary || ''}`,
          `최신성: ${issueCandidate.recency_note || ''}`,
          '',
          '이 이슈를 issue_explainer 형식의 Threads 글감으로 만들기 위한 기획과 연계 리서치 질문을 작성하세요.',
        ].join('\n')
      : '';

    const docs = await loadPlanningContext();
    const system = [
      '당신은 기브니즈 Threads/X/LinkedIn 콘텐츠 기획 에이전트입니다.',
      '역할은 글을 바로 쓰는 것이 아니라, 내부 기준 문서를 바탕으로 콘텐츠 방향과 보강 리서치 항목을 설계하는 것입니다.',
      '이번 워크벤치 v1의 글 형식은 content_pattern=issue_explainer로 고정합니다.',
      '최근 이슈를 일반 실무자/창업자/운영자가 이해할 수 있게 풀어주는 것이 목적입니다. 독자를 소상공인으로 단정하지 마세요.',
      'Claude가 사실을 새로 만들면 안 됩니다. 후보에 있는 사실도 검증 전에는 주장/언급/보도 수준으로 다루고, deep_research_questions에 위임하세요.',
      'sourceArticle이 있으면 원문을 중심축으로 삼으세요. 여러 검색 결과를 섞어 중심을 흐리지 말고, 원문에서 뽑은 장면/숫자/인물/회사/시간축을 우선합니다.',
      'article_slot_map에는 원문에서 뽑은 멈추게 하는 첫 장면, 오래된 질서, 새 신호, 동시에 움직인 플레이어, 숫자, 고유명사, 직접 인용, 과거 맥락, 불확실성을 반드시 채우세요.',
      '기획 단계에서는 외부 자료를 검색한 척하거나 수치/사례를 단정하지 마세요.',
      '자료가 필요한 주장은 required_research_items에 위임하세요.',
      'IssuePlan은 고정 슬롯 나열이 아니라 독자의 심리 이동을 설계하기 위한 기획입니다.',
      'psychological_arc에는 독자가 글을 읽으며 이동해야 하는 감정/질문 흐름을 반드시 설계하세요.',
      '목표 레퍼런스의 거시 흐름은 낯섦 → 신뢰 → 궁금증 → 확장감 → 구조 이해 → 확신 → 미래감입니다.',
      '첫 감정은 “어? 뭐지”가 되어야 하고, 중간에는 “이게 한 번짜리가 아니네”로 커져야 하며, 마지막은 “앞으로 더 커지겠네”로 남아야 합니다.',
      '이슈마다 가장 민감하게 반응할 독자 하나를 정하되, 글 안에서 독자를 중간에 바꾸지 마세요.',
      '표현은 딱딱한 뉴스 요약이 아니라 Threads에서 읽히는 말투로 변주하되, 사실은 단정하지 마세요.',
      '과장 위험은 risk_flags와 do_not_claim에 반드시 분리해 적으세요.',
      '각 설명 필드는 1~2문장으로 압축하세요.',
      'deep_research_questions는 4~6개 작성하세요. psychological_arc의 credibility_hook, pattern_shift, structural_meaning, proof_needed를 입증하거나 반박할 질문을 우선합니다.',
      '질문은 “기능이 무엇인가”보다 “첫 화면에서 멈추게 하는 구체 장면을 믿게 하는 디테일”, “단발 사건이 아니라 흐름이라는 증거”, “돈/권한/데이터/역할이 어디서 어디로 이동하는지”를 확인하게 만드세요.',
      'required_research_items는 deep_research_questions와 같은 내용을 기존 UI 호환용으로 4개 이하만 압축해 작성하세요.',
      'risk_flags, do_not_claim, user_review_questions는 각각 최대 5개까지만 작성하세요.',
    ].join('\n');

    const user = [
      '<internal_docs>',
      '<personas>',
      docs.personas,
      '</personas>',
      '<pillars>',
      docs.pillars,
      '</pillars>',
      '<treatments>',
      docs.treatments,
      '</treatments>',
      '</internal_docs>',
      '<user_input>',
      sourceArticle ? '<source_mode>source_article</source_mode>' : '<source_mode>issue_candidate</source_mode>',
      `<planning_prompt>${userPrompt}</planning_prompt>`,
      '</user_input>',
      '위 기준을 바탕으로 ContentPlan을 생성하세요. required_research_items는 글의 알맹이를 강화하기 위한 자료만 포함하세요.',
    ].filter(Boolean).join('\n\n');

    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: requestedModel,
        max_tokens: 4500,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: user }],
        tools: [
          {
            name: 'create_content_plan',
            description: '기브니즈 콘텐츠 기획 결과를 구조화된 JSON으로 만든다.',
            input_schema: CONTENT_PLAN_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: 'create_content_plan' },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `Claude API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    const contentPlan = parseToolInput(json);
    return NextResponse.json({
      contentPlan,
      model: DEFAULT_CLAUDE_MODEL,
      usage: json.usage || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '기획 생성 실패' }, { status: 500 });
  }
}
