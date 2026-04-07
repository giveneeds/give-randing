// 매거진 카테고리 단일 출처 (DB 값 + 한국어 라벨 + 어드민 가이드 툴팁)
//
// 정책:
// - 새 카테고리는 4개: ATTRACT / REVENUE / CASE / TREND
// - 어드민에서 카테고리를 비워두면 → "모든 글" 뷰 상단에 랜덤 노출
// - 기존 DB의 INSIGHT/STRATEGY/ANALYSIS/CASE STUDY 등 구 값은 어떤 필터에도 잡히지 않고
//   "모든 글"에서만 보임 (= 미분류 취급) — DB 마이그레이션 없이 안전하게 전환

export const MAGAZINE_CATEGORIES = [
  {
    value: 'ATTRACT',
    label: '손님 모으기',
    short: '손님 모으기',
    description: '신규 유입을 늘리는 글. 네이버 플레이스 상위노출, SNS/광고 운영, 전단·SEO 등 "0명에서 100명 만들기" 카테고리.',
    examples: [
      '네이버 플레이스 상위노출 7단계 체크리스트',
      '인스타 광고비 30만원으로 첫 손님 100명 받는 법',
      '동네 상권 무료 분석 도구 5가지',
    ],
  },
  {
    value: 'REVENUE',
    label: '매출 올리기',
    short: '매출 올리기',
    description: '이미 오는 손님으로 더 버는 글. 객단가, 재방문, 단골 관리, 메뉴 구성, 업셀, 리뷰 관리 등.',
    examples: [
      '객단가 20% 올리는 메뉴 배치 원칙',
      '단골 만드는 카카오톡 알림톡 템플릿 10개',
      '리뷰 100개 모으는 법 — 구걸하지 않고',
    ],
  },
  {
    value: 'CASE',
    label: '사례 분석',
    short: '사례 분석',
    description: '실제 자영업자/브랜드 케이스. 비포·애프터, 광고비 대비 매출, 실패 사례 분석. 숫자가 들어가면 좋음.',
    examples: [
      '강남 5평 카페 — 광고비 50만원으로 매출 2배 만든 6주',
      '폐업 직전이던 분식집이 배달앱 1위가 된 이유',
      '인스타 팔로워 0 → 1만, 18개월 기록',
    ],
  },
  {
    value: 'TREND',
    label: '트렌드',
    short: '트렌드',
    description: '짧고 빠른 뉴스성 글. 새로 생긴 광고 정책, 플랫폼 업데이트, 시즌 키워드, 데이터 리포트.',
    examples: [
      '2026년 네이버 플레이스 알고리즘 변경 정리',
      '배달앱 수수료 인상 — 사장님이 지금 해야 할 3가지',
      '여름 시즌 자영업자 검색 키워드 TOP 20',
    ],
  },
];

// "모든 글" 가상 카테고리 — value는 빈 문자열로 통일 (활성/미선택 상태)
export const ALL_CATEGORY = {
  value: '',
  label: '모든 글',
  short: '모든 글',
};

// 어드민 카테고리 드롭다운 옵션 (빈 값 + 4개 카테고리)
export const CATEGORY_OPTIONS = [
  { value: '', label: '— 미분류 (모든 글에 랜덤 노출) —' },
  ...MAGAZINE_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
];

// 카테고리 value → 한국어 라벨 변환 (없으면 원문)
export function getCategoryLabel(value) {
  if (!value) return ALL_CATEGORY.label;
  const found = MAGAZINE_CATEGORIES.find(c => c.value === value);
  return found ? found.label : value;
}

// 새 카테고리 시스템 기준 "미분류"인지 (즉 4개 카테고리에 속하지 않는지)
export function isUncategorized(post) {
  if (!post?.category) return true;
  return !MAGAZINE_CATEGORIES.some(c => c.value === post.category);
}

// 오늘 날짜(KST 정오 기준) 시드 — 매일 12:00에 값이 바뀜
function getDailySeed() {
  const now = new Date();
  // KST 기준 정오 이전이면 어제, 이후면 오늘
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const beforeNoon = kstNow.getUTCHours() < 12;
  const seedDate = new Date(kstNow);
  if (beforeNoon) seedDate.setUTCDate(seedDate.getUTCDate() - 1);
  return seedDate.getUTCFullYear() * 10000
    + (seedDate.getUTCMonth() + 1) * 100
    + seedDate.getUTCDate();
}

// 시드 기반 의사난수 (mulberry32)
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 배열을 시드로 셔플 (Fisher-Yates) — 매일 정오에 결과 변경
export function dailySeededShuffle(arr) {
  const rng = mulberry32(getDailySeed());
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "모든 글" 뷰 정렬: 미분류 글 우선 (셔플) → 분류된 글 (created_at desc)
export function sortForAllView(posts) {
  const uncategorized = dailySeededShuffle(posts.filter(isUncategorized));
  const categorized = posts
    .filter(p => !isUncategorized(p))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return [...uncategorized, ...categorized];
}
