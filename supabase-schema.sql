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
-- (생략: 기존과 동일)

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

-- 6. AI 챗봇 메시지 기록 (새로 추가됨)
-- (생략: 기존과 동일)

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
-- (생략: 나머지 테이블 RLS 적용)
ALTER TABLE ai_coaching_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read - ai_logs" ON ai_coaching_logs FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_magazines_slug ON magazines (slug);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages (session_id);

-- =============================================
-- [초기 데이터 삽입]
-- =============================================
INSERT INTO landing_settings (id, brand, cta_global)
VALUES (1, '{"name": "GIVENEEDS", "tagline": "Strategic Marketing Partner"}', '{"kakao_url": "https://pf.kakao.com/", "phone": ""}')
ON CONFLICT (id) DO NOTHING;
