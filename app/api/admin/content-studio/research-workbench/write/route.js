import { NextResponse } from 'next/server';
import { buildKnowledgeContext, getThreadsBadExamples, getThreadsRealBodySamples } from '@/lib/knowledge/loader';

// R1 초안(gpt-5) 생성도 길게 걸려 Vercel 기본 타임아웃을 넘긴다. webhook 패턴과 동일하게 한도 상향.
export const runtime = 'nodejs';
export const maxDuration = 300;

const OPENAI_BASE = 'https://api.openai.com/v1';
const DEFAULT_WRITER_MODEL = process.env.OPENAI_THREAD_MODEL || 'gpt-5';

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          title: { type: 'string' },
          format: { type: 'string' },
          posts: {
            type: 'array',
            minItems: 7,
            maxItems: 8,
            items: { type: 'string' },
          },
          evidence: {
            type: 'array',
            items: { type: 'string' },
          },
          source_links: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                url: { type: 'string' },
                source_domain: { type: 'string' },
              },
              required: ['label', 'url', 'source_domain'],
            },
          },
          risk: { type: 'string' },
          tone_notes: { type: 'string' },
        },
        required: ['id', 'label', 'title', 'format', 'posts', 'evidence', 'source_links', 'risk', 'tone_notes'],
      },
    },
  },
  required: ['drafts'],
};

const INTERNAL_LABEL_REPLACEMENTS = [
  [/^근거 신호[.:：]?\s*/i, ''],
  [/^출처 신호[.:：]?\s*/i, ''],
  [/^핵심 반전[.:：]?\s*/i, ''],
  [/^여기 반전[은이]?[.:：]?\s*/i, ''],
  [/^전환 문장[.:：]?\s*/i, ''],
  [/^작동 방식[.:：]?\s*/i, ''],
  [/^왜 중요한가[.:：]?\s*/i, ''],
  [/^불확실성[/:：]?\s*/i, ''],
  [/^결론\/주의점[.:：]?\s*/i, ''],
];

function normalizePostText(post) {
  if (typeof post !== 'string') return '';
  let text = post.trim();
  for (const [pattern, replacement] of INTERNAL_LABEL_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/\b(E|R)\d{1,3}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeDrafts(drafts) {
  if (!Array.isArray(drafts)) return [];
  return drafts.slice(0, 1).map((draft) => ({
    ...draft,
    posts: Array.isArray(draft.posts) ? draft.posts.map(normalizePostText).filter(Boolean) : [],
    source_links: Array.isArray(draft.source_links) ? draft.source_links : [],
  }));
}

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 환경변수가 필요합니다.');
  return key;
}

function buildReferenceContext({ contentPlan, evidenceSnapshot }) {
  const queryText = [
    contentPlan.planning_title,
    contentPlan.content_angle,
    contentPlan.promised_takeaway,
    contentPlan.reader_anxiety,
    contentPlan.suggested_treatment,
    contentPlan.suggested_content_pillar,
    contentPlan.content_pattern,
    contentPlan.issue_plan?.issue_summary,
    contentPlan.issue_plan?.key_reversal,
    contentPlan.issue_plan?.why_it_matters,
    contentPlan.psychological_arc?.credibility_hook,
    contentPlan.psychological_arc?.pattern_shift,
    contentPlan.psychological_arc?.structural_meaning,
    contentPlan.psychological_arc?.reader_end_realization,
    ...evidenceSnapshot.map((item) => item.finding_text || ''),
  ].filter(Boolean).join(' ');

  const knowledgeBlock = buildKnowledgeContext({
    channel: 'threads',
    persona: contentPlan.target_reader || 'general',
    topicCluster: 'general',
    contentPillar: contentPlan.suggested_content_pillar,
    contentTreatment: contentPlan.suggested_treatment,
    referenceQueryText: queryText,
    includeAudit: true,
  });

  const badExamples = getThreadsBadExamples({ maxSamples: 1 });
  const badExampleBlock = badExamples.length > 0
    ? `[BAD — GPT Writer가 쉽게 회귀하는 실패 톤]\n${badExamples[0].body}\n진단: ${badExamples[0].diagnosis}`
    : '';

  const toneRes = getThreadsRealBodySamples({
    queryText,
    maxSamples: 2,
    preferSingle: true,
    variantHint: {
      hook_pattern: contentPlan.content_pattern === 'issue_explainer' ? 'provocation' : 'niche_expert',
      engagement_intent: contentPlan.suggested_engagement_intent || 'trust',
      structure_template: contentPlan.content_pattern === 'issue_explainer' ? 'observation_breaks_norm' : 'info_vs_criterion',
    },
    debug: true,
  });
  const realbodyBlock = toneRes?.block
    ? `[GOOD — 실제 저장해둔 Threads 톤 샘플. 문장을 베끼지 말고 호흡, 줄바꿈, 말투, 전개감만 참고]\n${toneRes.block}`
    : '';

  return {
    knowledgeBlock,
    badExampleBlock,
    realbodyBlock,
    referenceMeta: {
      realbody_picks: (toneRes?.picks || []).map((pick) => ({
        topic_label: pick.topic_label,
        score: pick.score,
        tone_meta: pick.tone_meta,
        preview: (pick.rootText || '').slice(0, 80),
      })),
      has_bad_example: Boolean(badExampleBlock),
      has_knowledge_block: Boolean(knowledgeBlock),
    },
  };
}

function buildWriterPrompt({ contentPlan, evidenceSnapshot, referenceContext }) {
  const issuePlan = contentPlan.issue_plan || {};
  const isIssueExplainer = contentPlan.content_pattern === 'issue_explainer' || Boolean(issuePlan.issue_summary);
  const evidenceText = evidenceSnapshot.length
    ? evidenceSnapshot.map((item, index) => [
        `[E${index + 1}] ${item.item_id || ''}`,
        `- finding: ${item.finding_text || ''}`,
        `- source: ${item.source_domain || ''}`,
        `- source_url: ${item.source_url || item.citation_url || ''}`,
        `- type: ${item.evidence_type || ''}`,
        `- recency: ${item.recency_note || ''}`,
      ].join('\n')).join('\n\n')
    : '채택된 근거 없음';
  const sourceLinksText = evidenceSnapshot
    .map((item) => ({
      url: item.source_url || item.citation_url || '',
      source_domain: item.source_domain || '',
      label: item.source_domain || item.item_id || 'source',
    }))
    .filter((item) => item.url)
    .map((item, index) => `${index + 1}. ${item.label} — ${item.url}`)
    .join('\n') || '출처 URL 없음';

  if (isIssueExplainer) {
    const slotMap = contentPlan.article_slot_map || {};
    const psychologicalArc = contentPlan.psychological_arc || {};
    return [
      '당신은 기브니즈 Threads/X/LinkedIn용 issue_explainer Writer입니다.',
      '',
      '목표:',
      '- 최근 이슈 하나를 한국어 Threads에서 읽히는 설명형 글로 만드세요.',
      '- 글 형식은 issue_explainer입니다. posts는 반드시 7~8개로 구성하세요.',
      '- 표현은 자연스럽게 변주하되, 사실은 evidence_snapshot 안에서만 사용하세요.',
      '- 검증 안 된 내용은 “주장/언급/보도/알려짐”으로 표현하고 단정하지 마세요.',
      '- 포스트 개수는 7~8개입니다. 6개 이하는 얕고, 9개 이상은 늘어지는 것으로 봅니다.',
      '- posts 배열의 각 항목은 “문장 하나”가 아니라 실제 Threads의 한 포스트입니다.',
      '- 문장을 하나씩 쪼개서 1~13개 카드로 만들지 마세요. 그러면 실패입니다.',
      '- 한 post 안에는 4~9개의 짧은 줄을 넣어도 됩니다. 줄은 짧게, 포스트는 흐름 단위로 묶으세요.',
      '- 포스트 1개는 독자가 한 화면에서 읽는 작은 장면입니다. 줄은 여러 개여도 되지만, 카드 수는 7~8개로 맞춥니다.',
      '- 각 post는 한 가지 중심 beat를 맡되, 그 beat를 이해시키는 구체 문장들은 같은 post 안에 묶으세요.',
      '- 한 post에 사건, 해석, 결론을 모두 넣지 마세요. 대신 장면, 근거, 전환, 의미를 흐름별로 나눕니다.',
      '- 좋은 분할 기준은 “독자의 질문이 바뀌는 순간”입니다. 무슨 일? 누가? 왜? 더 큰 흐름? 그래서 뭐? 이런 질문이 바뀔 때 다음 post로 넘어갑니다.',
      '- 첫 문장은 “OO 쓰는 사람 한 번 보셈”처럼 대상이 바로 느껴지는 호출형으로 시작할 수 있습니다.',
      '- 다만 매번 대상 호출형으로 시작하면 반복감이 생깁니다. 원문에 강한 숫자, 사람, 회사, 사건, 날짜가 있으면 사건 장면형 훅으로 시작하세요.',
      '- 사건 장면형 훅은 “어제 OO에 무슨 일이 올라옴.”, “OO 만든 회사가 어제 SEC에 서류를 냄.”처럼 독자가 바로 장면을 보는 방식입니다.',
      '- 사건 장면형 훅을 쓸 때는 1 post 안에 숫자, 주체, 의외성을 짧게 박아 넣고 정체를 조금 늦게 풀어도 됩니다.',
      '- 대상 호출형과 사건 장면형을 번갈아 쓰세요. 같은 글 묶음 안에서는 하나의 방식만 선택해 밀고 갑니다.',
      '- 첫 문장은 꼭 같은 패턴으로 시작하지 않아도 됩니다. 같은 기능을 하되 장면으로 붙잡아도 됩니다.',
      '- 좋은 첫 문장 예: “어제 GitHub에 코드 하나가 올라옴.” / “노트북 사려는 사람 잠깐만.” / “온라인 쇼핑 자주 하는 사람 이거 봐야 함.”',
      '- 사건 장면형 예: “Claude 만든 회사가 어제 SEC에 비밀 상장 서류를 냄.” / “어제 GitHub에 코드 하나가 올라옴.” / “미국 규제기관이 AI 광고 하나를 잡았음.”',
      '- 첫 post는 반드시 독자가 머릿속에 장면을 그릴 수 있어야 합니다. “광고를 맞춰준다”, “AI로 최적화한다”, “성과를 올린다”처럼 감이 안 잡히는 표현만 쓰면 실패입니다.',
      '- 첫 post에서 추상 표현을 썼다면 바로 다음 줄에서 무엇을 보고, 누구에게, 어떤 행동이나 광고를 보여준다는 뜻인지 구체 장면으로 풀어주세요.',
      '- 첫 post의 마지막에는 다음 post를 당기는 짧은 전환을 둘 수 있습니다. 고정 문구처럼 반복하지 말고 소재에 맞게 변주하세요.',
      '- 좋은 전환은 짧고, 판단이 먼저 보이고, 다음 문단에서 이유를 듣고 싶게 만듭니다.',
      '- 전환 예: “그래서 뭐가 문제냐?”, “왜 이게 껄끄럽냐?”, “이게 핵심인 이유.”, “여기부터 문제가 커짐.”, “이게 포인트임.”',
      '- 사용자가 보여준 계정처럼 깊이를 만들려면 중간부가 중요합니다. “어떻게 된 일인지”, “왜 그게 문제인지”, “기존 상식이 왜 안 통하는지”를 단계적으로 풀어야 합니다.',
      '- 글은 정보 순서가 아니라 독자 심리 이동 순서로 씁니다. 낯섦, 신뢰, 궁금증, 확장감, 구조 이해, 확신, 미래감으로 이동해야 합니다.',
      '- 첫 부분은 독자가 멈추게 하는 구체 장면으로 시작하고, 바로 다음에는 이름, 날짜, 숫자, 장소, 직접 발언으로 “진짜네”를 만들어야 합니다.',
      '- 중간에는 “이게 한 번짜리가 아니네”를 보여주는 추가 사례나 비슷한 흐름을 넣으세요.',
      '- 후반에는 기능 설명이 아니라 돈, 권한, 데이터, 역할, 선택권 중 무엇이 어디로 이동하는지를 보여주세요.',
      '- 마지막은 교육형 과제처럼 닫지 말고, 독자가 “앞으로 더 커지겠네”라고 느끼는 한 문장으로 닫으세요.',
      '- 빈 슬롯이나 약한 근거는 억지로 문장화하지 마세요. 근거가 없으면 그 포스트 역할은 건너뛰고, 확인된 장면끼리 자연스럽게 연결하세요.',
      '- 각 post를 쓰기 전에 바로 앞 post와 이어지는지 점검하세요. “이 이슈”, “그 문제”처럼 지시어만 던져 문맥이 비게 만들지 마세요.',
      '',
      '말투:',
      '- 뉴스 기사체, 보고서체, 존댓말 설명체로 쓰지 마세요.',
      '- 짧은 행갈이와 단정적인 구어체를 씁니다. 예: “올라왔음.”, “줄 섰음.”, “이유는 따로 있음.”',
      '- “~입니다/합니다/볼 수 있습니다”를 기본 문체로 쓰지 마세요. 필요할 때만 아주 적게 씁니다.',
      '- 과한 밈/ㅋㅋ/이모지는 쓰지 않습니다. 담담하게 쓰되, 무엇이 문제인지 바로 보이게 씁니다.',
      '- 문장 끝은 “했음/나옴/보임/거임/뜻임/자리” 같은 구어체를 섞되, 전부 같은 어미로 반복하지 마세요.',
      '- “했음”만 반복하면 어색합니다. “올라왔다”, “붙어 있었다”, “줄 선 거임”, “뜻임”, “그 얘기다”처럼 자연스럽게 섞으세요.',
      '- 중간 전환에 “결론이 뭐냐?”, “핵심은 이거임.”, “이게 그냥 뉴스가 아닌 이유.” 같은 문장을 쓸 수 있습니다.',
      '- “선을 넘었음”, “큰일났음” 같은 표현은 쓸 수 있습니다. 다만 주어와 상황이 붙어 있어야 합니다. 예: “AI 수익 보장 광고가 선을 넘었다고 FTC가 본 거임.”',
      '- 강한 문장을 쓰면 바로 다음 줄에서 누가, 무엇을, 어디까지 했는지 13~25자 안팎의 짧은 문장으로 풀어주세요.',
      '- “너무 세게 약속했다”처럼 기준이 흐린 표현은 그대로 쓰지 마세요. “수익을 보장하듯 팔았다”, “환불을 약속했지만 지키지 않았다는 혐의가 붙었다”처럼 문제 행동을 구체적으로 쓰세요.',
      '- “광고를 맞춰준다”, “고객을 분석한다”, “AI가 알아서 한다”처럼 목적어와 작동 장면이 흐린 문장은 그대로 쓰지 마세요. “대화에서 관심사를 뽑고, 그 관심사에 맞춰 지역 광고를 보여준다는 주장”처럼 구체적으로 풉니다.',
      '- “끝판왕”, “역대급”, “미쳤다”, “대박”처럼 신뢰도를 깎는 과장 관용어는 쓰지 마세요. 솔깃함이 필요하면 “광고주 입장에선 꽤 솔깃한 기능”, “진짜라면 타겟팅 기준이 달라지는 얘기”처럼 구체적으로 씁니다.',
      '- 근거 없이 “거의 다”, “대부분”, “전부”, “항상”, “무조건”처럼 넓게 단정하지 마세요.',
      '- 업계 분위기를 말해야 할 때는 “요즘 자주 들리는 말”, “광고에서 자주 보이는 표현”, “이런 식으로 팔리는 경우가 있음”처럼 근거 수준에 맞춰 낮춥니다.',
      '- 넓은 일반화가 필요하면 반드시 evidence에 있는 범위로 제한하세요. 예: “FTC가 문제 삼은 광고 문구 기준”, “이번 보도자료에 나온 주장 기준”.',
      '- 규제기관/소송/합의 기사에서는 법적 상태를 낮춰 표현하세요. “확정됨”보다 “FTC 주장 기준”, “혐의 합의”, “제재 절차”, “합의 명령”처럼 원문 수준을 유지합니다.',
      '- “허위 광고로 봤음”처럼 쓸 수 있지만, 앞뒤에 “FTC 주장 기준” 또는 “FTC는”을 붙여 누가 그렇게 봤는지 분명히 하세요.',
      '- 실제 독자 영향이 큰 이슈라면 “이건 편의 문제가 아니라 생사랑 직접 연결됨.”처럼 강한 문장을 쓸 수 있습니다. 단, 보안, 의료, 금융, 구매 결정처럼 근거상 실제 영향이 클 때만 쓰세요.',
      '- 한 문장 안에 정보가 너무 많이 들어가면 안 됩니다. 길어지는 문장은 두 문장으로 나누세요.',
      '- 두 문장으로 나눌 때는 문맥이 끊기지 않게 연결하세요. 예: “요약부터 하자면, 17개 솔루션을 공개했음. 방향은 광고 에이전시가 아니라 마케팅 테크 파트너로 가겠다는 쪽임.”',
      '- 각 줄은 대체로 15~23자 안팎으로 오르내리게 쓰세요. 정확히 세지 말고, 사람이 말하듯 짧은 줄과 조금 긴 줄을 섞으세요.',
      '- 한 줄이 26자 이상 길어지면 보통 두 줄로 나눕니다. 고유명사나 직접 인용 때문에 어쩔 수 없는 경우만 예외입니다.',
      '- 번호식 설명, 화살표 설명, 압축 요약 문장을 남발하지 마세요. “1) 질문→의도 파악 2) 후보 군집→요약” 같은 틀은 가능하면 장면 묘사로 풀어 쓰세요.',
      '- 단어를 나열할 때는 쉼표만 쓰세요. 가운데점(·), 슬래시(/), 화살표(→), 작은따옴표, 불릿 기호를 발행문에 쓰지 마세요.',
      '- 예: “검색, 비교, 요약, 추천”처럼 쓰세요. “검색·비교·요약”, “검색/비교/요약”, “검색→비교”처럼 쓰면 실패입니다.',
      '- 각 포스트의 역할은 유지하되, 시작 문장과 전개 문장은 매번 다르게 잡으세요. 슬롯 이름이 문장 패턴으로 굳어지면 실패입니다.',
      '- “그래서 뭐가 문제냐?”, “왜 이게 껄끄럽냐?”, “이게 핵심인 이유.”, “여기부터 문제가 커짐.”, “이게 포인트임.” 같은 문맥 연결 문장을 적절히 써도 됩니다.',
      '- “여기 반전은?”, “근거는?”, “결론이 뭐냐?” 같은 짧은 라벨형 전환도 쓸 수 있습니다. 단, 같은 라벨을 반복하면 실패입니다.',
      '- 라벨형/문장형/질문형을 번갈아 씁니다. 예: “여기 반전은?” 다음에는 “근데 진짜 중요한 건 여기부터임.” 또는 “그래서 이게 그냥 뉴스가 아님.”처럼 바꿔 쓰세요.',
      '- 같은 뉘앙스는 조금씩 다르게 풀어주세요. “여기서 그림이 조금 바뀜.”, “문제는 여기서 시작됨.”, “이게 단순 기능 업데이트가 아닌 이유가 있음.”처럼 변주합니다.',
      '- 쉼표, 물음표, 느낌표는 조금만 섞으세요. 예: “왜냐면, 이게 구매 버튼 앞까지 오기 때문임.” / “그럼 끝난 거냐? 아직 아님.” / “이건 꽤 큰 신호임.”',
      '- 단, “출처 신호:”, “작동 방식:”, “불확실성:”처럼 내부 슬롯명을 그대로 붙이는 건 피하세요. 독자가 읽는 말로 바꿔 씁니다.',
      '- AI가 쓴 것처럼 매끈하게 요약하지 마세요. 사람이 원문을 읽고 중간중간 짚어주는 호흡으로 쓰세요.',
      '- 모든 문단이 같은 길이와 같은 리듬이면 실패입니다. 짧게 끊는 문장, 설명하는 문장, 질문형 전환을 섞으세요.',
      '- 사용자가 수정한 톤처럼 ‘조금 거친 구어체 + 설명형’으로 쓰되, 맞춤법이 너무 무너지면 안 됩니다. “됨/됌” 같은 오탈자는 고쳐 쓰세요.',
      '- 표현 변주는 아주 조금만 합니다. 구조는 예시 계정처럼 유지합니다.',
      '',
      'Narrative beats:',
      `1. 멈추게 하는 첫 장면 또는 대상 호출: ${issuePlan.audience_callout || ''}`,
      `2. 사건을 고정하는 구체 디테일: ${issuePlan.issue_summary || ''}`,
      '3. 누가 말했는지, 어디서 나왔는지, 왜 진짜 기사거리인지',
      '4. 이게 한 번짜리 사건이 아니라는 추가 장면이나 비슷한 흐름',
      `5. 구조 해석. 왜 이런 일이 생겼는지 또는 무엇이 이동하는지: ${issuePlan.key_reversal || ''}`,
      `6. 숫자, 반응, 시장 근거로 받쳐주는 부분: ${issuePlan.why_it_matters || ''}`,
      `7. 과거 사례, 큰 비유, 독자 결론, 출처: ${issuePlan.reader_takeaway || contentPlan.promised_takeaway || ''}`,
      '',
      'Psychological Arc:',
      `- 첫 감정: ${psychologicalArc.reader_start_emotion || ''}`,
      `- 첫 질문: ${psychologicalArc.reader_first_question || ''}`,
      `- 신뢰를 만드는 디테일: ${psychologicalArc.credibility_hook || ''}`,
      `- 호기심 사다리: ${(psychologicalArc.curiosity_ladder || []).join(', ')}`,
      `- 단발 사건이 아니라 흐름이 되는 지점: ${psychologicalArc.pattern_shift || ''}`,
      `- 구조적 의미: ${psychologicalArc.structural_meaning || ''}`,
      `- 더 필요한 근거: ${(psychologicalArc.proof_needed || []).join(', ')}`,
      `- 마지막에 남길 깨달음: ${psychologicalArc.reader_end_realization || ''}`,
      '',
      'Beat 운영 규칙:',
      '- beat 개수와 post 개수를 1:1로 맞추지 않아도 됩니다. 최종 post 수는 7~8개로 조정하세요.',
      '- 근거가 약한 beat는 앞뒤 beat에 자연스럽게 합치세요.',
      '- 근거가 충분하고 장면이 많으면 더 나눠도 됩니다.',
      '- 단, 문장 단위로 쪼개지 마세요. 한 post는 독자가 화면 하나에서 따라갈 수 있는 작은 장면이어야 합니다.',
      '- 각 post는 자체적으로 “장면 또는 주장 → 근거 디테일 → 다음 궁금증”을 가져야 합니다.',
      '- 7~8개 구성 예: 1 멈추는 장면, 2 원천 디테일, 3 누가/무엇을 했나, 4 왜 한 번짜리가 아닌가, 5 구조적 반전, 6 숫자/반응/시장 근거, 7 불확실성/주의점, 8 독자 결론/출처.',
      '- 짧게 끝내는 것보다 중요한 건 다음 post를 읽게 만드는 연결감입니다.',
      '- 각 post 끝에는 다음을 읽게 만드는 작은 미해결감을 남기세요. 예: “이유는 따로 있음.” / “근데 여기서 하나 더 있음.” / “이게 처음은 아님.”',
      '- 모든 소재를 같은 문장 형식으로 풀지 마세요. beat의 역할은 같아도 문장틀은 달라야 합니다.',
      '',
      'Article Slot Map:',
      `- 멈추게 하는 첫 장면: ${slotMap.strange_scene || ''}`,
      `- 독자 결정: ${slotMap.reader_decision || ''}`,
      `- 오래된 질서: ${slotMap.old_order || ''}`,
      `- 새 신호: ${slotMap.new_signal || ''}`,
      `- 동시에 움직인 플레이어: ${(slotMap.coordinated_players || []).join(', ')}`,
      `- 숫자: ${(slotMap.hard_numbers || []).join(', ')}`,
      `- 고유명사: ${(slotMap.named_entities || []).join(', ')}`,
      `- 직접 인용: ${(slotMap.direct_quotes || []).join(' / ')}`,
      `- 과거 실패/역사: ${slotMap.past_failure_or_history || ''}`,
      `- 이번엔 다른 이유: ${slotMap.why_now_changed || ''}`,
      `- 불확실성/반론: ${slotMap.counter_signal_or_uncertainty || ''}`,
      `- 닫는 프레임: ${slotMap.closing_frame || ''}`,
      '',
      `표현 방향: ${issuePlan.expression_direction || ''}`,
      '',
      '금지:',
      '- do_not_claim에 있는 주장을 쓰지 마세요.',
      '- 근거에 없는 수치, 피해 규모, 공식 입장, 원천 인물을 만들지 마세요.',
      '- “출처 신호”, “작동 방식”, “불확실성” 같은 내부 슬롯명을 본문 문장 앞에 그대로 붙이지 마세요. 다만 “여기 반전은?”, “근거는?” 같은 자연스러운 짧은 전환은 가끔 허용합니다.',
      '- 직접 확인하지 않은 경험을 “내가 써봤다/갈아탔다”라고 쓰지 마세요.',
      '- 원문에 없는 고유명사, 숫자, 인용문을 추가하지 마세요.',
      '- citation URL은 중간 본문에 넣지 마세요. 마지막 post의 맨 끝 또는 source_links 필드에만 남기세요.',
      '- E1, E2, R01 같은 evidence id는 posts 본문에 쓰지 말고 evidence 필드에만 적으세요.',
      '- 발행문 posts 안에서는 가운데점(·), 슬래시(/), 화살표(→), 작은따옴표를 쓰지 마세요. 나열은 쉼표로 처리하세요.',
      '- reference_context의 문장을 그대로 베끼지 마세요. 톤과 구조만 참고하세요.',
      '- 사용자가 명시하지 않은 다음 발행 예고, 후속 글 예고, “계속 정리해서 올릴 예정”, “OO도 묶어서 올릴 예정” 같은 문장을 만들지 마세요.',
      '',
      '마지막 post 규칙:',
      '- 마지막 post는 반드시 세 요소를 포함하세요: 한 줄 결론, 출처 표기, 출처 링크 또는 source_links.',
      '- 출처 표기는 먼저 매체명/도메인명으로 짧게 씁니다. 예: “출처: FTC, Reuters.”',
      '- 실제 URL은 마지막 post 맨 끝에만 붙이거나, source_links 필드에 반드시 넣으세요.',
      '- 팔로우 CTA나 다음 발행 예고는 사용자가 명시적으로 요청한 경우에만 씁니다.',
      '- CTA가 필요해도 후속 주제를 임의로 약속하지 마세요. 허용되는 수준은 “필요하면 저장해두면 됨.” 정도입니다.',
      '- 출처가 하나도 없으면 “출처 확인 필요”라고 쓰지 말고, 초안 risk에 출처 부족을 적으세요.',
      '',
      '<content_plan>',
      JSON.stringify(contentPlan, null, 2),
      '</content_plan>',
      '',
      '<evidence_snapshot>',
      evidenceText,
      '</evidence_snapshot>',
      '',
      '<source_links>',
      sourceLinksText,
      '</source_links>',
      '',
      '<do_not_claim>',
      (contentPlan.do_not_claim || []).map((claim) => `- ${claim}`).join('\n') || '- 없음',
      '</do_not_claim>',
      '',
      '<reference_context>',
      referenceContext.badExampleBlock,
      '',
      referenceContext.realbodyBlock,
      '',
      referenceContext.knowledgeBlock,
      '</reference_context>',
      '',
      '출력은 JSON schema를 따르세요. drafts는 정확히 1개만 만드세요.',
      '한 개의 최종 후보에 집중하세요. 사건 전개, 구체 장면, 구조 해석, 반전이 모두 살아 있어야 합니다.',
    ].join('\n');
  }

  return [
    '당신은 기브니즈 Threads/X/LinkedIn용 짧은 SNS 글 Writer입니다.',
    '',
    '목표:',
    '- 아래 content_plan, evidence_snapshot, reference_context를 사용해 초안 1개를 만드세요.',
    '- 초안은 한국어 Threads에 맞게 짧고 읽히게 작성하세요.',
    '- 독자를 가르치기보다, 옆에서 판단 기준을 정리하는 톤으로 쓰세요.',
    '- reference_context의 realbody 톤 샘플처럼 줄을 짧게 끊고, 말의 호흡을 살리세요.',
    '- 정보는 evidence_snapshot에서 가져오되, 말투와 구조는 reference_context를 따르세요.',
    '- post 개수는 7~8개로 구성하세요.',
    '- posts 배열은 문장 단위가 아니라 실제 Threads 포스트 단위입니다.',
    '- 각 post는 한 화면에서 읽히는 작은 장면으로 작성하세요.',
    '',
    '금지:',
    '- do_not_claim에 있는 주장을 쓰지 마세요.',
    '- 근거에 없는 수치, 효과, 순위 상승, 노출 보장을 만들지 마세요.',
    '- “무조건”, “끝났다”, “망한다” 같은 과장 공포 표현을 쓰지 마세요.',
    '- citation URL은 중간 본문에 넣지 말고 마지막 post 또는 source_links 필드에만 남기세요.',
    '- E1, E2, R01 같은 evidence id는 내부 추적용입니다. posts 본문에는 절대 쓰지 말고 evidence 필드에만 적으세요.',
    '- 제목에 “체크 8”, “가이드 5”처럼 어색하게 숫자를 붙이지 마세요. 숫자를 쓰려면 “오늘 확인할 5가지”, “8가지 체크포인트”처럼 자연스럽게 쓰세요.',
    '- reference_context의 문장을 그대로 베끼지 마세요. 톤과 구조만 참고하세요.',
    '- BAD 예시처럼 보고서체, 존댓말 일관, 어디에나 붙는 결론으로 쓰면 실패입니다.',
    '- 사용자가 명시하지 않은 다음 발행 예고, 후속 글 예고, “계속 정리해서 올릴 예정”, “OO도 묶어서 올릴 예정” 같은 문장을 만들지 마세요.',
    '',
    '<content_plan>',
    JSON.stringify(contentPlan, null, 2),
    '</content_plan>',
    '',
    '<evidence_snapshot>',
    evidenceText,
    '</evidence_snapshot>',
    '',
    '<source_links>',
    sourceLinksText,
    '</source_links>',
    '',
    '<do_not_claim>',
    (contentPlan.do_not_claim || []).map((claim) => `- ${claim}`).join('\n') || '- 없음',
    '</do_not_claim>',
    '',
    '<reference_context>',
    referenceContext.badExampleBlock,
    '',
    referenceContext.realbodyBlock,
    '',
    referenceContext.knowledgeBlock,
    '</reference_context>',
    '',
    '출력은 JSON schema를 따르세요. drafts는 정확히 1개만 만드세요.',
  ].join('\n');
}

function parseDraftResponse(json) {
  const choice = json.choices?.[0] || {};
  const content = choice.message?.content || '';
  if (!content) {
    const reason = choice.finish_reason ? ` finish_reason=${choice.finish_reason}` : '';
    throw new Error(`OpenAI 응답이 비어 있습니다.${reason}`);
  }
  return JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

export async function POST(request) {
  try {
    const body = await request.json();
    const contentPlan = body.contentPlan || {};
    const evidenceSnapshot = Array.isArray(body.evidenceSnapshot) ? body.evidenceSnapshot : [];

    if (!contentPlan.content_angle && !contentPlan.planning_title) {
      return NextResponse.json({ error: 'contentPlan이 필요합니다.' }, { status: 400 });
    }

    const referenceContext = buildReferenceContext({ contentPlan, evidenceSnapshot });
    const prompt = buildWriterPrompt({ contentPlan, evidenceSnapshot, referenceContext });
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: DEFAULT_WRITER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You write grounded Korean social posts. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 6000,
        reasoning_effort: 'minimal',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'writer_drafts',
            strict: true,
            schema: DRAFT_SCHEMA,
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `OpenAI API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    const parsed = parseDraftResponse(json);
    return NextResponse.json({
      drafts: normalizeDrafts(parsed.drafts),
      model: DEFAULT_WRITER_MODEL,
      usage: json.usage || null,
      referenceMeta: referenceContext.referenceMeta,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Writer 초안 생성 실패' }, { status: 500 });
  }
}
