-- 1. services 테이블 생성 (기존에 있을 경우 건너뜀)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL, -- ADS, GROWTH, LOCAL, TECH
    color TEXT DEFAULT '#1E4181',
    icon TEXT DEFAULT 'Target',
    details JSONB DEFAULT '{}'::jsonb,
    order_num INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 보안 정책 설정
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.services;
CREATE POLICY "Allow public read" ON public.services FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.services;
CREATE POLICY "Allow all for authenticated" ON public.services FOR ALL USING (true);

-- 3. 16개 전체 상품 데이터 시딩 (라이브 기준)
INSERT INTO public.services (slug, title, subtitle, description, category, color, icon, order_num, is_active)
VALUES 
-- ADS (Strategic Ads)
('cafe-viral', 'Cafe Viral', '전략적 커뮤니티 침투를 통한 입소문 극대화', '타겟 고객이 밀집된 커뮤니티에서 자연스러운 바이럴을 유도하여 브랜드 인지도를 높입니다.', 'ADS', '#1E4181', 'MessageSquare', 0, true),
('blog-marketing', 'Blog Marketing', '검색 엔진의 최상단을 점유하는 브랜드 자산', '다양한 채널의 블로그 배포를 통해 브랜드의 디지털 발자국을 넓히고 신뢰도를 구축합니다.', 'ADS', '#1E4181', 'FileText', 1, true),
('press-release', 'Press Release', '공신력 있는 매체를 통한 브랜드 신인도 확보', '언론 보도를 통해 브랜드의 공신력을 확보하고 검색 결과의 신뢰도를 강화합니다.', 'ADS', '#1E4181', 'Newspaper', 2, true),
('meta-ads', 'Meta Ads', '정교한 타겟팅으로 만드는 압도적 ROAS', '페이스북/인스타그램의 정교한 타겟팅 시스템을 활용하여 전환 효율을 극대화합니다.', 'ADS', '#1E4181', 'Instagram', 3, true),
('powerlink', 'Powerlink Opt.', '검색 인텐트를 즉각적인 구매로 전환', '네이버 파워링크 광고를 최적화하여 저비용 고효율의 유입을 만들어냅니다.', 'ADS', '#1E4181', 'Zap', 4, true),

-- GROWTH (Growth & Review)
('store-review', 'Store Review', '구매 결정의 마지막 관문을 여는 신뢰의 데이터', '실제 구매자의 진정성 있는 리뷰를 통해 쇼핑몰의 전환율을 획기적으로 개선합니다.', 'GROWTH', '#16A34A', 'Star', 5, true),
('place-review', 'Place Review', '오프라인 방문을 결정짓는 지역 기반 평판 관리', '영수증 인증 리뷰 등을 통해 오프라인 매장의 지역 기반 신뢰도를 높입니다.', 'GROWTH', '#16A34A', 'MapPin', 6, true),
('channel-review', 'Channel Review', '글로벌 및 멀티 채널 신뢰도 통합 관리', '네이버 외 다양한 외부 채널의 리뷰 데이터를 전략적으로 관리합니다.', 'GROWTH', '#16A34A', 'Globe', 7, true),
('sns-growth', 'SNS Growth', '팬덤을 형성하는 강력한 브랜드 소셜 파워', '인스타그램 등 SNS 채널의 팔로워와 반응도를 높여 브랜드의 영향력을 강화합니다.', 'GROWTH', '#16A34A', 'TrendingUp', 8, true),
('global-experience', 'Experience Team', '글로벌 타겟을 사로잡는 프리미엄 체험단', '인플루언서 및 체험단 운영을 통해 브랜드 체험 기회를 확산시키고 고품질 가배포를 진행합니다.', 'GROWTH', '#16A34A', 'Users', 9, true),

-- LOCAL (Local Optimize)
('store-optimize', 'Store Optimize', '노출 알고리즘 분석을 통한 스토어 상단 선점', '스마트스토어 등 이커머스 플랫폼의 노출 로직을 분석하여 상품 순위를 최적화합니다.', 'LOCAL', '#18181B', 'ShoppingCart', 10, true),
('place-optimize', 'Place Optimize', '내 주변 맛집/장소 검색 시 최상단 노출 기술', '네이버 플레이스 상위 노출 로직을 최적화하여 오프라인 매장의 유입을 극대화합니다.', 'LOCAL', '#18181B', 'Target', 11, true),
('070-service', '070 Opt. Service', '지역 기반 통신 지표 최적화 및 연결률 강화', '지역 번호 및 070 번호를 활용한 마케팅 연결 효율을 최적화하는 특화 서비스입니다.', 'LOCAL', '#18181B', 'Phone', 12, true),
('kakao-map', 'Kakao Map Exp.', '국내 최대 지도 플랫폼 내 브랜드 인지도 확산', '카카오맵 및 티맵 등 국내 주요 지도 서비스 내 업체 정보의 노출을 관리합니다.', 'LOCAL', '#18181B', 'Map', 13, true),

-- TECH (Tech / Creative)
('ai-posting', 'AI Auto Posting', '24시간 멈추지 않는 지능형 콘텐츠 생산 엔진', '기브니즈만의 마스터 블록 라이브러리를 활용하여 AI가 고품질 콘텐츠를 자동 생성합니다.', 'TECH', '#F4F4F5', 'Cpu', 14, true),
('premium-web', 'Premium Website', '브랜드의 본질을 담은 독보적인 디지털 경험', '단순한 웹사이트를 넘어 비즈니스의 엔진이 되는 고성능/고감도 웹을 구축합니다.', 'TECH', '#F4F4F5', 'Layout', 15, true)

ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    order_num = EXCLUDED.order_num,
    updated_at = now();

-- 4. 특정 상품 상세 데이터(Details) 업데이트 (사용자가 제공한 데이터 기반)
UPDATE public.services 
SET details = '{
  "effects": [
    {"title": "구매 전환율 최적화", "desc": "세부 키워드 선점을 통한 실제 방문 연결"},
    {"title": "알고리즘 신뢰도 개선", "desc": "적합성, 신뢰도, 인기도 지표의 체계적 관리"}
  ],
  "operation": "네이버 플레이스의 3단계 로직(적합성→신뢰도→인기도)을 모두 최적화하여 실제 매출로 이어지는 순위를 확보합니다.",
  "process": [
    {"step": "01", "name": "키워드 정밀 분석", "desc": "업종별 최적의 유입 키워드 추출"},
    {"step": "02", "name": "페이지 고도화", "desc": "사진, 메뉴, 정보 최적 시스템 적용"},
    {"step": "03", "name": "상위 노출 유지", "desc": "로직 변화 대응 및 실질 데이터 누적"}
  ],
  "duration": "14 Days Setup"
}'::jsonb
WHERE slug = 'place-optimize';
