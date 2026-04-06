import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isDummyMode = !supabaseUrl || supabaseUrl === 'your_supabase_url_here';

let supabase = null;

if (!isDummyMode) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase, isDummyMode };

export const DUMMY_SETTINGS = {
  brand: {
    name: 'GIVENEEDS',
    logo_url: '/logo.png',
    primary_color: '#a78bfa',
    accent_color: '#8b5cf6',
    tagline: 'Strategic Marketing Partner'
  },
  cta_global: {
    kakao_url: 'https://pf.kakao.com/',
    phone: '010-1234-5678',
    external_url: ''
  },
  seo: {
    title: 'GIVENEEDS | Strategic Marketing Partner',
    description: '성장을 위한 최고의 마케팅 파트너, 기브니즈입니다.',
    og_image: ''
  },
  navbar: {
    links: [
      { label: '매거진', url: '/magazine' },
      { label: '회사소개', url: '/#hero' },
      { label: '서비스', url: '/service' },
      { label: '문의하기', url: '/#cta' }
    ],
    show_cta: true
  },
  footer: {
    copyright: '© 2025 GIVENEEDS. All rights reserved.',
    social_links: []
  }
};

// 글로벌 재사용 섹션 (모든 캠페인에서 선택해서 쓸 수 있는 블록들)
export const DUMMY_SECTIONS = [
  {
    id: 'sec-hero',
    type: 'hero',
    title: 'GIVENEEDS',
    subtitle: '당신의 마케팅을 위한 모든 것',
    content: {},
    is_active: false // 🏠 홈페이지에서 히어로 섹션 비활성화
  },
  {
    id: 'sec-services',
    type: 'products',
    title: '주요 솔루션',
    subtitle: '고객의 브랜드를 성장시키는 방법',
    content: {
      items: [
        { category: "DATA", title: "퍼포먼스 마케팅", desc: "Meta, Google 매체 최적화를 통한 ROAS 극대화 및 고객 획득 비용(CAC) 절감" },
        { category: "GROWTH", title: "CRM 마케팅", desc: "행동 데이터 기반의 세그먼트 타겟팅으로 고객 라이프타임 밸류(LTV) 상승" },
        { category: "CREATIVE", title: "브랜드 콘텐츠", desc: "고관여 타겟을 매료시키는 심미적이고 논리적인 영상/디자인 애셋 제작" }
      ]
    },
    is_active: false
  },
  {
    id: 'sec-video',
    type: 'video',
    title: '기브니즈 알아보기',
    subtitle: '마케팅의 새로운 기준을 제시하는 기브니즈를 영상으로 만나보세요.',
    content: {},
    is_active: true
  },
  {
    id: 'sec-testimonials',
    type: 'testimonials',
    title: '파트너 사례',
    subtitle: '숫자로 입증된 결과',
    content: {
      items: [
        { name: 'K대표', company: 'IT 스타트업', text: '기브니즈 협업 후 CPA가 40% 이상 감소했습니다.', rating: 5 }
      ]
    },
    is_active: true
  },
  {
    id: 'sec-faq',
    type: 'faq',
    title: 'FAQ',
    subtitle: '자주 묻는 질문',
    content: {
      items: [
        { question: '의뢰 프로세스는 어떻게 되나요?', answer: '초기 킥오프 미팅부터 리포트 발행까지 체계적으로 진행됩니다.' }
      ]
    },
    is_active: true
  },
  {
    id: 'sec-hook',
    type: 'hook',
    title: '누구나 해결할 수 있는 건',
    subtitle: '이 아닙니다.',
    content: {
      highlight: '마케팅',
      footer: '혼자 해결할 수 없는 부분.'
    },
    is_active: true
  },
  {
    id: 'sec-stats',
    type: 'stats',
    title: '숫자로 입증된 결과',
    subtitle: '기브니즈가 만든 변화',
    content: {
      items: [
        { label: '함께한 클라이언트', value: '490+' },
        { label: '재계약율', value: '92%' },
        { label: '고객 만족도', value: '95%' }
      ]
    },
    is_active: true
  },
  {
    id: 'sec-identity',
    type: 'identity',
    title: '기브니즈가 누구도 해결하지 못했던 부분을 채워 드리겠습니다.',
    subtitle: '',
    content: {
      left: { title: 'GIVE', desc: '건네주다' },
      middle: { title: 'NEEDS', desc: '원하는 것을' },
      right: { title: 'GIVENEEDS', desc: '진정 원하는 가치를 전달하는 마케팅' }
    },
    is_active: true
  },
  {
    id: 'sec-product-detail',
    type: 'product_detail',
    title: 'OUR SOLUTION',
    subtitle: '기브니즈만의 압도적인 마케팅 솔루션',
    content: {
      items: [
        { 
          id: 'v1', 
          title: 'Viral Marketing', 
          desc: '입소문이 아닌 전략적인 데이터 기반의 확산',
          detail_title: '#1. Viral',
          detail_desc: '카페 바이럴, 블로그 마케팅, 언론보도 송출',
          detail_sub: '단순 배포가 아닌 상위 노출과 고관여 타겟의 유입을 목적으로 하는 전략적 입소문 시스템.',
          icon: 'MessageSquare',
          slug: 'viral',
          color: '#ec4899' // pink
        },
        { 
          id: 'r1', 
          title: 'Review Management', 
          desc: '고객의 첫인상을 결정짓는 신뢰의 척도',
          detail_title: '#2. Review',
          detail_desc: '네이버 플레이스/스토어 리뷰, 구글 리뷰, 카카오맵 리뷰',
          detail_sub: '부정적 여론 방어와 진정성 있는 리뷰 축적을 통해 전환율을 최대화합니다.',
          icon: 'Star',
          slug: 'review',
          color: '#f59e0b' // yellow/amber
        },
        { 
          id: 'a1', 
          title: 'AI Automation', 
          desc: '초격차 기술력으로 만드는 무한한 성과의 자동화',
          detail_title: '#3. AI Solution',
          detail_desc: 'AI 기반 브랜드 블로그, 스레드, 인스타 콘텐츠 자동 생성',
          detail_sub: '단 5분 만에 기브니즈 AI로 내 비즈니스 맞춤형 전략을 알아보고 수립하세요.',
          icon: 'Cpu',
          slug: 'ai-automation',
          color: '#8b5cf6' // violet
        },
        { 
          id: 's1', 
          title: 'SNS Growth', 
          desc: '팬덤을 형성하는 브랜드 계정의 압도적 성장',
          detail_title: '#4. SNS',
          detail_desc: '중/일 글로벌 체험단 및 소셜 성장 패키지',
          detail_sub: '단순 팔로워 증대를 넘어 진성 소통과 강력한 브랜드 인지도를 구축합니다.',
          icon: 'Instagram',
          slug: 'sns-growth',
          color: '#3b82f6' // blue
        },
        { 
          id: 'l1', 
          title: 'Local SEO', 
          desc: '지역 기반 매출의 핵심 거점을 선점하는 기술',
          detail_title: '#5. Local Marketing',
          detail_desc: '스토어/플레이스/070서비스 최적화 및 카카오맵 노출',
          detail_sub: '검색 인텐트 분석을 통해 거점 지역 내 최상단 노출을 실현합니다.',
          icon: 'MapPin',
          slug: 'local-seo',
          color: '#10b981' // emerald
        },
        { 
          id: 'p1', 
          title: 'Creative Production', 
          desc: '고객의 마음을 훔치는 감각적인 시각 디자인',
          detail_title: '#6. Website & Production',
          detail_desc: '프리미엄 웹사이트 제작 및 UX/UI 설계',
          detail_sub: '비즈니스의 본질을 담은 심미적이고 기능적인 웹사이트로 고객 신뢰를 구축합니다.',
          icon: 'Layout',
          slug: 'production',
          color: '#6b7280' // gray
        },
        { 
          id: 'c1', 
          title: 'CPC Advertising', 
          desc: '유의미한 클릭을 구매로 바꾸는 정교한 퍼포먼스',
          detail_title: '#7. CPC',
          detail_desc: '파워링크, 메타(Meta) 광고 매체 운영',
          detail_sub: '클릭당 비용 중심의 검색/디스플레이 광고를 분석하여 최적의 수익률을 달성합니다.',
          icon: 'Target',
          slug: 'cpc',
          color: '#ef4444' // red
        }
      ]
    },
    is_active: true
  },
  {
    id: 'sec-ai-strategy',
    type: 'ai_strategy',
    title: 'AI 전략 가이드',
    subtitle: '기브니즈 AI로 5분만에 내 비즈니스 맞춤형 전략 알아보기',
    content: {},
    is_active: true
  }
];

// 캠페인 랜딩 페이지 (어드민에서 생성되는 개별 페이지들)
export const DUMMY_CAMPAIGNS = [
  {
    id: 'cp-1',
    slug: '1',
    title: '스타트업 스케일업 가이드',
    category: '성장 전략',
    is_active: true,
    status: 'published',
    show_ai_block: true,
    hero_type: 'A', // 🎭 파티클 타입 적용
    hero_content: {
      headline: '초기 스타트업을 위한\n성장 전략 가이드북',
      particle_text: '안녕하세요.\n당신을 위한\n모든 마케팅을\n제공\n하겠습니다.\nGIVENEEDS\n입니다.',
      description: '선착순 100명에게만 공개되는 초격차 마케팅 전략집을 지금 바로 다운로드하세요.',
      file_name: 'Startup_Growth_Strategy.pdf',
      cta_label: '무료 가이드북 받기'
    },
    seo_config: {
      title: '무료 배포 | 스타트업 성장 전략 가이드',
      description: '기브니즈가 제안하는 2025년 최고의 마케팅 전략을 확인하세요.',
      og_image: ''
    },
    tracking_scripts: { pixel_id: '123456789' },
    selected_sections: ['sec-services', 'sec-testimonials', 'sec-faq'],
    created_at: '2025-01-01T00:00:00Z'
  }
];

// 매거진 포스트 (Magazine B 스타일 — 7개 테스트 데이터)
export const DUMMY_MAGAZINES = [
  {
    id: 'mag-1',
    slug: 'ai-digital-marketing-future',
    title: 'AI 시대, 디지털 마케팅의 미래와 변화',
    excerpt: '생성형 AI가 마케팅 전략 수립부터 콘텐츠 제작까지 어떻게 바꾸고 있는지 핵심 트렌드를 분석합니다.',
    category: 'INSIGHT',
    author: 'GIVENEEDS',
    tags: ['AI', '디지털마케팅', '트렌드'],
    thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>AI가 바꾸는 마케팅 지형</h2><p>2025년, 생성형 AI는 더 이상 실험적 기술이 아닙니다. 마케팅 현장에서 매일 활용되는 필수 도구로 자리 잡았습니다.</p><p>특히 콘텐츠 생성, 타겟 세그멘테이션, 광고 소재 최적화 영역에서 AI의 도입율은 전년 대비 340% 이상 증가했습니다.</p><h2>핵심 변화 3가지</h2><p><strong>1. 초개인화 콘텐츠</strong> — AI는 고객 개개인의 행동 데이터를 실시간 분석하여 맞춤 콘텐츠를 자동 생성합니다.</p><p><strong>2. 예측 기반 예산 배분</strong> — 머신러닝 모델이 채널별 ROI를 예측하고 최적의 예산 배분을 제안합니다.</p><p><strong>3. 크리에이티브 자동화</strong> — 수백 개의 광고 소재를 동시에 테스트하고, 성과가 좋은 조합을 자동으로 스케일업합니다.</p>',
    is_premium: true,
    is_active: true,
    is_published: true,
    is_featured: true,
    sort_order: 1,
    status: 'published',
    created_at: '2025-03-15T10:00:00Z'
  },
  {
    id: 'mag-2',
    slug: 'gen-z-emotional-branding',
    title: 'Z세대와 소통하는 감성 브랜딩 전략',
    excerpt: 'Z세대가 브랜드에 기대하는 것은 제품이 아닌 가치관입니다. 감성 브랜딩의 핵심 원칙을 알아봅니다.',
    category: 'STRATEGY',
    author: 'GIVENEEDS',
    tags: ['Z세대', '브랜딩', '감성마케팅'],
    thumbnail_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>Z세대는 왜 다른가</h2><p>디지털 네이티브인 Z세대는 광고에 대한 저항력이 높습니다. 하지만 진정성 있는 브랜드 스토리에는 강하게 반응합니다.</p><p>그들이 원하는 것은 멋진 제품이 아니라, 자신의 가치관과 일치하는 브랜드와의 연결입니다.</p><h2>실전 전략</h2><p>일관된 톤앤매너, 투명한 커뮤니케이션, 그리고 사회적 가치를 담은 캠페인이 Z세대의 마음을 사로잡습니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 2,
    status: 'published',
    created_at: '2025-03-10T14:30:00Z'
  },
  {
    id: 'mag-3',
    slug: 'performance-marketing-kpi',
    title: '퍼포먼스 마케팅의 핵심 지표 5가지',
    excerpt: 'ROAS, CPA, CTR, CVR, LTV — 퍼포먼스 마케터가 반드시 추적해야 할 5가지 핵심 KPI를 정리합니다.',
    category: 'ANALYSIS',
    author: 'GIVENEEDS',
    tags: ['퍼포먼스', 'KPI', 'ROAS'],
    thumbnail_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>측정하지 않으면 관리할 수 없다</h2><p>퍼포먼스 마케팅의 핵심은 데이터 기반 의사결정입니다.</p><p><strong>ROAS(광고비 대비 매출)</strong>는 가장 직관적인 효율 지표이며, <strong>CPA(전환당 비용)</strong>는 고객 획득 전략의 기준선입니다.</p><h2>지표를 넘어 전략으로</h2><p>숫자에 매몰되지 말고, 각 지표가 비즈니스의 어떤 단계를 반영하는지 이해하는 것이 중요합니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 3,
    status: 'published',
    created_at: '2025-03-05T09:00:00Z'
  },
  {
    id: 'mag-4',
    slug: 'storytelling-content-marketing',
    title: '콘텐츠 마케팅에서 스토리텔링의 힘',
    excerpt: '사람들은 데이터를 기억하지 못하지만, 이야기는 기억합니다. 브랜드 스토리텔링의 실전 프레임워크를 소개합니다.',
    category: 'INSIGHT',
    author: 'GIVENEEDS',
    tags: ['스토리텔링', '콘텐츠', '브랜딩'],
    thumbnail_url: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>왜 스토리텔링인가</h2><p>광고 메시지의 평균 기억 지속 시간은 3초입니다. 하지만 이야기 형태로 전달하면 22배 더 오래 기억됩니다.</p><p>브랜드가 고객과 감정적 유유대를 형성하려면, 제품의 기능이 아닌 고객의 여정에 초점을 맞춘 내러티브가 필요합니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 4,
    status: 'published',
    created_at: '2025-02-28T11:00:00Z'
  },
  {
    id: 'mag-5',
    slug: 'minimal-branding-trend-2025',
    title: '2025 미니멀 브랜딩 트렌드 리포트',
    excerpt: '로고는 단순해지고, 색상은 줄어들고, 메시지는 압축됩니다. 올해 브랜딩 트렌드의 핵심을 분석합니다.',
    category: 'STRATEGY',
    author: 'GIVENEEDS',
    tags: ['미니멀', '디자인', '트렌드'],
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>Less is More의 귀환</h2><p>복잡한 비주얼보다 단순하고 명확한 아이덴티티가 소비자의 기억에 오래 남습니다.</p><p>2025년 리브랜딩을 진행한 기업의 78%가 로고를 단순화했고, 컬러 팔레트를 3색 이내로 줄였습니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 5,
    status: 'published',
    created_at: '2025-02-20T16:00:00Z'
  },
  {
    id: 'mag-6',
    slug: 'naver-place-seo-guide',
    title: '네이버 플레이스 상위 노출 완전 가이드',
    excerpt: '오프라인 매장의 온라인 유입을 극대화하는 네이버 플레이스 최적화 전략을 단계별로 설명합니다.',
    category: 'ANALYSIS',
    author: 'GIVENEEDS',
    tags: ['네이버', 'SEO', '로컬마케팅'],
    thumbnail_url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>왜 네이버 플레이스인가</h2><p>오프라인 매장을 운영하는 사업자에게 네이버 플레이스 상위 노출은 매출과 직결됩니다.</p><p>검색 사용자의 72%가 상위 3개 플레이스 중 하나를 클릭하며, 리뷰 수와 평점이 클릭률에 가장 큰 영향을 미칩니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 6,
    status: 'published',
    created_at: '2025-02-15T08:00:00Z'
  },
  {
    id: 'mag-7',
    slug: 'sns-follower-10k-strategy',
    title: 'SNS 팔로워 1만 달성 실전 전략',
    excerpt: '팔로워 0에서 1만까지, 기브니즈가 실제로 검증한 인스타그램 성장 전략을 공개합니다.',
    category: 'STRATEGY',
    author: 'GIVENEEDS',
    tags: ['SNS', '인스타그램', '성장전략'],
    thumbnail_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200',
    content_html: '<h2>팔로워 수는 중요한가?</h2><p>팔로워 수 자체보다 중요한 것은 진성 팔로워의 비율입니다. 하지만 일정 규모의 팔로워 기반은 브랜드 신뢰도의 기본 조건입니다.</p><p>기브니즈가 실제 운영한 계정들의 데이터를 바탕으로, 팔로워 1만 달성까지의 실전 전략을 단계별로 정리했습니다.</p>',
    is_premium: false,
    is_active: true,
    is_published: true,
    is_featured: false,
    sort_order: 7,
    status: 'published',
    created_at: '2025-02-10T13:00:00Z'
  }
];
