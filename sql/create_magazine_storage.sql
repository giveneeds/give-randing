-- ============================================================
-- Magazine Images Storage Bucket
-- 안전: 신규 버킷만 생성. 기존 데이터 영향 없음.
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- ============================================================

-- 1) 버킷 생성 (이미 있으면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazine-images', 'magazine-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2) 공개 읽기 정책
DROP POLICY IF EXISTS "Public read magazine-images" ON storage.objects;
CREATE POLICY "Public read magazine-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'magazine-images');

-- 3) 업로드는 service_role 만 (서버 API 라우트에서만 호출)
DROP POLICY IF EXISTS "Service role write magazine-images" ON storage.objects;
CREATE POLICY "Service role write magazine-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'magazine-images' AND auth.role() = 'service_role');
