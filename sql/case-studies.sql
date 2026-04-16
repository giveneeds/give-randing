-- ============================================================
-- GIVENEEDS 고객 사례 (Case Studies) 테이블 + 스토리지
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- 안전: 신규 테이블/버킷만 생성. 기존 데이터 영향 없음.
-- ============================================================

-- 1) 테이블 생성
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT,                           -- 고객사명
    category TEXT DEFAULT '',                   -- COMMERCE | BRAND | CAMPAIGN 등 (자유 입력)
    thumbnail_url TEXT,                         -- 리스트 카드 썸네일
    cover_url TEXT,                             -- 상세 페이지 상단 커버 이미지
    excerpt TEXT,                               -- 카드/메타용 요약
    content_html TEXT,                          -- 본문 (MagazineRichEditor 산출)
    services TEXT[] DEFAULT '{}',               -- 제공 서비스 배열
    tags TEXT[] DEFAULT '{}',
    result_summary TEXT,                        -- 성과 요약 (예: "매출 1,500만원 돌파")
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'published',            -- draft | pending | published
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) RLS: 공개 읽기 (magazines 와 동일 정책)
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read - case_studies" ON case_studies;
CREATE POLICY "Allow public read - case_studies"
    ON case_studies FOR SELECT USING (true);

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies (slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_status ON case_studies (status);
CREATE INDEX IF NOT EXISTS idx_case_studies_sort ON case_studies (sort_order DESC, created_at DESC);

-- 4) updated_at 자동 갱신 트리거 (선택)
CREATE OR REPLACE FUNCTION set_case_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_studies_updated_at ON case_studies;
CREATE TRIGGER trg_case_studies_updated_at
    BEFORE UPDATE ON case_studies
    FOR EACH ROW EXECUTE FUNCTION set_case_studies_updated_at();

-- ============================================================
-- Storage Bucket: case-images
-- ============================================================

-- 5) 버킷 생성 (이미 있으면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6) 공개 읽기 정책
DROP POLICY IF EXISTS "Public read case-images" ON storage.objects;
CREATE POLICY "Public read case-images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'case-images');

-- 7) 업로드는 service_role 만
DROP POLICY IF EXISTS "Service role write case-images" ON storage.objects;
CREATE POLICY "Service role write case-images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'case-images' AND auth.role() = 'service_role');
