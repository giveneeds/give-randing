-- =============================================
-- GIVENEEDS 실서비스 데이터 시드 (Seed Data)
-- 모든 목업 데이터를 실제 DB로 마이그레이션합니다.
-- =============================================

-- [에러 방지] 누락된 컬럼이 있다면 추가합니다.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazines' AND column_name='status') THEN
        ALTER TABLE magazines ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='status') THEN
        ALTER TABLE campaigns ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
END $$;

-- [보안] 모든 기존 데이터를 기본적으로 'published'로 업데이트 (필요시)
UPDATE magazines SET status = 'published' WHERE status IS NULL;
UPDATE campaigns SET status = 'published' WHERE status IS NULL;

-- 1. 랜딩 페이지 글로벌 설정 (ID 1 고정)
INSERT INTO landing_settings (id, brand, cta_global, seo, navbar, footer)
VALUES (
    1,
    '{
        "name": "GIVENEEDS",
        "logo_url": "/logo.png",
        "primary_color": "#a78bfa",
        "accent_color": "#8b5cf6",
        "tagline": "Strategic Marketing Partner"
    }'::jsonb,
    '{
        "kakao_url": "https://pf.kakao.com/",
        "phone": "010-1234-5678",
        "external_url": ""
    }'::jsonb,
    '{
        "title": "GIVENEEDS | Strategic Marketing Partner",
        "description": "성장을 위한 최고의 마케팅 파트너, 기브니즈입니다.",
        "og_image": ""
    }'::jsonb,
    '{
        "links": [
            { "label": "매거진", "url": "/magazine" },
            { "label": "회사소개", "url": "/#hero" },
            { "label": "서비스", "url": "/service" },
            { "label": "문의하기", "url": "/contact" }
        ],
        "show_cta": true
    }'::jsonb,
    '{
        "copyright": "© 2025 GIVENEEDS. All rights reserved.",
        "social_links": []
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    brand = EXCLUDED.brand,
    cta_global = EXCLUDED.cta_global,
    seo = EXCLUDED.seo,
    navbar = EXCLUDED.navbar,
    footer = EXCLUDED.footer,
    updated_at = NOW();

-- 2. 글로벌 재사용 섹션
INSERT INTO global_sections (id, type, title, subtitle, content, is_active)
VALUES 
('sec-hero', 'hero', 'GIVENEEDS', '당신의 마케팅을 위한 모든 것', '{}'::jsonb, false),
('sec-services', 'products', '주요 솔루션', '고객의 브랜드를 성장시키는 방법', '{
    "items": [
        { "category": "DATA", "title": "퍼포먼스 마케팅", "desc": "Meta, Google 매체 최적화를 통한 ROAS 극대화 및 고객 획득 비용(CAC) 절감" },
        { "category": "GROWTH", "title": "CRM 마케팅", "desc": "행동 데이터 기반의 세그먼트 타겟팅으로 고객 라이프타임 밸류(LTV) 상승" },
        { "category": "CREATIVE", "title": "브랜드 콘텐츠", "desc": "고관여 타겟을 매료시키는 심미적이고 논리적인 영상/디자인 애셋 제작" }
    ]
}'::jsonb, false),
('sec-video', 'video', '기브니즈 알아보기', '마케팅의 새로운 기준을 제시하는 기브니즈를 영상으로 만나보세요.', '{}'::jsonb, true),
('sec-testimonials', 'testimonials', '파트너 사례', '숫자로 입증된 결과', '{
    "items": [
        { "name": "K대표", "company": "IT 스타트업", "text": "기브니즈 협업 후 CPA가 40% 이상 감소했습니다.", "rating": 5 }
    ]
}'::jsonb, true),
('sec-faq', 'faq', 'FAQ', '자주 묻는 질문', '{
    "items": [
        { "question": "의뢰 프로세스는 어떻게 되나요?", "answer": "초기 킥오프 미팅부터 리포트 발행까지 체계적으로 진행됩니다." }
    ]
}'::jsonb, true),
('sec-hook', 'hook', '누구나 해결할 수 있는 건', '이 아닙니다.', '{
    "highlight": "마케팅",
    "footer": "혼자 해결할 수 없는 부분."
}'::jsonb, true),
('sec-stats', 'stats', '숫자로 입증된 결과', '기브니즈가 만든 변화', '{
    "items": [
        { "label": "함께한 클라이언트", "value": "490+" },
        { "label": "재계약율", "value": "92%" },
        { "label": "고객 만족도", "value": "95%" }
    ]
}'::jsonb, true),
('sec-identity', 'identity', '기브니즈가 누구도 해결하지 못했던 부분을 채워 드리겠습니다.', '', '{
    "left": { "title": "GIVE", "desc": "건네주다" },
    "middle": { "title": "NEEDS", "desc": "원하는 것을" },
    "right": { "title": "GIVENEEDS", "desc": "진정 원하는 가치를 전달하는 마케팅" }
}'::jsonb, true),
('sec-product-detail', 'product_detail', 'OUR SOLUTION', '기브니즈만의 압도적인 마케팅 솔루션', '{
    "items": [
        { "id": "ads", "title": "Strategic Ads", "desc": "카페 바이럴, 블로그, 언론보도, 메타 및 파워링크 최적화 운영", "detail_title": "STRATEGIC ADS", "detail_desc": "카페 바이럴, 블로그 마케팅, 언론보도 송출, Meta Ads 및 파워링크 최적화 운영", "detail_sub": "단순 배포가 아닌 상위 노출과 고관여 타겟의 유입을 목적으로 하는 전략적 광고 시스템.", "icon": "MessageSquare", "slug": "strategic-ads", "color": "#1E4181" },
        { "id": "growth", "title": "Growth & Review", "desc": "네이버/스토어/구글/카카오 리뷰 관리 및 인스타 전용 계정 성장", "detail_title": "GROWTH & REVIEW", "detail_desc": "네이버/스토어/구글/카카오 리뷰 관리 및 인스타 전용 계정 성장", "detail_sub": "부정적 여론 방어와 진성 리뷰 축적, 브랜드 소셜 파워 구축으로 전환율을 극대화합니다.", "icon": "Star", "slug": "growth-review", "color": "#16A34A" },
        { "id": "local", "title": "Local Optimize", "desc": "스토어, 플레이스, 070 서비스, 카카오맵 노출의 개별적 세분화 최적화", "detail_title": "LOCAL OPTIMIZE", "detail_desc": "스토어, 플레이스, 070 서비스, 카카오맵 노출의 개별적 세분화 최적화", "detail_sub": "내 주변 검색 시 최상단 노출을 점령하는 지역 기반 검색 최적화 토탈 솔루션.", "icon": "MapPin", "slug": "local-optimize", "color": "#71717A" },
        { "id": "tech", "title": "Tech / Creative", "desc": "마케팅 전용 AI 엔진 가동 및 프리미엄 웹/UI/UX 프로덕션", "detail_title": "TECH / CREATIVE", "detail_desc": "마케팅 전용 AI 엔진 가동 및 프리미엄 웹/UI/UX 프로덕션", "detail_sub": "초격차 AI 기술력과 감각적 디자인의 결합으로 브랜드 가치를 극대화합니다.", "icon": "Cpu", "slug": "tech-creative", "color": "#18181B" }
    ]
}'::jsonb, true),
('sec-ai-strategy', 'ai_strategy', 'AI 전략 가이드', '기브니즈 AI로 5분만에 내 비즈니스 맞춤형 전략 알아보기', '{}'::jsonb, true)
ON CONFLICT (id) DO UPDATE 
SET 
    type = EXCLUDED.type,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    content = EXCLUDED.content,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. 매거진 포스트
INSERT INTO magazines (slug, title, category, thumbnail_url, content_html, is_premium, is_active, status)
VALUES 
('ai-digital-marketing-future', 'AI 시대, 디지털 마케팅의 미래와 변화', 'INSIGHT', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200', '<h2>AI가 바꾸는 마케팅 지형</h2><p>2025년, 생성형 AI는 더 이상 실험적 기술이 아닙니다.</p>', true, true, 'published'),
('gen-z-emotional-branding', 'Z세대와 소통하는 감성 브랜딩 전략', 'STRATEGY', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200', '<h2>Z세대는 왜 다른가</h2><p>디지털 네이티브인 Z세대는 광고에 대한 저항력이 높습니다.</p>', false, true, 'published'),
('performance-marketing-kpi', '퍼포먼스 마케팅의 핵심 지표 5가지', 'ANALYSIS', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200', '<h2>측정하지 않으면 관리할 수 없다</h2><p>퍼포먼스 마케팅의 핵심은 데이터 기반 의사결정입니다.</p>', false, true, 'published'),
('storytelling-content-marketing', '콘텐츠 마케팅에서 스토리텔링의 힘', 'INSIGHT', 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&q=80&w=1200', '<h2>왜 스토리텔링인가</h2><p>광고 메시지의 평균 기억 지속 시간은 3초입니다.</p>', false, true, 'published'),
('minimal-branding-trend-2025', '2025 미니멀 브랜딩 트렌드 리포트', 'STRATEGY', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200', '<h2>Less is More의 귀환</h2><p>2025년 리브랜딩을 진행한 기업의 78%가 로고를 단순화했습니다.</p>', false, true, 'published'),
('naver-place-seo-guide', '네이버 플레이스 상위 노출 완전 가이드', 'ANALYSIS', 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200', '<h2>왜 네이버 플레이스인가</h2><p>오프라인 매장 사업자에게 상위 노출은 매출과 직결됩니다.</p>', false, true, 'published'),
('sns-follower-10k-strategy', 'SNS 팔로워 1만 달성 실전 전략', 'STRATEGY', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200', '<h2>팔로워 수는 중요한가?</h2><p>진성 팔로워의 비율이 더 중요합니다.</p>', false, true, 'published')
ON CONFLICT (slug) DO UPDATE 
SET 
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    thumbnail_url = EXCLUDED.thumbnail_url,
    content_html = EXCLUDED.content_html,
    is_premium = EXCLUDED.is_premium,
    is_active = EXCLUDED.is_active,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 4. 핵심 캠페인
INSERT INTO campaigns (slug, title, is_active, status, hero_type, hero_content, seo_config, tracking_scripts, selected_sections)
VALUES 
(
    '1', 
    '스타트업 스케일업 가이드', 
    true, 
    'published', 
    'A', 
    '{
        "headline": "초기 스타트업을 위한\n성장 전략 가이드북",
        "particle_text": "안녕하세요.\n당신을 위한\n모든 마케팅을\n제공\n하겠습니다.\nGIVENEEDS\n입니다.",
        "description": "선착순 100명에게만 공개되는 초격차 마케팅 전략집을 지금 바로 다운로드하세요.",
        "file_name": "Startup_Growth_Strategy.pdf",
        "cta_label": "무료 가이드북 받기"
    }'::jsonb,
    '{
        "title": "무료 배포 | 스타트업 성장 전략 가이드",
        "description": "기브니즈가 제안하는 2025년 최고의 마케팅 전략을 확인하세요.",
        "og_image": ""
    }'::jsonb,
    '{"pixel_id": "123456789"}'::jsonb,
    '["sec-services", "sec-testimonials", "sec-faq"]'::jsonb
),
(
    'startup-strategy', 
    '초기 스타트업 성장 전략', 
    true, 
    'published', 
    'A', 
    '{
        "headline": "초기 스타트업을 위한\n성장 전략 가이드북",
        "particle_text": "초기 스타트업\n전략 패키지\n무료 배포 중\nGIVENEEDS",
        "description": "선착순 100명에게만 공개되는 초격차 마케팅 전략집을 지금 바로 다운로드하세요.",
        "file_name": "Giveneeds_Growth_Strategy_2025.pdf",
        "cta_label": "지금 바로 다운로드"
    }'::jsonb,
    '{
        "title": "초기 스타트업을 위한 성장 전략 가이드북",
        "description": "선착순 100 한정 무료 배포 진행 중입니다.",
        "og_image": ""
    }'::jsonb,
    '{}'::jsonb,
    '["sec-services", "sec-stats", "sec-product-detail", "sec-faq"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE 
SET 
    title = EXCLUDED.title,
    is_active = EXCLUDED.is_active,
    status = EXCLUDED.status,
    hero_type = EXCLUDED.hero_type,
    hero_content = EXCLUDED.hero_content,
    seo_config = EXCLUDED.seo_config,
    tracking_scripts = EXCLUDED.tracking_scripts,
    selected_sections = EXCLUDED.selected_sections,
    updated_at = NOW();
