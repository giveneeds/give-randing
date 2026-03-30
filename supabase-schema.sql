-- =============================================
-- 기브니즈 랜딩 페이지 - Supabase DB 스키마
-- =============================================
-- Supabase SQL Editor에서 실행하세요

-- 1. 섹션 테이블
CREATE TABLE IF NOT EXISTS landing_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  content JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 설정 테이블
CREATE TABLE IF NOT EXISTS landing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 기본 설정 데이터 삽입
INSERT INTO landing_settings (key, value) VALUES
  ('brand', '{"name": "기브니즈", "logo_url": "", "primary_color": "#6366f1", "accent_color": "#a78bfa", "tagline": "마케팅의 새로운 기준"}'),
  ('cta_global', '{"kakao_url": "", "phone": "", "external_url": ""}'),
  ('seo', '{"title": "기브니즈 | 마케팅 대행사", "description": "브랜드 성장을 위한 전략적 마케팅 파트너, 기브니즈", "og_image": ""}'),
  ('navbar', '{"links": [], "show_cta": true}'),
  ('footer', '{"copyright": "© 2025 기브니즈. All rights reserved.", "social_links": []}')
ON CONFLICT (key) DO NOTHING;

-- 4. RLS (Row Level Security) 정책
-- 공개 읽기 (랜딩 페이지에서 데이터 읽기)
ALTER TABLE landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (공개 페이지용)
CREATE POLICY "Allow public read for sections" ON landing_sections
  FOR SELECT USING (true);

CREATE POLICY "Allow public read for settings" ON landing_settings
  FOR SELECT USING (true);

-- anon 키로 쓰기도 허용 (관리자 비밀번호 인증은 앱 레벨에서 처리)
CREATE POLICY "Allow anon insert for sections" ON landing_sections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update for sections" ON landing_sections
  FOR UPDATE USING (true);

CREATE POLICY "Allow anon delete for sections" ON landing_sections
  FOR DELETE USING (true);

CREATE POLICY "Allow anon upsert for settings" ON landing_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update for settings" ON landing_settings
  FOR UPDATE USING (true);

-- 5. 인덱스
CREATE INDEX IF NOT EXISTS idx_sections_order ON landing_sections (order_index);
CREATE INDEX IF NOT EXISTS idx_sections_active ON landing_sections (is_active);
CREATE INDEX IF NOT EXISTS idx_settings_key ON landing_settings (key);
