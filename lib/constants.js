// 섹션 타입 정의
export const SECTION_TYPES = {
  hero: {
    label: '히어로 (메인 배너)',
    description: '메인 헤드라인과 CTA 버튼이 있는 첫 화면',
    fields: ['headline', 'description', 'cta_buttons']
  },
  services: {
    label: '서비스 소개',
    description: '서비스/상품을 텍스트 및 카드 형태로 소개',
    fields: ['items']
  },
  resources: {
    label: '다운로드 자료',
    description: '다운로드 가능한 무료 자료, PDF, 가이드',
    fields: ['items']
  },
  testimonials: {
    label: '고객 후기',
    description: '고객 리뷰와 추천사',
    fields: ['items']
  },
  faq: {
    label: '자주 묻는 질문',
    description: '질문과 답변을 아코디언 형태로 표시',
    fields: ['items']
  },
  cta: {
    label: 'CTA 배너',
    description: '행동 유도 배너 (상담 신청, 전화 문의 등)',
    fields: ['headline', 'description', 'cta_buttons']
  },
  gallery: {
    label: '포트폴리오',
    description: '이미지 갤러리/포트폴리오',
    fields: ['items']
  },
  text: {
    label: '자유 텍스트',
    description: '자유로운 텍스트 블록',
    fields: ['body']
  },
  video: {
    label: '유튜브 영상',
    description: '유튜브 영상을 임베드하여 표시',
    fields: ['url']
  },
  products: {
    label: '마케팅 상품 (좌우 스크롤)',
    description: '마케팅 서비스들을 모바일 최적화된 수평 스크롤 카드로 표시',
    fields: ['items']
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
    headline: '새로운 제목을 입력하세요',
    description: '설명을 입력하세요',
    cta_buttons: [
      { label: '상담 신청하기', type: 'kakao', url: '' }
    ]
  },
  services: {
    items: [
      { title: '서비스명', label: '핵심 텍스트', description: '서비스 설명을 입력하세요' }
    ]
  },
  resources: {
    items: [
      { title: '자료 제목', description: '자료 설명', file_url: '', file_type: 'pdf' }
    ]
  },
  testimonials: {
    items: [
      { name: '고객명', company: '회사명', text: '후기 내용을 입력하세요', rating: 5 }
    ]
  },
  faq: {
    items: [
      { question: '질문을 입력하세요', answer: '답변을 입력하세요' }
    ]
  },
  cta: {
    headline: '마지막으로 행동 유도',
    description: '구체적인 안내 텍스트',
    cta_buttons: [
      { label: '지금 시작하기', type: 'kakao', url: '' }
    ]
  },
  gallery: {
    items: [
      { image_url: '', caption: '설명' }
    ]
  },
  text: {
    body: '본문을 입력하세요.'
  },
  video: {
    url: 'https://youtu.be/XEe8DN-JOgU?si=Gmt3aeVMM_JLjEpU'
  },
  products: {
    items: [
      { category: 'DATA', title: '서비스 명', desc: '서비스 상세 설명을 입력하세요' }
    ]
  }
};
