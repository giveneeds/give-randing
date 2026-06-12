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
            maxItems: 7,
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
  // 섹션 구조 라벨 — 모델이 포스트 첫 줄에 붙이는 내부 제목
  [/^장면 한 컷 고정[\s\n]*/i, ''],
  [/^포인트만 뽑자[\s\n]*/i, ''],
  [/^왜 지금 바뀌냐[\s\n]*/i, ''],
  [/^추가 신호[\s\n]*/i, ''],
  [/^오늘 기준 바꾸자[\s\n]*/i, ''],
  [/^한 줄 결론[\s\n]*/i, ''],
  [/^결론 한 줄[\s\n]*/i, ''],
  [/^핵심 정리[\s\n]*/i, ''],
  [/^요약[\s\n]*/i, ''],
  [/^정리[\s\n]*/i, ''],
];

function normalizePostText(post) {
  if (typeof post !== 'string') return '';
  let text = post.trim();
  for (const [pattern, replacement] of INTERNAL_LABEL_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/\b(E|R)\d{1,3}\b/g, '')
    .replace(/ {2,}/g, ' ')  // 공백만 정리 — \n은 보존
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

function buildWriterPrompt({ contentPlan, evidenceSnapshot, referenceContext, sourceArticleText }) {
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
  // 1차 출처(이슈/기사 원문)가 항상 첫 번째 항목 — evidence가 비어도 원문 링크는 살아야 한다.
  const primarySourceUrl = String(contentPlan.primary_source_url || '').trim();
  const sourceLinkRows = [];
  if (primarySourceUrl) {
    let primaryLabel = '1차 출처';
    try { primaryLabel = new URL(primarySourceUrl).hostname.replace(/^www\./, ''); } catch {}
    sourceLinkRows.push({ url: primarySourceUrl, label: primaryLabel });
  }
  for (const item of evidenceSnapshot) {
    const url = item.source_url || item.citation_url || '';
    if (!url || url === primarySourceUrl) continue;
    sourceLinkRows.push({ url, label: item.source_domain || item.item_id || 'source' });
  }
  const sourceLinksText = sourceLinkRows
    .map((item, index) => `${index + 1}. ${item.label} — ${item.url}`)
    .join('\n') || '출처 URL 없음';

  if (isIssueExplainer) {
    const slotMap = contentPlan.article_slot_map || {};
    const psychologicalArc = contentPlan.psychological_arc || {};
    return [
      '당신은 기브니즈 Threads/X/LinkedIn용 issue_explainer Writer입니다.',
      '',
      '═══ 기본 규칙 ═══',
      '- 최근 이슈 하나를 한국어 Threads에서 읽히는 설명형 글로 만드세요.',
      '- 표현은 자연스럽게 변주하되, 사실은 evidence_snapshot 안에서만 사용하세요.',
      '- 검증 안 된 내용은 “주장/언급/보도/알려짐”으로 표현하고 단정하지 마세요.',
      '- 포스트 개수는 정확히 7개입니다. 6개도 8개도 아닌 7개로 고정하세요.',
      '- posts 배열의 각 항목은 문장 하나가 아니라 실제 Threads의 한 포스트입니다.',
      '- ★ 각 문장은 반드시 줄바꿈(\\n)으로 구분하세요. 한 post 안에서 문장들을 공백으로 이어 붙이지 마세요.',
      '  예: “하버드 학생이 인턴 못 구했다고 고백했음.\\n수개월 동안 수십 번 떨어졌다고 적었음.\\n결국 여름 인턴 하나 겨우 붙었다고 했음.”',
      '- 한 post 안에는 3~6개의 짧은 줄을 넣어도 됩니다. 줄은 짧게, 포스트는 흐름 단위로 묶으세요.',
      '- ★ 각 post 첫 줄에 섹션 제목·라벨을 붙이지 마세요. “장면 한 컷 고정”, “포인트만 뽑자”, “왜 지금 바뀌냐”, “추가 신호”, “오늘 기준 바꾸자”, “한 줄 결론”, “결론 한 줄”, “정리”, “요약” 같은 표현이 post 첫 줄에 나오면 실패입니다. 첫 줄부터 바로 장면이나 사실로 시작하세요.',
      '- 포스트 1개는 독자가 한 화면에서 읽는 작은 장면입니다.',
      '- 빈 슬롯이나 약한 근거는 억지로 문장화하지 마세요. 근거가 없으면 건너뛰고 확인된 장면끼리 연결하세요.',
      '- 유보/면책 문장(“더 확인이 필요함”, “공개된 범위만 확인됨”, “각자 체크 필요”)은 글 전체에서 최대 1회. 매 post마다 붙으면 글쓴이도 모른다는 인상만 남습니다.',
      '',
      '═══ 말투 DNA (전 구간 적용) ═══',
      '- 뉴스 기사체, 보고서체, 존댓말 설명체 금지.',
      '- 짧은 행갈이와 단정적인 구어체. 예: “올라왔음.”, “줄 섰음.”, “이유는 따로 있음.”',
      '- 이모지 0개. 감정과 강조는 단어와 문장 구조로만.',
      '- 문장 끝: “했음/나옴/보임/거임/뜻임” 구어체를 섞되 같은 어미 반복 금지. “올라왔다”, “붙어 있었다”, “줄 선 거임”처럼 자연스럽게 섞으세요.',
      '- 명사 종결 금지. “보도.”, “주장.”, “흐름.” → “보도됐음”, “~라고 주장했음”, “~라는 신호임”처럼 ~음/함/임/됨으로 끝냄.',
      '- “그러나/따라서/하지만” 금지. 전환은 “근데”만.',
      '- “끝판왕/역대급/미쳤다/대박” 금지. 솔깃함은 “이 정도면 직접 써볼 만한 수준”처럼 독자 상황에 맞게 구체적으로.',
      '- 강한 문장 뒤엔 13~25자 안팎 짧은 문장으로 즉시 풀어주세요.',
      '- 줄 길이: 짧은 줄(8~15자)과 긴 줄(30~60자)을 자연스럽게 섞기. 인위적으로 자르지 마세요.',
      '- 수치 비교는 줄바꿈으로 나란히. 예: “2024년 12월: 매출 5조\\n2025년 5월: 매출 27조”',
      '- 번호 나열은 한 글에서 최대 한 번, 정보가 실제로 병렬일 때만.',
      '- 나열은 쉼표만. 가운데점(·), 슬래시(/), 화살표(→), 작은따옴표 금지.',
      '- AI가 쓴 것처럼 매끈하게 요약하지 마세요. 사람이 원문을 읽고 짚어주는 호흡으로.',
      '- 모든 문단이 같은 길이·리듬이면 실패. 짧게 끊기, 설명, 질문형 전환을 섞으세요.',
      `- 표현 방향: ${issuePlan.expression_direction || ''}`,
      '',
      '═══ 글 4단 구조 (반드시 이 순서) ═══',
      '',
      '━━ [1] 훅 (Hook) — post 1 ━━',
      '역할: 독자가 가장 체감할 수 있는 비즈니스 함의를 먼저 던진다. 결론의 핵심 한 줄만 노출하는 맛보기 형식.',
      '- 질문형 또는 선언형 모두 가능. 단, 클리셰 금지.',
      '- 예: “당신 업종의 숙련 동작 데이터는 앞으로 팔 수 있는 자산이 된다.”',
      '- 두 가지 훅 방식 중 소재에 맞는 하나를 선택해 한 글 안에서 밀고 가세요:',
      '  · 대상 호출형: “OO 쓰는 사람 한 번 보셈”처럼 독자가 바로 자신을 보는 방식.',
      '    대상은 “작은 사업자/타깃 고객” 같은 직역 분류명 금지. “혼자 광고까지 챙기는 사장님”처럼 행동 묘사로.',
      '  · 사건 장면형: “어제 OO 만든 회사가 SEC에 서류를 냄.”처럼 독자가 장면을 바로 보는 방식.',
      '    post 1 안에 숫자, 주체, 의외성을 짧게 박고 정체는 조금 늦게 풀어도 됨.',
      '- 첫 post는 독자가 머릿속에 장면을 그릴 수 있어야 함. “AI로 최적화한다”처럼 감이 없으면 실패.',
      '- ★ 사건의 주인공이 따로 있으면(특정 인물/회사 이야기) 작성자 본인 경험처럼 1인칭으로 위장하지 마세요. “내 일을 AI가 먹기 시작했음”처럼 시작했다가 다음 post에서 남 이야기로 바뀌면 독자가 낚인 기분이 듭니다. 그 사람의 장면으로 바로 시작하세요.',
      '- 끝에는 다음 post를 당기는 짧은 전환. 예: “그래서 뭐가 문제냐?”, “이게 핵심인 이유.”, “여기부터 문제가 커짐.”',
      `콘텐츠 플랜 — 훅 방향: ${issuePlan.audience_callout || ''}`,
      `콘텐츠 플랜 — 멈추게 하는 첫 장면: ${slotMap.strange_scene || ''}`,
      `콘텐츠 플랜 — 독자 시작 감정: ${psychologicalArc.reader_start_emotion || ''}`,
      `콘텐츠 플랜 — 독자 첫 질문: ${psychologicalArc.reader_first_question || ''}`,
      '',
      '━━ [2] WHAT — posts 2~3 ━━',
      '역할: 기사에서 실제로 일어나고 있는 일을 압축해서 전달. 숫자와 구체적 사실 포함 우선.',
      '- “~라고 한다” 식의 뉴스 요약 말투 금지. 단언하듯 서술.',
      '- 이름, 날짜, 숫자, 장소, 직접 발언으로 “진짜네”를 만들어야 함.',
      '- 규제기관/소송/합의 기사에서는 “확정됨” 금지. “FTC 주장 기준”, “혐의 합의”, “제재 절차”처럼 법적 상태 유지.',
      '- 영문 원문이 있으면 원문 일부를 그대로 써도 됨. 이후 한국 관점 해석 이어져야 함.',
      '- ★ 숫자/인용이 콘텐츠 플랜과 evidence에 없으면 그 자리를 “얼마인지는 공개된 범위만 확인됨” 같은 유보 문장으로 채우지 마세요. 그 디테일은 통째로 생략하고 확인된 사실로 문장을 만드세요.',
      '- ★ 기사 자체의 메타데이터(언제 공개됐는지, 인터뷰 형식인지, 1인칭 에세이인지)를 서술하지 마세요. 독자는 기사의 형식이 아니라 내용이 궁금합니다. 그 자리에 인물이 실제로 한 말이나 행동을 쓰세요.',
      `콘텐츠 플랜 — 이슈 요약: ${issuePlan.issue_summary || ''}`,
      `콘텐츠 플랜 — 숫자: ${(slotMap.hard_numbers || []).join(', ')}`,
      `콘텐츠 플랜 — 고유명사: ${(slotMap.named_entities || []).join(', ')}`,
      `콘텐츠 플랜 — 직접 인용: ${(slotMap.direct_quotes || []).join(' / ')}`,
      `콘텐츠 플랜 — 동시에 움직인 플레이어: ${(slotMap.coordinated_players || []).join(', ')}`,
      `콘텐츠 플랜 — 신뢰를 만드는 디테일: ${psychologicalArc.credibility_hook || ''}`,
      '',
      '━━ [3] WHY — posts 4~5 ━━',
      '역할: 왜 이 일이 지금 벌어지고 있는지 구조적 원인 설명. 표면적 이유가 아니라 산업/기술/경제 구조의 변화로 연결.',
      '- 독자가 “아, 그래서 그랬구나” 하고 납득할 수 있어야 함.',
      '- “이게 한 번짜리가 아니네”를 보여주는 추가 사례나 비슷한 흐름을 포함.',
      '- 후반에는 기능 설명이 아니라 돈, 권한, 데이터, 역할, 선택권 중 무엇이 어디로 이동하는지를 보여주세요.',
      '- 전환 예: “근데 여기서 반전.”, “근데 진짜 중요한 건 여기부터임.”, “이게 단순 기능 업데이트가 아닌 이유가 있음.”',
      `콘텐츠 플랜 — 핵심 반전: ${issuePlan.key_reversal || ''}`,
      `콘텐츠 플랜 — 오래된 질서: ${slotMap.old_order || ''}`,
      `콘텐츠 플랜 — 새 신호: ${slotMap.new_signal || ''}`,
      `콘텐츠 플랜 — 이번엔 다른 이유: ${slotMap.why_now_changed || ''}`,
      `콘텐츠 플랜 — 과거 실패/역사: ${slotMap.past_failure_or_history || ''}`,
      `콘텐츠 플랜 — 불확실성/반론: ${slotMap.counter_signal_or_uncertainty || ''}`,
      `콘텐츠 플랜 — 호기심 사다리: ${(psychologicalArc.curiosity_ladder || []).join(', ')}`,
      `콘텐츠 플랜 — 단발 사건이 아닌 이유: ${psychologicalArc.pattern_shift || ''}`,
      `콘텐츠 플랜 — 구조적 의미: ${psychologicalArc.structural_meaning || ''}`,
      `콘텐츠 플랜 — 더 필요한 근거: ${(psychologicalArc.proof_needed || []).join(', ')}`,
      '',
      '━━ [4] SO WHAT — posts 6~7 ━━',
      '역할: 소기업 오너/창업자가 지금 당장 어떻게 반응해야 하는지. 경고, 기회, 행동 중 하나의 톤으로 마무리.',
      '- [1] 훅에서 던진 비즈니스 함의를 여기서 구체적으로 완성.',
      '- 교육형 과제처럼 닫지 말고, 독자가 “앞으로 더 커지겠네”라고 느끼는 문장으로 닫으세요.',
      '- 전문가 발언/팁 이슈라면: 강한 첫 말, 진짜 질문, 대부분의 오해, 핵심 논리, 일상 장면, 오늘 할 행동 순으로.',
      '- 독자를 직업명 대신 심리 상태로 잡아도 됨. 예: “머릿속엔 많은데 말로 못 꺼내는 사람”.',
      `콘텐츠 플랜 — 왜 중요한가: ${issuePlan.why_it_matters || ''}`,
      `콘텐츠 플랜 — 독자 결론: ${issuePlan.reader_takeaway || contentPlan.promised_takeaway || ''}`,
      `콘텐츠 플랜 — 독자 결정: ${slotMap.reader_decision || ''}`,
      `콘텐츠 플랜 — 닫는 프레임: ${slotMap.closing_frame || ''}`,
      `콘텐츠 플랜 — 마지막에 남길 깨달음: ${psychologicalArc.reader_end_realization || ''}`,
      '',
      '═══ post 간 연결 규칙 ═══',
      '- 각 post를 쓰기 전에 바로 앞 post와 이어지는지 점검. “이 이슈”, “그 문제”처럼 지시어만 던지면 실패.',
      '- 각 문장은 앞 문장의 구체 대상을 이어받아야 함.',
      '- 글의 구조를 독자에게 설명하는 메타 문장 금지. “장면 하나 고정하자.”, “정리부터 하자.” → 바로 그 장면을 쓰세요.',
      '- 추상 비유 금지. “축이 옮겨감”, “판이 바뀜” → 누가 무엇을 했는지 구체 명사로.',
      '- 각 post 끝에는 다음을 읽게 만드는 미해결감을 남기세요. “이유는 따로 있음.” / “근데 여기서 하나 더 있음.”',
      '- 라벨형/문장형/질문형 전환을 번갈아 쓰세요. 같은 라벨 반복 금지.',
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
      '- 마지막 post는 반드시 세 요소를 포함하세요: 한 줄 결론, 출처 표기, 그리고 1차 출처 링크.',
      '- 출처 표기는 먼저 매체명/도메인명으로 짧게 씁니다. 예: “출처: FTC, Reuters.”',
      '- ★ 1차 출처 링크 1개는 반드시 마지막 post 맨 끝에 그대로 노출하세요. source_links 필드에만 넣고 본문에서 빼면 실패입니다. <source_links> 의 첫 번째 항목이 1차 출처이므로 그 URL을 하단에 박고, 같은 URL을 source_links 필드에도 넣습니다.',
      '- ★ URL 정확 복사 절대 규칙: <source_links> 에 표시된 URL 만 그대로 복사하세요. 임의 작성·축약·재조합·기억으로 추측 금지. 매체명(라벨) 이 다르면 URL 도 그 매체의 <source_links> 안 URL 과 정확히 일치해야 합니다. 같은 URL 을 다른 매체명으로 라벨링해 반복하지 마세요(흔한 환각 패턴). 다른 매체의 URL 이 <source_links> 에 없으면 그 매체는 출처로 쓰지 말고 빼세요.',
      '- ★ source_links 필드(JSON 출력) 의 url 값도 위 절대 규칙을 따릅니다. 본문 마지막의 URL 과 source_links 필드의 url 은 모두 <source_links> 원본 그대로여야 합니다.',
      '- 팔로우 CTA나 다음 발행 예고는 사용자가 명시적으로 요청한 경우에만 씁니다.',
      '- CTA가 필요해도 후속 주제를 임의로 약속하지 마세요. 허용되는 수준은 “필요하면 저장해두면 됨.” 정도입니다.',
      '- 출처가 하나도 없으면 “출처 확인 필요”라고 쓰지 말고, 초안 risk에 출처 부족을 적으세요.',
      '- ★ <source_links>가 "출처 URL 없음"이면 본문에 URL을 아예 넣지 마세요. 매체명만 쓰고 risk에 "1차 출처 URL 누락"을 적으세요. businessinsider.com 같은 도메인 홈페이지 주소를 만들어 넣으면 실패입니다.',
      '',
      '<content_plan>',
      JSON.stringify(contentPlan, null, 2),
      '</content_plan>',
      '',
      '<evidence_snapshot>',
      evidenceText,
      '</evidence_snapshot>',
      '',
      ...(sourceArticleText && evidenceSnapshot.length === 0 ? [
        '<source_article>',
        '아래 기사 원문에서 사실·수치·인용을 직접 참조하세요. 원문에 없는 내용은 만들지 마세요.',
        sourceArticleText.slice(0, 8000),
        '</source_article>',
        '',
      ] : []),
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
    '- ★ URL 정확 복사 절대 규칙: <source_links> 에 표시된 URL 만 그대로 복사. 임의 작성·축약·재조합·기억으로 추측 금지. 매체명(라벨) 이 다르면 URL 도 그 매체의 <source_links> 안 URL 과 정확히 일치해야 함. 같은 URL 을 다른 매체명으로 라벨링해 반복하지 마세요(흔한 환각 패턴). 다른 매체의 URL 이 <source_links> 에 없으면 그 매체는 출처에서 빼세요. source_links 필드(JSON 출력)의 url 값도 동일하게 적용.',
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
    const sourceArticleText = typeof body.sourceArticleText === 'string' ? body.sourceArticleText.slice(0, 12000) : null;

    if (!contentPlan.content_angle && !contentPlan.planning_title) {
      return NextResponse.json({ error: 'contentPlan이 필요합니다.' }, { status: 400 });
    }

    const referenceContext = buildReferenceContext({ contentPlan, evidenceSnapshot });
    const prompt = buildWriterPrompt({ contentPlan, evidenceSnapshot, referenceContext, sourceArticleText });
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
