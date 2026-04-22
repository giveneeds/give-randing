-- ============================================================
-- Content Resources (Phase A)
-- 매거진/LP 등 콘텐츠에 첨부되는 다운로드 자료 + 수령 로그
-- Phase A 에서는 매거진 UI 만 노출. 스키마는 LP(campaigns) 도 수용.
-- 안전: 신규 테이블만 생성. 기존 데이터 영향 없음.
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- ============================================================
-- 사전 체크:
--   SELECT * FROM content_resources LIMIT 1;  -- 없어야 정상
--   SELECT * FROM resource_downloads LIMIT 1; -- 없어야 정상
-- ============================================================

-- 0) delivery_method enum (Phase B 카카오 발송 대비)
DO $$ BEGIN
  CREATE TYPE resource_delivery_method AS ENUM ('direct', 'kakao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) content_resources: 자료 메타데이터 (매거진/LP 공용)
CREATE TABLE IF NOT EXISTS content_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id UUID REFERENCES magazines(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,               -- storage path (서명 URL 전용)
  file_name TEXT NOT NULL,              -- 다운로드 시 노출되는 원본 파일명
  file_size BIGINT,                     -- bytes
  file_type TEXT,                       -- MIME
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 정확히 한 parent 에만 귀속
  CONSTRAINT content_resources_single_parent CHECK (
    (magazine_id IS NOT NULL AND campaign_id IS NULL) OR
    (magazine_id IS NULL AND campaign_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_content_resources_magazine_sort
  ON content_resources(magazine_id, sort_order) WHERE magazine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_resources_campaign_sort
  ON content_resources(campaign_id, sort_order) WHERE campaign_id IS NOT NULL;

-- 2) resource_downloads: 수령 로그 (parent 정보를 denormalize 로 보관)
CREATE TABLE IF NOT EXISTS resource_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES content_resources(id) ON DELETE CASCADE,
  magazine_id UUID REFERENCES magazines(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_method resource_delivery_method DEFAULT 'direct',
  status TEXT DEFAULT 'completed',      -- completed | pending | failed
  user_email TEXT,                      -- 조회 편의용 스냅샷
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT resource_downloads_single_parent CHECK (
    (magazine_id IS NOT NULL AND campaign_id IS NULL) OR
    (magazine_id IS NULL AND campaign_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_magazine
  ON resource_downloads(magazine_id, created_at DESC) WHERE magazine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_downloads_campaign
  ON resource_downloads(campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_downloads_user
  ON resource_downloads(user_id, created_at DESC);

-- 3) RLS
ALTER TABLE content_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_downloads ENABLE ROW LEVEL SECURITY;

-- content_resources: 익명/로그인 모두 is_enabled=true 만 SELECT 가능
DROP POLICY IF EXISTS "read enabled resources" ON content_resources;
CREATE POLICY "read enabled resources"
  ON content_resources FOR SELECT
  USING (is_enabled = TRUE);

-- content_resources: 쓰기는 service_role 만 (case_studies RLS 함정 회피)
DROP POLICY IF EXISTS "service writes resources" ON content_resources;
CREATE POLICY "service writes resources"
  ON content_resources FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- resource_downloads: 본인 소유 row INSERT 가능
DROP POLICY IF EXISTS "insert own download" ON resource_downloads;
CREATE POLICY "insert own download"
  ON resource_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- resource_downloads: 본인 row 또는 service_role SELECT 가능
DROP POLICY IF EXISTS "read own download" ON resource_downloads;
CREATE POLICY "read own download"
  ON resource_downloads FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- resource_downloads: 관리자 집계/편집은 service_role FOR ALL
DROP POLICY IF EXISTS "service all downloads" ON resource_downloads;
CREATE POLICY "service all downloads"
  ON resource_downloads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 검증 (선택):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('content_resources','resource_downloads');
