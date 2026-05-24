-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: content_resources 노출 위치 컬럼 추가
--
-- 목적:
--   캠페인 빌더에서 같은 자료를 "폼 제출 후 자료 카드 리스트" 와
--   "페이지 하단 첨부 자료 섹션" 중 어느 위치에 노출할지 자료별로 토글.
--
-- 정책:
--   - 두 컬럼 모두 DEFAULT true → 기존 자료는 두 위치 모두 노출 (라이브 회귀 0)
--   - basic 모드 폼은 display_on_form_submit=true 자료만 토큰 다운로드 허용
--   - 페이지 하단 ResourceDownloads 는 display_on_page_bottom=true 자료만 렌더
--
-- 안전성:
--   - ADD COLUMN IF NOT EXISTS → 재실행 안전
--   - NOT NULL 강제, DEFAULT true → 기존 행 자동 채움, insert 영향 0
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE content_resources
  ADD COLUMN IF NOT EXISTS display_on_form_submit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_on_page_bottom BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';

-- 사후검증
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'content_resources'
--    AND column_name IN ('display_on_form_submit', 'display_on_page_bottom');
-- SELECT count(*) FROM content_resources WHERE display_on_form_submit IS NULL;  -- 적용 후엔 0
