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
    is_active: true
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
    subtitle: '마케팅이 아닙니다.',
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
        { label: '고객 만족도', value: '98%' }
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
    title: 'OUR PRODUCT',
    subtitle: '',
    content: {
      items: [
        { 
          id: 10, 
          title: '디자인', 
          desc: '브랜드 가치를 시각화하는 고감도 디자인 솔루션',
          detail_title: '브랜드 디자인',
          detail_desc: '단순한 예쁨을 넘어 비즈니스 논리가 담긴 디자인을 제안합니다.',
          detail_sub: '브랜드 아이덴티티부터 웹/앱 UI까지 통합적인 경험을 설계합니다.',
          icon: 'Palette'
        },
        { 
          id: 11, 
          title: '언론보도', 
          desc: '누구나 게시할 수 있는 SNS와는 다릅니다.',
          detail_title: '언론보도',
          detail_desc: '누구나 게시할 수 있는 SNS와는 다릅니다.',
          detail_sub: '객관적인 보도 원칙을 지키는 뉴스를 통해 회사에 대한 신뢰도를 쌓아갑니다.',
          icon: 'Newspaper'
        },
        { 
          id: 12, 
          title: '제품 촬영', 
          desc: '제품의 매력을 극대화하는 시네마틱 화보/영상',
          detail_title: '시각 콘텐츠 제작',
          detail_desc: '제품의 본질적 가치가 돋보이도록 빛과 구도를 설계합니다.',
          detail_sub: '고관여 타겟의 마음을 움직이는 감각적인 영상/사진 애셋을 제작합니다.',
          icon: 'Camera'
        }
      ]
    },
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

// 매거진 포스트 (Magazine B 스타일)
export const DUMMY_MAGAZINES = [
  {
    id: 'mag-1',
    slug: 'startup-a-growth',
    title: '데이터로 증명한 스타트업 A의 300% 성장기',
    category: 'CASE STUDY',
    thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80',
    content_html: '<h2>스타트업 A의 고민</h2><p>마케팅 비용은 늘었지만 고객 획득 비용(CAC)은 줄지 않았습니다...</p>',
    is_premium: true,
    status: 'published',
    created_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'mag-2',
    slug: 'branding-insight',
    title: '감각과 논리의 균형: 브랜드 마케팅의 정석',
    category: 'INSIGHT',
    thumbnail_url: 'https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&q=80',
    content_html: '<h2>브랜딩이란 무엇인가</h2><p>본문 내용이 들어갑니다...</p>',
    is_premium: false,
    status: 'published',
    created_at: '2025-01-12T14:30:00Z'
  }
];
