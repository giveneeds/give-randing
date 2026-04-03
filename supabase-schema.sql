-- =============================================
-- GIVENEEDS 통합 마케팅 플랫폼 - 마스터 스키마 (최종 병합본)
-- =============================================

-- 기존 테이블이 있다면 삭제하고 새로 생성 (최종 구조 반영 위함)
DROP TABLE IF EXISTS landing_settings CASCADE;
DROP TABLE IF EXISTS landing_sections CASCADE;

-- 1. 랜딩 페이지 글로벌 설정 (Brand, SEO, Navbar, Footer)
CREATE TABLE IF NOT EXISTS landing_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    brand JSONB DEFAULT '{"name": "GIVENEEDS", "tagline": "Strategic Marketing Partner"}',
    cta_global JSONB DEFAULT '{"kakao_url": "", "phone": ""}',
    seo JSONB DEFAULT '{"title": "GIVENEEDS", "description": "마케팅 파트너"}',
    navbar JSONB DEFAULT '{"links": [], "show_cta": true}',
    footer JSONB DEFAULT '{"copyright": "© 2025 GIVENEEDS", "social_links": []}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- 2. 매거진 아티클 (Magazine B 스타일 에디토리얼)
CREATE TABLE IF NOT EXISTS magazines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'INSIGHT',
    thumbnail_url TEXT,
    content_html TEXT,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published', -- 추가: draft, pending, published
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 캠페인 랜딩 페이지 (LP 빌더용)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published', -- 추가: draft, pending, published
    hero_type TEXT DEFAULT 'A', -- A: Particle Text, B: Lead Magnet
    hero_content JSONB DEFAULT '{}',
    seo_config JSONB DEFAULT '{}',
    tracking_scripts JSONB DEFAULT '{"pixel_id": "", "ga_id": ""}',
    selected_sections JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 글로벌 재사용 섹션 (서비스, 가격, FAQ 등)
CREATE TABLE IF NOT EXISTS global_sections (
    id TEXT PRIMARY KEY, -- 고유 ID (ex: sec-hero, sec-services)
    type TEXT NOT NULL,  -- 섹션 타입 (ex: hero, services, faq)
    title TEXT,
    subtitle TEXT,
    content JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 고객 리드 데이터 (수집된 DB)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT,
    email TEXT,
    phone TEXT,
    category TEXT, -- 추가: 리드 분류 (상담, 가이드북, 일반 등)
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI 챗봇 메시지 기록
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI 코칭 로그 (신설: Human-in-the-Loop용)
CREATE TABLE IF NOT EXISTS ai_coaching_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL, -- magazine, campaign
    target_id UUID NOT NULL,
    theory_name TEXT, -- 인용된 마케팅 이론명
    suggestion TEXT NOT NULL, -- AI의 제안 내용
    rationale TEXT, -- 학문적/데이터 근거
    is_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- [보안 설정 및 인덱스]
-- =============================================
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read - settings" ON landing_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read - magazines" ON magazines FOR SELECT USING (true);
CREATE POLICY "Allow public read - campaigns" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Allow public read - global_sections" ON global_sections FOR SELECT USING (true);
CREATE POLICY "Allow public write - leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read/write - chat" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow public read - ai_logs" ON ai_coaching_logs FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_magazines_slug ON magazines (slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages (session_id);

-- =============================================
-- [초기 데이터 삽입]
-- =============================================
INSERT INTO landing_settings (id, brand, navbar)
VALUES (1, '{"name": "GIVENEEDS", "tagline": "Strategic Marketing Partner"}', '{"links": [{"label": "매거진", "url": "/magazine"}, {"label": "회사소개", "url": "/#hero"}, {"label": "서비스", "url": "/service"}, {"label": "문의하기", "url": "/#cta"}], "show_cta": true}')
ON CONFLICT (id) DO NOTHING;

-- 7대 핵심 카테고리 데이터 (초기화)
INSERT INTO global_sections (id, type, title, subtitle, content, is_active)
VALUES (
  'sec-product-detail', 
  'product_detail', 
  'OUR SOLUTION', 
  '기브니즈만의 압도적인 마케팅 솔루션', 
  '{
    "items": [
      { "id": "v1", "title": "Viral Marketing", "desc": "입소문이 아닌 전략적인 데이터 기반의 확산", "detail_title": "#1. Viral", "detail_desc": "카페 바이럴, 블로그 마케팅, 언론보도 송출", "detail_sub": "단순 배포가 아닌 상위 노출과 고관여 타겟의 유입을 목적으로 하는 전략적 입소문 시스템.", "icon": "MessageSquare", "slug": "viral", "color": "#ec4899" },
      { "id": "r1", "title": "Review Management", "desc": "고객의 첫인상을 결정짓는 신뢰의 척도", "detail_title": "#2. Review", "detail_desc": "네이버 플레이스/스토어 리뷰, 구글 리뷰, 카카오맵 리뷰", "detail_sub": "부정적 여론 방어와 진정성 있는 리뷰 축적을 통해 전환율을 최대화합니다.", "icon": "Star", "slug": "review", "color": "#f59e0b" },
      { "id": "a1", "title": "AI Automation", "desc": "초격차 기술력으로 만드는 무한한 성과의 자동화", "detail_title": "#3. AI Solution", "detail_desc": "AI 기반 브랜드 블로그, 스레드, 인스타 콘텐츠 자동 생성", "detail_sub": "단 5분 만에 기브니즈 AI로 내 비즈니스 맞춤형 전략을 알아보고 수립하세요.", "icon": "Cpu", "slug": "ai-automation", "color": "#8b5cf6" },
      { "id": "s1", "title": "SNS Growth", "desc": "팬덤을 형성하는 브랜드 계정의 압도적 성장", "detail_title": "#4. SNS", "detail_desc": "중/일 글로벌 체험단 및 소셜 성장 패키지", "detail_sub": "단순 팔로워 증대를 넘어 진성 소통과 강력한 브랜드 인지도를 구축합니다.", "icon": "Instagram", "slug": "sns-growth", "color": "#3b82f6" },
      { "id": "l1", "title": "Local SEO", "desc": "지역 기반 매출의 핵심 거점을 선점하는 기술", "detail_title": "#5. Local Marketing", "detail_desc": "스토어/플레이스/070서비스 최적화 및 카카오맵 노출", "detail_sub": "검색 인텐트 분석을 통해 거점 지역 내 최상단 노출을 실현합니다.", "icon": "MapPin", "slug": "local-seo", "color": "#10b981" },
      { "id": "p1", "title": "Creative Production", "desc": "고객의 마음을 훔치는 감각적인 시각 디자인", "detail_title": "#6. Website & Production", "detail_desc": "프리미엄 웹사이트 제작 및 UX/UI 설계", "detail_sub": "비즈니스의 본질을 담은 심미적이고 기능적인 웹사이트로 고객 신뢰를 구축합니다.", "icon": "Layout", "slug": "production", "color": "#6b7280" },
      { "id": "c1", "title": "CPC Advertising", "desc": "유의미한 클릭을 구매로 바꾸는 정교한 퍼포먼스", "detail_title": "#7. CPC", "detail_desc": "파워링크, 메타(Meta) 광고 매체 운영", "detail_sub": "클릭당 비용 중심의 검색/디스플레이 광고를 분석하여 최적의 수익률을 달성합니다.", "icon": "Target", "slug": "cpc", "color": "#ef4444" }
    ]
  }', 
  true
) ON CONFLICT (id) DO NOTHING;
