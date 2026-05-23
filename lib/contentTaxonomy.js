// 콘텐츠 분류 SSOT — persona, topic cluster, 관련 그룹.
// enrichItem brief 검증·KB 주입·자동 워크플로우 의사결정이 모두 이 정의를 참조한다.

export const VALID_PERSONAS = [
  'restaurant_owner',
  'clinic_owner',
  'brand_operator',
  'marketer',
  'small_brand_owner',
  'general_reader',
  'general',
  'unknown',
];
export const VALID_PERSONAS_SET = new Set(VALID_PERSONAS);

// 페르소나별 허용되는 토픽 클러스터.
export const CLUSTERS_BY_PERSONA = {
  restaurant_owner: ['place_visibility', 'review_trust', 'ad_efficiency', 'menu_offer', 'local_retention'],
  clinic_owner: ['place_visibility', 'review_trust', 'ad_efficiency', 'service_page', 'local_acquisition'],
  brand_operator: [],
  marketer: [],
  small_brand_owner: [],
  general_reader: [],
  general: [],
  unknown: [],
};

// 플레이스/지도/리뷰 신뢰/지역 유입 관련 — 이 클러스터들은 플레이스 마케팅 KB·거버넌스 적용 대상.
export const PLACE_RELATED_CLUSTERS = new Set([
  'place_visibility',
  'review_trust',
  'local_acquisition',
  'local_retention',
]);

export function isPlaceRelatedCluster(cluster) {
  return PLACE_RELATED_CLUSTERS.has(cluster);
}

export function isInjectablePersona(persona) {
  // KB 페르소나 프로필 주입 대상 — unknown 은 정보 부족이라 제외.
  return persona && persona !== 'unknown' && VALID_PERSONAS_SET.has(persona);
}
