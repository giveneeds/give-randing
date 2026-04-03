-- =============================================
-- GIVENEEDS 통합 마케팅 플랫폼 - 7대 카테고리 동기화 SQL
-- =============================================

-- 1. 기존 글로벌 섹션 청소 (중복 방지)
DELETE FROM global_sections WHERE id IN ('sec-product-detail', 'sec-ai-strategy', 'sec-video', 'sec-stats', 'sec-identity', 'sec-hook');

-- 2. 서비스/상품 7대 카테고리 삽입
INSERT INTO global_sections (id, type, title, subtitle, content, is_active)
VALUES (
  'sec-product-detail', 
  'product_detail', 
  'OUR SOLUTION', 
  '기브니즈만의 압도적인 마케팅 솔루션', 
  '{
    "items": [
      { 
        "id": "v1", 
        "title": "Viral Marketing", 
        "desc": "입소문이 아닌 전략적인 데이터 기반의 확산",
        "detail_title": "#1. Viral",
        "detail_desc": "카페 바이럴, 블로그 마케팅, 언론보도 송출",
        "detail_sub": "단순 배포가 아닌 상위 노출과 고관여 타겟의 유입을 목적으로 하는 전략적 입소문 시스템.",
        "icon": "MessageSquare",
        "slug": "viral",
        "color": "#ec4899"
      },
      { 
        "id": "r1", 
        "title": "Review Management", 
        "desc": "고객의 첫인상을 결정짓는 신뢰의 척도",
        "detail_title": "#2. Review",
        "detail_desc": "네이버 플레이스/스토어 리뷰, 구글 리뷰, 카카오맵 리뷰",
        "detail_sub": "부정적 여론 방어와 진정성 있는 리뷰 축적을 통해 전환율을 최대화합니다.",
        "icon": "Star",
        "slug": "review",
        "color": "#f59e0b"
      },
      { 
        "id": "a1", 
        "title": "AI Automation", 
        "desc": "초격차 기술력으로 만드는 무한한 성과의 자동화",
        "detail_title": "#3. AI Solution",
        "detail_desc": "AI 기반 브랜드 블로그, 스레드, 인스타 콘텐츠 자동 생성",
        "detail_sub": "단 5분 만에 기브니즈 AI로 내 비즈니스 맞춤형 전략을 알아보고 수립하세요.",
        "icon": "Cpu",
        "slug": "ai-automation",
        "color": "#8b5cf6"
      },
      { 
        "id": "s1", 
        "title": "SNS Growth", 
        "desc": "팬덤을 형성하는 브랜드 계정의 압도적 성장",
        "detail_title": "#4. SNS",
        "detail_desc": "중/일 글로벌 체험단 및 소셜 성장 패키지",
        "detail_sub": "단순 팔로워 증대를 넘어 진성 소통과 강력한 브랜드 인지도를 구축합니다.",
        "icon": "Instagram",
        "slug": "sns-growth",
        "color": "#3b82f6"
      },
      { 
        "id": "l1", 
        "title": "Local SEO", 
        "desc": "지역 기반 매출의 핵심 거점을 선점하는 기술",
        "detail_title": "#5. Local Marketing",
        "detail_desc": "스토어/플레이스/070서비스 최적화 및 카카오맵 노출",
        "detail_sub": "검색 인텐트 분석을 통해 거점 지역 내 최상단 노출을 실현합니다.",
        "icon": "MapPin",
        "slug": "local-seo",
        "color": "#10b981"
      },
      { 
        "id": "p1", 
        "title": "Creative Production", 
        "desc": "고객의 마음을 훔치는 감각적인 시각 디자인",
        "detail_title": "#6. Website & Production",
        "detail_desc": "프리미엄 웹사이트 제작 및 UX/UI 설계",
        "detail_sub": "비즈니스의 본질을 담은 심미적이고 기능적인 웹사이트로 고객 신뢰를 구축합니다.",
        "icon": "Layout",
        "slug": "production",
        "color": "#6b7280"
      },
      { 
        "id": "c1", 
        "title": "CPC Advertising", 
        "desc": "유의미한 클릭을 구매로 바꾸는 정교한 퍼포먼스",
        "detail_title": "#7. CPC",
        "detail_desc": "파워링크, 메타(Meta) 광고 매체 운영",
        "detail_sub": "클릭당 비용 중심의 검색/디스플레이 광고를 분석하여 최적의 수익률을 달성합니다.",
        "icon": "Target",
        "slug": "cpc",
        "color": "#ef4444"
      }
    ]
  }', 
  true
);

-- 3. AI 전략 섹션 삽입
INSERT INTO global_sections (id, type, title, subtitle, content, is_active)
VALUES (
  'sec-ai-strategy', 
  'ai_strategy', 
  'AI 전략 가이드', 
  '기브니즈 AI로 5분만에 내 비즈니스 맞춤형 전략 알아보기', 
  '{}', 
  true
);

-- 4. 기타 필수 섹션 활성화 및 업데이트
INSERT INTO global_sections (id, type, title, subtitle, content, is_active)
VALUES 
('sec-video', 'video', '기브니즈 알아보기', '마케팅의 새로운 기준을 제시하는 기브니즈를 영상으로 만나보세요.', '{}', true),
('sec-stats', 'stats', '숫자로 입증된 결과', '기브니즈가 만든 변화', '{"items": [{"label": "함께한 클라이언트", "value": "490+"}, {"label": "재계약율", "value": "92%"}, {"label": "고객 만족도", "value": "98%"}]}', true),
('sec-identity', 'identity', '기브니즈가 누구도 해결하지 못했던 부분을 채워 드리겠습니다.', '', '{"left": {"title": "GIVE", "desc": "건네주다"}, "middle": {"title": "NEEDS", "desc": "원하는 것을"}, "right": {"title": "GIVENEEDS", "desc": "진정 원하는 가치를 전달하는 마케팅"}}', true)
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active, content = EXCLUDED.content;

-- 5. 글로벌 내비게이션 설정 업데이트
UPDATE landing_settings 
SET navbar = '{
  "links": [
    {"label": "매거진", "url": "/magazine"},
    {"label": "회사소개", "url": "/#hero"},
    {"label": "서비스", "url": "/service"},
    {"label": "문의하기", "url": "/#cta"}
  ],
  "show_cta": true
}'
WHERE id = 1;

-- 6. 브랜딩 설정 업데이트
UPDATE landing_settings 
SET brand = '{"name": "GIVENEEDS", "tagline": "Strategic Marketing Partner", "logo_url": "/logo.png", "primary_color": "#a78bfa"}'
WHERE id = 1;
