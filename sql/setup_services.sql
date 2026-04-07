-- 1. services 테이블 생성
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL, -- ADS, GROWTH, LOCAL, TECH
    color TEXT DEFAULT '#1E4181',
    icon TEXT DEFAULT 'Target',
    details JSONB DEFAULT '{}'::jsonb, -- 효과, 절차, 세부항목 등 저장
    order_num INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS 설정 (기본적으로 읽기 허용, 수정은 관리자만)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.services;
CREATE POLICY "Allow public read" ON public.services FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.services;
CREATE POLICY "Allow all for authenticated" ON public.services ALL USING (true);

-- 3. 초기 데이터 시딩 (일부 주요 상품 예시)
INSERT INTO public.services (slug, title, subtitle, description, category, color, icon, details, order_num)
VALUES 
('place-optimize', 'PlaceOptimize', '네이버 플레이스 상위노출 통합 솔루션', '네이버 플레이스의 3단계 로직을 최적화하여 실제 매출로 이어지는 상위 노출을 만듭니다.', 'ADS', '#1E4181', 'MapPin', '{
  "effects": [
    {"title": "구매 전환율 최적화", "desc": "세부 키워드 선점을 통한 실제 방문 연결"},
    {"title": "알고리즘 최적화", "desc": "적합성, 신뢰도, 인기도 지표 개선"}
  ],
  "operation": "정밀한 키워드 맵 분석을 통해 실질적인 고객 유입이 발생하는 지점을 공략합니다.",
  "process": [
    {"step": "01", "name": "진단", "desc": "현재 순위 및 경쟁사 분석"},
    {"step": "02", "name": "최적화", "desc": "플레이스 정보 및 이미지 고도화"},
    {"step": "03", "name": "모니터링", "desc": "순위 변화 추적 및 로직 대응"}
  ],
  "sub_items": [
    {"title": "검색 결과 점유", "desc": "원하는 키워드에서 브랜드 가시성 확보"},
    {"title": "스마트콜 관리", "desc": "전화 연결 및 예약 전환율 트래킹"}
  ]
}'::jsonb, 0),
('ai-posting', 'AI Posting', '초정밀 AI 자동 포스팅 시스템', '기브니즈만의 마스터 블록 라이브러리를 활용한 고품질 콘텐츠 생성 기술.', 'TECH', '#1E4181', 'Cpu', '{
  "effects": [
    {"title": "생산성 극대화", "desc": "인간의 한계를 넘는 고품질 포스팅 대량 발행"},
    {"title": "논리적 구조화", "desc": "마스터 블록 기반의 탄탄한 정보 전달"}
  ],
  "operation": "심화된 AI 엔진과 검증된 콘텐츠 마스터 블록을 결합하여 가독성과 전문성을 동시에 확보합니다."
}'::jsonb, 14)
ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    details = EXCLUDED.details,
    updated_at = now();
