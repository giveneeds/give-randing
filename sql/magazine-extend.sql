-- =============================================
-- GIVENEEDS 매거진 시스템 확장 SQL
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. magazines 테이블 컬럼 추가 (기존 데이터 유지, 안전한 ALTER)
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'GIVENEEDS';
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE magazines ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. 테스트 데이터 7건 삽입
INSERT INTO magazines (slug, title, excerpt, category, author, tags, thumbnail_url, content_html, is_premium, is_active, is_published, is_featured, sort_order, status)
VALUES 
(
  'ai-digital-marketing-future',
  'AI 시대, 디지털 마케팅의 미래와 변화',
  '생성형 AI가 마케팅 전략 수립부터 콘텐츠 제작까지 어떻게 바꾸고 있는지 핵심 트렌드를 분석합니다.',
  'INSIGHT',
  'GIVENEEDS',
  ARRAY['AI', '디지털마케팅', '트렌드'],
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200',
  '<h2>AI가 바꾸는 마케팅 지형</h2><p>2025년, 생성형 AI는 더 이상 실험적 기술이 아닙니다. 마케팅 현장에서 매일 활용되는 필수 도구로 자리 잡았습니다.</p><p>특히 콘텐츠 생성, 타겟 세그멘테이션, 광고 소재 최적화 영역에서 AI의 도입율은 전년 대비 340% 이상 증가했습니다.</p><h2>핵심 변화 3가지</h2><p><strong>1. 초개인화 콘텐츠</strong> — AI는 고객 개개인의 행동 데이터를 실시간 분석하여 맞춤 콘텐츠를 자동 생성합니다.</p><p><strong>2. 예측 기반 예산 배분</strong> — 머신러닝 모델이 채널별 ROI를 예측하고 최적의 예산 배분을 제안합니다.</p><p><strong>3. 크리에이티브 자동화</strong> — 수백 개의 광고 소재를 동시에 테스트하고, 성과가 좋은 조합을 자동으로 스케일업합니다.</p>',
  true, true, true, true, 1, 'published'
),
(
  'gen-z-emotional-branding',
  'Z세대와 소통하는 감성 브랜딩 전략',
  'Z세대가 브랜드에 기대하는 것은 제품이 아닌 가치관입니다. 감성 브랜딩의 핵심 원칙을 알아봅니다.',
  'STRATEGY',
  'GIVENEEDS',
  ARRAY['Z세대', '브랜딩', '감성마케팅'],
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
  '<h2>Z세대는 왜 다른가</h2><p>디지털 네이티브인 Z세대는 광고에 대한 저항력이 높습니다. 하지만 진정성 있는 브랜드 스토리에는 강하게 반응합니다.</p><p>그들이 원하는 것은 멋진 제품이 아니라, 자신의 가치관과 일치하는 브랜드와의 연결입니다.</p><h2>실전 전략</h2><p>일관된 톤앤매너, 투명한 커뮤니케이션, 그리고 사회적 가치를 담은 캠페인이 Z세대의 마음을 사로잡습니다.</p>',
  false, true, true, false, 2, 'published'
),
(
  'performance-marketing-kpi',
  '퍼포먼스 마케팅의 핵심 지표 5가지',
  'ROAS, CPA, CTR, CVR, LTV — 퍼포먼스 마케터가 반드시 추적해야 할 5가지 핵심 KPI를 정리합니다.',
  'ANALYSIS',
  'GIVENEEDS',
  ARRAY['퍼포먼스', 'KPI', 'ROAS'],
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
  '<h2>측정하지 않으면 관리할 수 없다</h2><p>퍼포먼스 마케팅의 핵심은 데이터 기반 의사결정입니다.</p><p><strong>ROAS(광고비 대비 매출)</strong>는 가장 직관적인 효율 지표이며, <strong>CPA(전환당 비용)</strong>는 고객 획득 전략의 기준선입니다.</p><h2>지표를 넘어 전략으로</h2><p>숫자에 매몰되지 말고, 각 지표가 비즈니스의 어떤 단계를 반영하는지 이해하는 것이 중요합니다.</p>',
  false, true, true, false, 3, 'published'
),
(
  'storytelling-content-marketing',
  '콘텐츠 마케팅에서 스토리텔링의 힘',
  '사람들은 데이터를 기억하지 못하지만, 이야기는 기억합니다. 브랜드 스토리텔링의 실전 프레임워크를 소개합니다.',
  'INSIGHT',
  'GIVENEEDS',
  ARRAY['스토리텔링', '콘텐츠', '브랜딩'],
  'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&q=80&w=1200',
  '<h2>왜 스토리텔링인가</h2><p>광고 메시지의 평균 기억 지속 시간은 3초입니다. 하지만 이야기 형태로 전달하면 22배 더 오래 기억됩니다.</p><p>브랜드가 고객과 감정적 유대를 형성하려면, 제품의 기능이 아닌 고객의 여정에 초점을 맞춘 내러티브가 필요합니다.</p>',
  false, true, true, false, 4, 'published'
),
(
  'minimal-branding-trend-2025',
  '2025 미니멀 브랜딩 트렌드 리포트',
  '로고는 단순해지고, 색상은 줄어들고, 메시지는 압축됩니다. 올해 브랜딩 트렌드의 핵심을 분석합니다.',
  'STRATEGY',
  'GIVENEEDS',
  ARRAY['미니멀', '디자인', '트렌드'],
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
  '<h2>Less is More의 귀환</h2><p>복잡한 비주얼보다 단순하고 명확한 아이덴티티가 소비자의 기억에 오래 남습니다.</p><p>2025년 리브랜딩을 진행한 기업의 78%가 로고를 단순화했고, 컬러 팔레트를 3색 이내로 줄였습니다.</p>',
  false, true, true, false, 5, 'published'
),
(
  'naver-place-seo-guide',
  '네이버 플레이스 상위 노출 완전 가이드',
  '오프라인 매장의 온라인 유입을 극대화하는 네이버 플레이스 최적화 전략을 단계별로 설명합니다.',
  'ANALYSIS',
  'GIVENEEDS',
  ARRAY['네이버', 'SEO', '로컬마케팅'],
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200',
  '<h2>왜 네이버 플레이스인가</h2><p>오프라인 매장을 운영하는 사업자에게 네이버 플레이스 상위 노출은 매출과 직결됩니다.</p><p>검색 사용자의 72%가 상위 3개 플레이스 중 하나를 클릭하며, 리뷰 수와 평점이 클릭률에 가장 큰 영향을 미칩니다.</p>',
  false, true, true, false, 6, 'published'
),
(
  'sns-follower-10k-strategy',
  'SNS 팔로워 1만 달성 실전 전략',
  '팔로워 0에서 1만까지, 기브니즈가 실제로 검증한 인스타그램 성장 전략을 공개합니다.',
  'STRATEGY',
  'GIVENEEDS',
  ARRAY['SNS', '인스타그램', '성장전략'],
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200',
  '<h2>팔로워 수는 중요한가?</h2><p>팔로워 수 자체보다 중요한 것은 진성 팔로워의 비율입니다. 하지만 일정 규모의 팔로워 기반은 브랜드 신뢰도의 기본 조건입니다.</p><p>기브니즈가 실제 운영한 계정들의 데이터를 바탕으로, 팔로워 1만 달성까지의 실전 전략을 단계별로 정리했습니다.</p>',
  false, true, true, false, 7, 'published'
)
ON CONFLICT (slug) DO NOTHING;
