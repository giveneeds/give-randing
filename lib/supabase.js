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
    logo_url: '',
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
    title: 'GIVENEEDS | Marketing Agency',
    description: 'Strategic growth partner for modern brands.',
    og_image: ''
  },
  navbar: {
    links: [],
    show_cta: true
  },
  footer: {
    copyright: '© 2025 GIVENEEDS. All rights reserved.',
    social_links: []
  }
};

export const DUMMY_SECTIONS = [
  {
    id: '1',
    type: 'hero',
    title: '메인 헤드라인',
    content: {
      headline: 'The New Standard of Marketing',
      description: '안녕하세요.\n당신을 위한\n모든 마케팅을\n제공하겠습니다.\nGIVENEEDS입니다.',
      cta_buttons: [
        { label: '성장 진단받기', type: 'kakao', url: 'https://pf.kakao.com/' },
        { label: '솔루션 보기', type: 'scroll', url: '#services' }
      ]
    },
    order_index: 0,
    is_active: true
  },
  {
    id: 'video-1',
    type: 'video',
    title: '기브니즈 알아보기',
    subtitle: '영상으로 확인하는 우리의 가치',
    content: {
      url: 'https://youtu.be/XEe8DN-JOgU?si=Gmt3aeVMM_JLjEpU'
    },
    order_index: 1,
    is_active: true
  },
  {
    id: 'products-1',
    type: 'products',
    title: '주요 솔루션',
    subtitle: '고객의 브랜드를 성장시키는 방법',
    content: {
      items: [
        { category: "DATA", title: "퍼포먼스 마케팅", desc: "Meta, Google 매체 최적화를 통한 ROAS 극대화 및 고객 획득 비용(CAC) 절감" },
        { category: "GROWTH", title: "CRM 마케팅", desc: "행동 데이터 기반의 세그먼트 타겟팅으로 고객 라이프타임 밸류(LTV) 상승" },
        { category: "CREATIVE", title: "브랜드 콘텐츠", desc: "고관여 타겟을 매료시키는 심미적이고 논리적인 영상/디자인 애셋 제작" },
        { category: "SEARCH", title: "SEO 최적화", desc: "오가닉 트래픽 증대를 위한 테크니컬 SEO 및 콘텐츠 온페이지 최적화" }
      ]
    },
    order_index: 2,
    is_active: true
  },
  {
    id: '3',
    type: 'resources',
    title: '인사이트 리소스',
    subtitle: '매출로 직결되는 노하우',
    content: {
      items: [
        { title: '2025 마케팅 트렌드 리포트', description: '올해 반드시 알아야 할 마케팅 트렌드 총정리', file_url: '#', file_type: 'pdf' },
        { title: '광고 성과 분석 템플릿', description: '지표를 한눈에 관리하는 엑셀 자동화 템플릿', file_url: '#', file_type: 'xlsx' }
      ]
    },
    order_index: 3,
    is_active: true
  },
  {
    id: '4',
    type: 'testimonials',
    title: '파트너 사례',
    subtitle: '숫자로 입증된 결과',
    content: {
      items: [
        { name: 'K대표', company: 'IT 스타트업', text: '기브니즈 협업 후 CPA가 40% 이상 감소했으며, 3개월 만에 MAU 300% 증가를 달성했습니다. 정확한 데이터 분석이 결정적이었습니다.', rating: 5 },
        { name: 'L마케터', company: '커머스 브랜드', text: '단순한 대행이 아닌, 내부 팀처럼 비즈니스를 고민해 줍니다. 브랜딩과 퍼포먼스를 동시에 잡아준 최고의 파트너입니다.', rating: 5 }
      ]
    },
    order_index: 4,
    is_active: true
  },
  {
    id: '5',
    type: 'faq',
    title: 'FAQ',
    subtitle: '자주 묻는 질문',
    content: {
      items: [
        { question: '의뢰 프로세스는 어떻게 진행되나요?', answer: '초기 킥오프 미팅 - 데이터 진단 - 전략 수립 - 매체 세팅 - 주간/월간 리포트 및 최적화 사이클로 진행됩니다.' },
        { question: '스타트업도 진행 가능한가요?', answer: '네, 예산 규모에 맞춘 시드 볼륨부터 스케일업 단계까지, 단계별 맞춤 전략을 제안해 드립니다.' }
      ]
    },
    order_index: 5,
    is_active: true
  },
  {
    id: '6',
    type: 'cta',
    title: '문의하기',
    content: {
      headline: '브랜드 성장을 위한 다음 단계',
      description: '무료 마케팅 진단을 통해 우리 브랜드의 병목을 파악하고 해결책을 찾아보세요.',
      cta_buttons: [
        { label: '전문가와 상담하기', type: 'kakao', url: 'https://pf.kakao.com/' }
      ]
    },
    order_index: 6,
    is_active: true
  }
];
