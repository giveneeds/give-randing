// 챗봇 단계머신 정의.
// 각 step은 { id, prompt, choices?, inputType }로 구성되며,
// AI가 JSON으로 nextStep을 반환할 수도 있고 클라이언트가 로컬 전환을 할 수도 있다.

export const STEPS = {
  GREET: 'greet',
  MAIN_CONCERN: 'mainConcern',
  SUB_DETAIL: 'subDetail',
  INDUSTRY: 'industry',
  STRENGTH: 'strength',
  RECOMMENDATION: 'recommendation',
  FREE_CHAT: 'freeChat',
};

export const MAIN_CONCERN_CHOICES = [
  { label: '매출이 떨어지고 있어요', value: 'revenue' },
  { label: '신규 고객 유입이 부족해요', value: 'acquisition' },
  { label: '원인 불명확', value: 'unclear' },
  { label: '기타', value: 'etc' },
];

// 메인 고민에 따른 2단계 선택지
export const SUB_DETAIL_CHOICES = {
  revenue: [
    { label: '객단가가 낮아요', value: 'aov' },
    { label: '재구매/재방문이 적어요', value: 'retention' },
    { label: '트래픽은 있는데 전환이 안 돼요', value: 'conversion' },
    { label: '트래픽 자체가 줄었어요', value: 'traffic_drop' },
  ],
  acquisition: [
    { label: '광고 효율이 떨어져요', value: 'ads_efficiency' },
    { label: '검색 노출이 안 돼요', value: 'seo' },
    { label: 'SNS 확산이 안 돼요', value: 'sns' },
    { label: '오프라인 유입이 줄었어요', value: 'offline' },
  ],
  unclear: [
    { label: '매출·유입 모두 정체예요', value: 'stagnant' },
    { label: '경쟁사 대비 밀리는 느낌', value: 'competitor' },
    { label: '어디부터 손대야 할지 모르겠어요', value: 'where_to_start' },
    { label: '전략 전반 재점검이 필요해요', value: 'full_audit' },
  ],
  etc: [
    { label: '브랜딩/포지셔닝', value: 'branding' },
    { label: '콘텐츠 기획', value: 'content' },
    { label: '자동화/툴 도입', value: 'automation' },
    { label: '기타 직접 입력', value: 'free' },
  ],
};

export const INITIAL_GREETING =
  '안녕하세요, 기브니즈 AI 전략 센터입니다. 먼저 한 가지만 여쭤볼게요 — 지금 가장 큰 마케팅 고민이 어떤 쪽인가요?';

export const STEP_PROMPTS = {
  [STEPS.MAIN_CONCERN]:
    '지금 가장 큰 마케팅 고민이 어떤 쪽인가요? 아래에서 가장 가까운 것을 골라 주세요.',
  [STEPS.SUB_DETAIL]:
    '조금 더 구체적으로 말씀해 주시면 더 정확한 답을 드릴 수 있어요.',
  [STEPS.INDUSTRY]:
    '어떤 업종/분야를 운영하고 계신가요? 예: 외식, 뷰티, 이커머스, 병의원, 법무법인, 교육, 헬스케어 등 — 자유롭게 입력해 주세요.',
  [STEPS.STRENGTH]:
    '현재 사업의 강점을 한두 가지만 알려 주세요. (예: "고정 단골이 꾸준함", "SNS 팔로워 1만", "시술 후기 만족도가 높음" 등)',
};

// 클라이언트 단계 전환 로직 (AI가 nextStep을 주지 않을 때 폴백)
export function nextLocalStep(current, answers) {
  switch (current) {
    case STEPS.GREET:
      return STEPS.MAIN_CONCERN;
    case STEPS.MAIN_CONCERN:
      return STEPS.SUB_DETAIL;
    case STEPS.SUB_DETAIL:
      return STEPS.INDUSTRY;
    case STEPS.INDUSTRY:
      return STEPS.STRENGTH;
    case STEPS.STRENGTH:
      return STEPS.RECOMMENDATION;
    case STEPS.RECOMMENDATION:
      return STEPS.FREE_CHAT;
    default:
      return STEPS.FREE_CHAT;
  }
}

export function getChoicesForStep(step, answers = {}) {
  if (step === STEPS.MAIN_CONCERN) return MAIN_CONCERN_CHOICES;
  if (step === STEPS.SUB_DETAIL) {
    const concern = answers.mainConcern;
    return SUB_DETAIL_CHOICES[concern] || [];
  }
  return [];
}
