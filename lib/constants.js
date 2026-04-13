// 섹션 타입 정의
export const SECTION_TYPES = {
  hero: {
    label: '시네마틱 파티클 헤더',
    description: '파티클 효과와 메인 헤드라인이 있는 프리미엄 첫 화면',
    fields: ['headline', 'particle_text', 'cta_label']
  },
  hook: {
    label: '강조 텍스트 (마케팅 훅)',
    description: '사용자의 시선을 사로잡는 강력한 문구와 하이라이트 효과',
    fields: ['title', 'highlight', 'suffix', 'footer']
  },
  stats: {
    label: '성과 지표 (Stats Grid)',
    description: '신뢰도를 높이는 숫자 데이터와 지표 그리드',
    fields: ['title', 'subtitle', 'items']
  },
  identity: {
    label: '브랜드 아이덴티티 (3단 구성)',
    description: '브랜드의 핵심 가치(GIVE, NEEDS, GIVENEEDS)를 설명하는 섹션',
    fields: ['title', 'content']
  },
  product_detail: {
    label: 'OUR SOLUTION (솔루션 탭)',
    description: '4가지 핵심 솔루션의 상세 정보와 탭 전환 효과',
    fields: ['title', 'subtitle', 'items']
  },
  ai_strategy: {
    label: 'AI 전략 가이드 (입력 폼)',
    description: '사용자 고민을 입력받아 AI 전략을 제안하는 인터랙티브 섹션',
    fields: ['title', 'subtitle']
  },
  services: {
    label: '서비스 리스트',
    description: '핵심 마케팅 서비스를 카드 형태로 나열',
    fields: ['items']
  },
  resources: {
    label: '다운로드 자료실',
    description: 'PDF 가이드북, 전략집 등 유료급 무료 자료 다운로드',
    fields: ['items']
  },
  testimonials: {
    label: '파트너 성공 사례',
    description: '실제 클라이언트의 생생한 성과 후기',
    fields: ['items']
  },
  case_studies: {
    label: '클라이언트 성공사례 (이미지 카드)',
    description: '실제 성과 스크린샷 + 수치로 신뢰를 보여주는 케이스 스터디',
    fields: ['items']
  },
  client_logos: {
    label: '클라이언트 & 파트너 로고',
    description: '협력 브랜드/클라이언트 로고를 그리드로 나열하는 신뢰 섹션',
    fields: ['items']
  },
  faq: {
    label: '자주 묻는 질문 (FAQ)',
    description: '가장 많이 궁금해하는 질문들을 아코디언으로 정리',
    fields: ['items']
  },
  video: {
    label: '유튜브 브랜드 영상',
    description: '브랜드 필름이나 소개 영상을 임베드',
    fields: ['url', 'title', 'subtitle']
  },
  magazine: {
    label: '매거진 인사이트 (B-Style)',
    description: '최신 트렌드와 전문 인사이트가 담긴 매거진 리스트',
    fields: ['headline', 'subtitle']
  },
  conviction: {
    label: '3막 선언문 (스크롤 애니메이션)',
    description: '공감 → 진단 → 선언 3단계 스크롤 섹션. 구체 배경 + GSAP 핀 애니메이션.',
    fields: ['act1_title', 'act1_sub', 'act2_lines', 'act3_lines']
  },
  brand_stats: {
    label: '브랜드 헤드라인 + 카운트업',
    description: '검은 배경 + 텍스트 shimmer + 통계 카운트업 인터랙션',
    fields: ['eyebrow', 'title_main', 'title_dim', 'stats']
  }
};

// CTA 타입 정의
export const CTA_TYPES = {
  kakao: { label: '카카오톡 상담' },
  phone: { label: '전화 문의' },
  external: { label: '외부 링크' },
  scroll: { label: '섹션 이동' },
};

// 파일 타입 (아이콘 텍스트 처리)
export const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  xls: 'XLS',
  xlsx: 'XLSX',
  ppt: 'PPT',
  pptx: 'PPTX',
  png: 'IMG',
  jpg: 'IMG',
  jpeg: 'IMG',
  gif: 'IMG',
  mp4: 'VIDEO',
  default: 'FILE'
};

// 섹션 콘텐츠 기본 템플릿
export const SECTION_TEMPLATES = {
  hero: {
    headline: '초기 스타트업을 위한\n성장 전략 가이드북',
    particle_text: 'GIVENEEDS\nSTRATEGY\n2025',
    cta_label: '무료 가이드북 받기'
  },
  hook: {
    title: '누구나 해결할 수 있는 건',
    highlight: '마케팅',
    suffix: '이 아닙니다.',
    footer: '400+가 넘는 고객들이 선택한 이유'
  },
  stats: {
    title: '숫자로 입증된 결과',
    subtitle: '기브니즈가 만든 변화',
    items: [
      { label: '함께한 클라이언트', value: '500+' },
      { label: '재계약율', value: '92%' },
      { label: '고객 만족도', value: '95%' }
    ]
  },
  identity: {
    title: '기브니즈가 누구도 해결하지 못했던 부분을 채워 드리겠습니다.',
    content: {
      left: { title: 'GIVE', desc: '건네주다' },
      middle: { title: 'NEEDS', desc: '원하는 가치를' },
      right: { title: 'GIVENEEDS', desc: '진정 원하는 가치를 전달하는 마케팅' }
    }
  },
  product_detail: {
    title: 'OUR SOLUTION',
    subtitle: '기브니즈만의 압도적인 마케팅 솔루션',
    items: [
      { id: 'ads', title: 'Strategic Ads', desc: '카페 바이럴, 블로그 중점 운영', color: '#1E4181', icon: 'MessageSquare' },
      { id: 'growth', title: 'Growth & Review', desc: '리뷰 관리 및 플랫폼 성장', color: '#16A34A', icon: 'Star' }
    ]
  },
  ai_strategy: {
    title: 'AI 전략 가이드',
    subtitle: '기브니즈 AI로 5분만에 내 비즈니스 맞춤형 전략 알아보기'
  },
  services: {
    items: [
      { title: '퍼포먼스 마케팅', label: 'ROI 최적화', description: '데이터 기반 초정밀 타겟팅 광고 운영' }
    ]
  },
  resources: {
    items: [
      { title: '스타트업 성장 전략서', description: '2025년 마케팅 트렌드 분석', file_url: '', file_type: 'pdf' }
    ]
  },
  testimonials: {
    items: [
      { name: 'K대표', company: 'IT 스타트업', text: '기브니즈 협업 후 CPA가 40% 이상 감소했습니다.', rating: 5 }
    ]
  },
  case_studies: {
    items: [
      { image_url: '', metric_label: '마케팅 4개월 만에', metric_result: '병원 매출 2배 상승한', client_type: '피부과' },
      { image_url: '', metric_label: '마케팅 시작 2개월 만에', metric_result: '신환 2배 상승한', client_type: '정형외과' }
    ]
  },
  client_logos: {
    items: [
      { image_url: '', name: '클라이언트명' }
    ]
  },
  faq: {
    items: [
      { question: '의뢰 프로세스는 어떻게 되나요?', answer: '초기 킥오프 미팅부터 리포트 발행까지 체계적으로 진행됩니다.' }
    ]
  },
  video: {
    url: 'https://youtu.be/XEe8DN-JOgU?si=Gmt3aeVMM_JLjEpU',
    title: '기브니즈 알아보기',
    subtitle: '마케팅의 새로운 기준을 제시하는 영상을 확인하세요.'
  },
  magazine: {
    headline: 'Latest Insight',
    subtitle: '기브니즈의 전문적인 인사이트가 담긴 매거진입니다.'
  },
  brand_stats: {
    eyebrow: 'GIVENEEDS',
    title_main: 'We are',
    title_dim: 'brand marketing agency',
    stats: [
      { value: 1024, suffix: '+', label: '누적 프로젝트', description: '1024+ 누적 프로젝트를 진행하였습니다.' },
      { value: 500, suffix: '+', label: '누적 광고주', description: '누적광고주는 500+ 입니다.' }
    ]
  }
};
