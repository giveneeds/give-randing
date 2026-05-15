import type { Persona, TopicCluster } from '../types/index.js';

// 페르소나 감지용 시그널 단어. 단순 카운트 비교로 페르소나를 결정한다.
// 두 셋의 카운트 차이가 임계치(아래 PERSONA_DIFF_THRESHOLD) 미만이면 'unknown'.
export const PERSONA_SIGNALS: Record<Exclude<Persona, 'unknown'>, string[]> = {
  restaurant_owner: ['식당', '메뉴', '사장', '카페', '매장', '외식', '창업', '음식점', '맛집', '주방'],
  clinic_owner: ['진료', '시술', '환자', '병원', '의료', '원장', '의사', '내원', '의원', '상담'],
};

export const PERSONA_DIFF_THRESHOLD = 2;

// 페르소나가 사람이 읽기 좋은 한국어 라벨로 보이도록 매핑.
export const PERSONA_LABELS: Record<Persona, string> = {
  restaurant_owner: '요식업 사장님',
  clinic_owner: '병의원 원장님',
  unknown: '소상공인',
};

// 클러스터별 키워드 사전.
// primary는 가중 3, secondary는 가중 1. cluster_phrase는 why_it_matters 템플릿에 들어간다.
export interface ClusterDictionaryEntry {
  persona: Exclude<Persona, 'unknown'>;
  cluster: Exclude<TopicCluster, 'unclassified'>;
  primary: string[];
  secondary: string[];
  cluster_phrase: string;
}

export const CLUSTER_DICTIONARY: ClusterDictionaryEntry[] = [
  // ─── 요식업 ───
  {
    persona: 'restaurant_owner',
    cluster: 'place_visibility',
    primary: ['플레이스', '지도', 'GBP', '영업시간', '카테고리'],
    secondary: ['상권', '사진', '주소', '노출', '검색', '위치'],
    cluster_phrase: '플레이스·지도 노출 개선과 직결되는',
  },
  {
    persona: 'restaurant_owner',
    cluster: 'review_trust',
    primary: ['리뷰', '평점', '후기', '답글'],
    secondary: ['신뢰', '별점', '평가', '경험'],
    cluster_phrase: '리뷰·신뢰 형성에 도움이 되는',
  },
  {
    persona: 'restaurant_owner',
    cluster: 'ad_efficiency',
    primary: ['광고', 'CPC', 'ROAS', '전환', '낭비'],
    secondary: ['예약', '주문', '클릭', '키워드', '쿠폰'],
    cluster_phrase: '광고 효율과 매출 연결에 도움이 되는',
  },
  {
    persona: 'restaurant_owner',
    cluster: 'menu_offer',
    primary: ['메뉴', '대표메뉴', '시그니처', '오퍼'],
    secondary: ['시즌', '마진', '한 줄 설명', '알레르기', '점심', '저녁'],
    cluster_phrase: '메뉴·오퍼 설계와 노출에 도움이 되는',
  },
  {
    persona: 'restaurant_owner',
    cluster: 'local_retention',
    primary: ['단골', '재방문', '동네', '커뮤니티'],
    secondary: ['지역', '쿠폰', '이벤트', '계절', '주민', '주변'],
    cluster_phrase: '지역 기반 콘텐츠·단골 만들기에 도움이 되는',
  },

  // ─── 병의원 ───
  {
    persona: 'clinic_owner',
    cluster: 'place_visibility',
    primary: ['플레이스', '지도', '진료과목', '시술명', '진료시간'],
    secondary: ['주차', '예약버튼', '상담버튼', '사진', '의료진'],
    cluster_phrase: '플레이스·진료 정보 노출 개선에 도움이 되는',
  },
  {
    persona: 'clinic_owner',
    cluster: 'review_trust',
    primary: ['후기', '평점', '리뷰', '환자경험'],
    secondary: ['신뢰', '의료법', '광고규정', '심의', '오버프라미스'],
    cluster_phrase: '리뷰·후기 신뢰 관리에 도움이 되는',
  },
  {
    persona: 'clinic_owner',
    cluster: 'ad_efficiency',
    primary: ['광고', '상담', '내원', '시술전환'],
    secondary: ['리마케팅', '리콜', '메시지', '키워드', '가격경쟁', '예산'],
    cluster_phrase: '광고 낭비 줄이기·전환율 개선에 도움이 되는',
  },
  {
    persona: 'clinic_owner',
    cluster: 'service_page',
    primary: ['시술페이지', '진료페이지', 'FAQ', '랜딩'],
    secondary: ['비용', '주의사항', '도식', '증상', '원인', '리스크'],
    cluster_phrase: '시술·진료 페이지 구조 개선에 도움이 되는',
  },
  {
    persona: 'clinic_owner',
    cluster: 'local_acquisition',
    primary: ['신규환자', '진료권', '지역유입', '상담유입'],
    secondary: ['동네', '지역', '연령', '직업군', '학생', '사무직', '리콜'],
    cluster_phrase: '지역 기반 신규 유입에 도움이 되는',
  },
];

// 분류 점수 임계치 — 이 아래는 unclassified.
export const MIN_CLUSTER_SCORE = 4;

// confidence 산출 공식의 saturating 분모. 값이 클수록 같은 score여도 낮은 confidence.
export const CONFIDENCE_SATURATION = 8;

// why_it_matters 생성을 허용하는 최소 confidence. 미달이면 null.
export const WHY_IT_MATTERS_MIN_CONFIDENCE = 0.4;
