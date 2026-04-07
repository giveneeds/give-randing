-- 서비스 테이블 생성 및 초기 데이터 입력 SQL

-- 1. 테이블 생성
DROP TABLE IF EXISTS services;

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('ADS', 'GROWTH', 'LOCAL', 'TECH')),
  color TEXT DEFAULT '#1E4181',
  icon TEXT DEFAULT 'Target',
  
  -- 상세 데이터 (JSONB 구조)
  details JSONB DEFAULT '{
    "effects": [],
    "operation": "",
    "process": [],
    "duration": "",
    "sub_items": [],
    "reference_img": ""
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT TRUE,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 초기 데이터 입력 (사용자 제공 텍스트 기반)

-- [LOCAL] PlaceOptimize
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'place-optimize', 
  'PlaceOptimize', 
  '네이버 플레이스 상위노출 통합 솔루션',
  '네이버의 3단계 로직(적합성→신뢰도→인기도) 전체를 최적화하여 실제 매출로 이어지는 상위 노출을 만들어냅니다.',
  'LOCAL', '#71717A', 'MapPin',
  '{
    "effects": [
      { "title": "매출 직결 상위 노출", "desc": "단순 트래픽이 아닌 전환율 높은 세부 키워드부터 순위 확보" },
      { "title": "알고리즘 최적화", "desc": "네이버 3단계 로직(적합성, 신뢰도, 인기도) 완벽 대응" }
    ],
    "operation": "네이버 봇이 매장의 정체성을 정확히 읽을 수 있도록 N1(적합성/유사도) 점수를 바로잡고, 실제 사용자의 행동 데이터(N2 점수)를 극대화합니다.",
    "process": [
      { "step": "01", "name": "상권 분석", "desc": "경쟁사 키워드 및 상권 분석" },
      { "step": "02", "name": "SEO 세팅", "desc": "정보 재설계 및 SEO 최적화" },
      { "step": "03", "name": "통합 집행", "desc": "리뷰/트래픽 유기적 결합" },
      { "step": "04", "name": "모니터링", "desc": "CTR 및 순위 지속 관리" }
    ],
    "duration": "정보 재설계 3~5일, 안착까지 1~3개월 집중 관리",
    "sub_items": [
      { "title": "SEO 세팅", "desc": "대표 키워드 및 상세설명 최적화" },
      { "title": "플레이스 리뷰", "desc": "영수증/예약자 리뷰를 통한 신뢰도 확보" },
      { "title": "블로그 기자단", "desc": "특정 세부 카테고리 선점을 위한 전략적 도구" },
      { "title": "리워드 트래픽", "desc": "실제 사용자 유입을 통한 인지도 점수 상승" }
    ]
  }'::jsonb,
  10
);

-- [GROWTH] PlaceReview
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'place-review', 
  'PlaceReview', 
  '오프라인 방문을 이끄는 리뷰 관리',
  '단순 수량 채우기가 아닌, 알고리즘과 사람이 신뢰할 수 있는 고품질 리뷰를 생성합니다.',
  'GROWTH', '#16A34A', 'Star',
  '{
    "effects": [
      { "title": "특징 탭 노출", "desc": "키워드 기반 리뷰로 네이버 특징 탭 자동 분류" },
      { "title": "전환율 30% 향상", "desc": "리뷰 내용의 질을 높여 실제 방문 및 문의 유도" }
    ],
    "operation": "자체 인증 영수증 기반의 영수증 리뷰와 실제 예약 기반의 예약자 리뷰를 통해 압도적인 신뢰도를 구축합니다.",
    "process": [
      { "step": "01", "name": "수량 합의", "desc": "진행 수량 및 일정 협의" },
      { "step": "02", "name": "원고 준비", "desc": "핵심 셀링 포인트 기반 가이드 설계" },
      { "step": "03", "name": "순차 배포", "desc": "알고리즘 최적화 일정에 맞춘 발행" },
      { "step": "04", "name": "결과 보고", "desc": "배포 완료 보고 및 A/S" }
    ],
    "duration": "시의성 유지를 위해 월 단위 상시 관리 권장"
  }'::jsonb,
  20
);

-- [ADS] BlogMarketing
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'blog-marketing', 
  'BlogMarketing', 
  '검색 결과 상단을 점유하는 블로그 콘텐츠',
  '최적화 지수의 블로그만을 선별하여 유사 문서 페널티 없이 독보적인 노출을 실현합니다.',
  'ADS', '#1E4181', 'MessageSquare',
  '{
    "effects": [
      { "title": "상단 점유", "desc": "최적화 블로그 계정 활용으로 높은 노출 확률 확보" },
      { "title": "브랜드 신뢰도", "desc": "고품질 원고와 사진 조합으로 긍정적 이미지 구축" }
    ],
    "operation": "유사 문서 페널티 방지를 위해 고유한 사진 조합과 전문 원고 대필 서비스를 제공합니다.",
    "process": [
      { "step": "01", "name": "키워드 선정", "desc": "메인 및 서브 타겟 키워드 확정" },
      { "step": "02", "name": "원고 기획", "desc": "소구 포인트 기반의 전문 원고 작성" },
      { "step": "03", "name": "검수 및 수정", "desc": "원고 초안 검수 및 컨펌" },
      { "step": "04", "name": "순차 발행", "desc": "누락 없이 안전한 순차 배포" }
    ],
    "duration": "기획부터 확정까지 약 1~2주 소요"
  }'::jsonb,
  30
);

-- [GROWTH] ExperienceTeam (global-experience)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'global-experience', 
  'ExperienceTeam', 
  '진짜 방문이 만드는 진짜 후기, 프리미엄 체험단',
  '지역 기반 블로거 중심의 선별적 섭외로 네이버 로컬 알고리즘에 가장 최적화된 데이터를 생성합니다.',
  'GROWTH', '#16A34A', 'Star',
  '{
    "effects": [
      { "title": "로컬 알고리즘 우위", "desc": "지역 활동 블로거 섭외로 도달 범위 극대화" },
      { "title": "신뢰 가득한 후기", "desc": "실제 방문 경험이 담긴 생생한 콘텐츠 생산" }
    ],
    "operation": "전문 플랫폼 협업을 통해 검증된 인플루언서만을 모집하며, 방문 일정부터 발행까지 토탈 관리합니다.",
    "process": [
      { "step": "01", "name": "가이드 구성", "desc": "상품 내역 및 타겟 키워드 설정" },
      { "step": "02", "name": "체험단 모집", "desc": "지역 기반 인플루언서 선별 및 섭외" },
      { "step": "03", "name": "방문 체험", "desc": "매장 직접 방문 및 서비스 이용" },
      { "step": "04", "name": "전량 발행", "desc": "가이드 준수 아티클 배포 완료" }
    ],
    "duration": "모집 2~4주, 체험 후 2주 이내 발행"
  }'::jsonb,
  40
);

-- [GROWTH] StoreReview (store-review)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'store-review', 
  'StoreReview', 
  '구매 결정의 마지막 관문을 여는 실구매 리뷰',
  '실제 구매자의 고품질 텍스트/포토 리뷰를 통해 상세페이지 이탈을 막고 전환율을 즉각적으로 개선합니다.',
  'GROWTH', '#16A34A', 'Star',
  '{
    "effects": [
      { "title": "전환율 2배 개선", "desc": "신뢰도 높은 진성 리뷰로 구매 결정 지원" },
      { "title": "베스트 리뷰 선점", "desc": "매력적인 후기를 상단에 고정하여 노출 효과 증대" }
    ],
    "operation": "단순 수량 채우기가 아닌 실구매자 기반의 구체적이고 진솔한 후기 시나리오를 설계합니다.",
    "process": [
      { "step": "01", "name": "수량 협의", "desc": "필요 리뷰 수량 및 일정 확정" },
      { "step": "02", "name": "가이드 수립", "desc": "소구점 중심의 리뷰 가이드라인 작성" },
      { "step": "03", "name": "순차 구매", "desc": "실제 구매 및 배송 프로세스 진행" },
      { "step": "04", "name": "리뷰 작성", "desc": "배송 완료 후 7일 이내 작성" }
    ],
    "duration": "배송 완료 후 7일 이내 마감"
  }'::jsonb,
  50
);

-- [GROWTH] SNSGrowth (sns-growth)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'sns-growth', 
  'SNSGrowth', 
  '브랜드 소셜 계정 통합 활성화 시스템',
  '인스타그램, 스레드, 브랜드 블로그 등 채널별 특성에 맞춘 페르소나 설계와 충성도 높은 팬덤을 구축합니다.',
  'GROWTH', '#16A34A', 'Star',
  '{
    "effects": [
      { "title": "도달율 최적화", "desc": "숏폼 및 트렌드 활용으로 유기적 도달량 증대" },
      { "title": "브랜드 소셜 파워", "desc": "단순 팔로워 증량을 넘어선 진성 팬덤 형성" }
    ],
    "operation": "타겟 페르소나 기반의 콘텐츠 전략을 수립하고, 다양한 소셜 마케팅 기법을 통해 계정 지수를 안착시킵니다.",
    "process": [
      { "step": "01", "name": "계정 진단", "desc": "현재 계정 상태 및 경쟁사 분석" },
      { "step": "02", "name": "전략 수립", "desc": "페르소나 기반 콘텐츠 방향 설정" },
      { "step": "03", "name": "콘텐츠 발행", "desc": "도달 최적화 게시물 업로드" },
      { "step": "04", "name": "성장 관리", "desc": "지속적인 인터랙션 및 팔로워 유입" }
    ],
    "duration": "최소 1~3개월 집중 육성 권장"
  }'::jsonb,
  60
);

-- [LOCAL] StoreOptimize (store-optimize)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'store-optimize', 
  'StoreOptimize', 
  '스마트스토어·쿠팡 상위노출 통합 솔루션',
  '오픈마켓 검색 로직(적합성→반응도→인기도) 전체를 최적화하여 점유율과 매출을 동시에 확보합니다.',
  'LOCAL', '#71717A', 'Cpu',
  '{
    "effects": [
      { "title": "카테고리 1페이지 점유", "desc": "적합 키워드 선점 및 판매 지수 활성화" },
      { "title": "판매 지수 스케일업", "desc": "리뷰와 트래픽의 유기적 결합으로 순위 급상승" }
    ],
    "operation": "상품명, 태그, 카테고리 속성 등 기초 SEO부터 실구매 데이터 기반의 인기도 점수까지 통합 관리합니다.",
    "process": [
      { "step": "01", "name": "상품 분석", "desc": "경쟁 상품 및 검색량 데이터 분석" },
      { "step": "02", "name": "SEO 베이스", "desc": "상품 정보 및 태그 SEO 재구성" },
      { "step": "03", "name": "통합 관리", "desc": "리뷰 및 인기도 트래픽 집중 집행" },
      { "step": "04", "name": "순위 방어", "desc": "상단 유지 및 지속적인 지수 관리" }
    ],
    "duration": "초기 세팅 3~5일, 1~3개월 집중 관리"
  }'::jsonb,
  70
);

-- [LOCAL] 070Opt.Service (070-service)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  '070-service', 
  '070Opt.Service', 
  '서비스 지역을 전국으로 확장하는 타지역 노출 솔루션',
  '사무실 없이도 원하는 지역에 플레이스를 개통하여 전국 단위의 고객 유입 창구를 개척합니다.',
  'LOCAL', '#71717A', 'MapPin',
  '{
    "effects": [
      { "title": "타겟 지역 선점", "desc": "물리적 공간 제약 없는 전국 플레이스 생성" },
      { "title": "상담 연결률 증대", "desc": "지역 기반 검색 결과 노출로 문의 수 폭증" }
    ],
    "operation": "착신 형태의 070 가상 번호를 활용하며, 네이버 플레이스 가이드에 최적화된 상호명과 등록을 대행합니다.",
    "process": [
      { "step": "01", "name": "번호 개통", "desc": "희망 지역 070 가상 번호 할당" },
      { "step": "02", "name": "정보 설계", "desc": "SEO 최적화 상호명 명명 및 제안" },
      { "step": "03", "name": "플레이스 생성", "desc": "지역별 플레이스 순차 등록 진행" },
      { "step": "04", "name": "자동 연결", "desc": "지점별 고객 응대 채널 활성화" }
    ],
    "duration": "번호 개통 후 플레이스 생성까지 5~10일"
  }'::jsonb,
  80
);

-- [LOCAL] KakaoMapExp (kakao-map)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'kakao-map', 
  'KakaoMapExp.', 
  '네이버 너머의 고객까지, 카카오맵 상위노출 솔루션',
  '카카오톡 연동성을 활용하는 폭넓은 유저층을 대상으로 한 로컬 마케팅 사각지대 해소 대안입니다.',
  'LOCAL', '#71717A', 'MapPin',
  '{
    "effects": [
      { "title": "카카오 유저층 공략", "desc": "네이버 방문 외 카카오맵 이용자 선점" },
      { "title": "지역 마케팅 완성", "desc": "리뷰와 트래픽을 통한 카카오맵 순위권 안착" }
    ],
    "operation": "리뷰를 통한 신뢰도와 리워드 트래픽을 통한 인지도를 결합하여 카카오 알고리즘에 대응합니다.",
    "process": [
      { "step": "01", "name": "계정 확인", "desc": "카카오 비즈니스 계정 상태 점검" },
      { "step": "02", "name": "리뷰 전략", "desc": "매장 특장점을 담은 평판 관리" },
      { "step": "03", "name": "인지도 빌딩", "desc": "검색/저장 기반 데이터 확보" },
      { "step": "04", "name": "상위 안착", "desc": "안정적인 노출 순위 유지 관리" }
    ],
    "duration": "안착까지 1~3개월 집중 관리 권장"
  }'::jsonb,
  90
);

-- [TECH] AIAutoPosting (ai-posting)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'ai-posting', 
  'AIAutoPosting', 
  '데이터를 활용한 지능형 콘텐츠 생산 엔진',
  '타겟 키워드 수집부터 발행까지 AI가 수행하는 3단계 자동화 파이프라인으로 디지털 점유율을 폭발시킵니다.',
  'TECH', '#18181B', 'Cpu',
  '{
    "effects": [
      { "title": "일 검색 3시간 절약", "desc": "기획/작성/발행 전 과정의 완전 자동화" },
      { "title": "점유율 복리 성장", "desc": "누적된 양질의 콘텐츠로 검색 점유 면적 확대" }
    ],
    "operation": "브랜드 고유의 톤앤매너를 학습한 AI 모델을 활용하며, 성과 기반의 피드백 루프를 통해 품질을 유지합니다.",
    "process": [
      { "step": "01", "name": "키워드 구축", "desc": "타겟 키워드 DB 및 우선순위 분류" },
      { "step": "02", "name": "모델 튜닝", "desc": "브랜드 톤앤매너 파인튜닝 학습" },
      { "step": "03", "name": "시스템 셋업", "desc": "자동 발행 스케줄러 및 엔진 기동" },
      { "step": "04", "name": "품질 관리", "desc": "지속적인 결과물 모니터링 및 보정" }
    ],
    "duration": "시스템 구축 및 안정화 약 1~2주"
  }'::jsonb,
  100
);

-- [TECH] PremiumWebsite (premium-web)
INSERT INTO services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES (
  'premium-web', 
  'PremiumWebsite', 
  '브랜드의 본질을 담은 독보적인 디지털 경험',
  '단순한 웹사이트를 넘어 설득 흐름에 맞게 설계된 전환 중심의 퍼포먼스 마케팅 채널을 구축합니다.',
  'TECH', '#18181B', 'Layout',
  '{
    "effects": [
      { "title": "브랜드 자산 가치", "desc": "고감도 디자인으로 가격 저항 감소 및 신뢰도 증대" },
      { "title": "전환율 혁신", "desc": "이탈률 감소 및 상담 신청률 70% 이상 증가 사례 보유" }
    ],
    "operation": "Core Web Vitals 성능 최적화와 마케팅 픽셀 완전 연동을 포함한 토탈 웹 프로덕션을 지향합니다.",
    "process": [
      { "step": "01", "name": "전략 설계", "desc": "브랜드 가치 및 전환 동선 와이어프레임" },
      { "step": "02", "name": "UX/UI 디자인", "desc": "모바일 퍼스트 기준 프리미엄 비주얼 작업" },
      { "step": "03", "name": "최적화 개발", "desc": "3초 이내 로딩을 위한 성능 및 SEO 개발" },
      { "step": "04", "name": "마케팅 연동", "desc": "픽셀 및 GA4 연동 등 트래킹 시스템 구축" }
    ],
    "duration": "규모에 따라 4~8주 (랜딩형 4주부터)"
  }'::jsonb,
  110
);

-- 기타 서비스들
INSERT INTO services (slug, title, subtitle, category, color, icon, order_num) 
VALUES 
('cafe-viral', 'Cafe Viral', '전략적 커뮤니티 침투 입소문', 'ADS', '#1E4181', 'MessageSquare', 120),
('press-release', 'Press Release', '공신력 매체 브랜드 신인도 확보', 'ADS', '#1E4181', 'FileText', 130),
('meta-ads', 'Meta Ads', '정교한 타겟팅 압도적 ROAS', 'ADS', '#1E4181', 'Target', 140),
('powerlink', 'Powerlink Opt.', '검색 인텐트 구매 전환 최적화', 'ADS', '#1E4181', 'Target', 150);
