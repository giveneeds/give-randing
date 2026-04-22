-- ============================================================
-- Content Resources Storage Bucket (Phase A)
-- 매거진/LP 공용 파일 저장소. Private + 서명 URL 전용.
-- 안전: 신규 버킷만 생성. 기존 버킷 영향 없음.
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- ============================================================

-- 1) 버킷 생성 (이미 있으면 무시). public=false 로 서명 URL만 사용.
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-resources', 'content-resources', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2) SELECT / INSERT / UPDATE / DELETE 모두 service_role 만 (공개 SELECT 정책 없음)
DROP POLICY IF EXISTS "Service role all content-resources" ON storage.objects;
CREATE POLICY "Service role all content-resources"
  ON storage.objects FOR ALL
  USING (bucket_id = 'content-resources' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'content-resources' AND auth.role() = 'service_role');

-- 참고: 공개 다운로드는 서버 라우트에서 supabaseAdmin.storage.createSignedUrl() 로 발급.
