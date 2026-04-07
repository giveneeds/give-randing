-- 캠페인 에디터 신규 필드 컬럼 추가
-- Supabase Dashboard → SQL Editor 에서 1회 실행

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS show_particle BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_lead_form BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_ai_block BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_magazine_block BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_block_order JSONB DEFAULT '["particle","lead_form"]'::jsonb,
  ADD COLUMN IF NOT EXISTS booster_order JSONB DEFAULT '["ai_block","magazine"]'::jsonb,
  ADD COLUMN IF NOT EXISTS section_overrides JSONB DEFAULT '{}'::jsonb;

-- Supabase 스키마 캐시 재로딩
NOTIFY pgrst, 'reload schema';
