-- ============================================================
-- FIX: case_studies 저장/발행 오류 해결
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행
-- 안전: 정책만 추가. 기존 데이터 영향 없음.
-- ============================================================
--
-- 문제: case_studies 테이블에 RLS 활성화 + SELECT 정책만 있어
--       어드민 에디터에서 INSERT/UPDATE/DELETE 시도 시 차단됨.
-- 해결: services 테이블과 동일하게 쓰기 허용 정책 추가.
-- ============================================================

-- 기존 정책이 있으면 제거 후 재생성 (멱등 실행 가능)
DROP POLICY IF EXISTS "Allow all writes - case_studies" ON case_studies;

CREATE POLICY "Allow all writes - case_studies"
    ON case_studies
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 확인 쿼리 (실행 후 결과 확인용 — 선택)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'case_studies';
