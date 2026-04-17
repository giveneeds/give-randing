-- ============================================================
-- GIVENEEDS CRM: 방문자 신원 추적 컬럼 추가
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- 안전: ADD COLUMN IF NOT EXISTS — 기존 데이터 무영향.
-- ============================================================

ALTER TABLE lead_sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE lead_sessions ADD COLUMN IF NOT EXISTS kakao_name TEXT;
ALTER TABLE lead_sessions ADD COLUMN IF NOT EXISTS kakao_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_sessions_user ON lead_sessions (user_id);
