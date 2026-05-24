-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: leads.lead_data jsonb 컬럼 추가
--
-- 목적:
--   캠페인 LP 빌더에서 사용자 정의 폼 필드(회사명·예산·업종 등)를 추가했을 때
--   해당 값들을 보존할 자유형 jsonb 저장소가 필요.
--   기존 정형 컬럼(name/phone/email)은 그대로 유지하고, 그 외 동적 필드만 흡수.
--
-- 안전성:
--   - ADD COLUMN IF NOT EXISTS  → 재실행 안전
--   - DEFAULT '{}'::jsonb       → 기존 행은 빈 객체로 자동 채워짐 (insert 영향 0)
--   - NOT NULL 강제 X            → 매거진 leads 등 lead_data 미전송 호출도 OK
--
-- 사전검사(권장):
--   SELECT count(*) FROM leads;
--   SELECT count(*) FROM leads WHERE lead_data IS NULL;  -- 적용 후엔 0
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_data JSONB DEFAULT '{}'::jsonb;

-- PostgREST 스키마 캐시 즉시 갱신
NOTIFY pgrst, 'reload schema';

-- 사후검증
-- SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'leads' AND column_name = 'lead_data';
