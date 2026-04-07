const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jbbxwogpuimruzuyurkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiYnh3b2dwdWltcnV6dXl1cmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzAwOTQsImV4cCI6MjA5MDU0NjA5NH0.HKmRld_2jDBhEG6Hdb1ta4P5oUpk-I3jQXyA9I4maC8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ALL_SERVICES = [
  { slug: 'cafe-viral', title: 'Cafe Viral', category: 'ADS', description: '전략적 커뮤니티 침투를 통한 입소문 극대화', icon: 'MessageSquare', color: '#1E4181', order_num: 0 },
  { slug: 'blog-marketing', title: 'Blog Marketing', category: 'ADS', description: '검색 엔진의 최상단을 점유하는 브랜드 자산', icon: 'FileText', color: '#1E4181', order_num: 1 },
  { slug: 'press-release', title: 'Press Release', category: 'ADS', description: '공신력 있는 매체를 통한 브랜드 신인도 확보', icon: 'Globe', color: '#1E4181', order_num: 2 },
  { slug: 'meta-ads', title: 'Meta Ads', category: 'ADS', description: '정교한 타겟팅으로 만드는 압도적 ROAS', icon: 'Target', color: '#1E4181', order_num: 3 },
  { slug: 'powerlink', title: 'Powerlink Opt.', category: 'ADS', description: '검색 인텐트를 즉각적인 구매로 전환', icon: 'Zap', color: '#1E4181', order_num: 4 },
  { slug: 'store-review', title: 'Store Review', category: 'GROWTH', description: '구매 결정의 마지막 관문을 여는 신뢰의 데이터', icon: 'ShoppingCart', color: '#16A34A', order_num: 5 },
  { slug: 'place-review', title: 'Place Review', category: 'GROWTH', description: '오프라인 방문을 결정짓는 지역 기반 평판 관리', icon: 'Star', color: '#16A34A', order_num: 6 },
  { slug: 'channel-review', title: 'Channel Review', category: 'GROWTH', description: '글로벌 및 멀티 채널 신뢰도 통합 관리', icon: 'Share2', color: '#16A34A', order_num: 7 },
  { slug: 'sns-growth', title: 'SNS Growth', category: 'GROWTH', description: '팬덤을 형성하는 강력한 브랜드 소셜 파워', icon: 'Instagram', color: '#16A34A', order_num: 8 },
  { slug: 'global-experience', title: 'Experience Team', category: 'GROWTH', description: '글로벌 타겟을 사로잡는 프리미엄 체험단', icon: 'Users', color: '#16A34A', order_num: 9 },
  { slug: 'store-optimize', title: 'Store Optimize', category: 'LOCAL', description: '노출 알고리즘 분석을 통한 스토어 상단 선점', icon: 'Layout', color: '#71717A', order_num: 10 },
  { slug: 'place-optimize', title: 'Place Optimize', category: 'LOCAL', description: '내 주변 맛집/장소 검색 시 최상단 노출 기술', icon: 'MapPin', color: '#71717A', order_num: 11 },
  { slug: '070-service', title: '070 Opt. Service', category: 'LOCAL', description: '지역 기반 통신 지표 최적화 및 연결률 강화', icon: 'Phone', color: '#71717A', order_num: 12 },
  { slug: 'kakao-map', title: 'Kakao Map Exp.', category: 'LOCAL', description: '국내 최대 지도 플랫폼 내 브랜드 인지도 확산', icon: 'Navigation', color: '#71717A', order_num: 13 },
  { slug: 'ai-posting', title: 'AI Auto Posting', category: 'TECH', description: '24시간 멈추지 않는 지능형 콘텐츠 생산 엔진', icon: 'Cpu', color: '#18181B', order_num: 14 },
  { slug: 'premium-web', title: 'Premium Website', category: 'TECH', description: '브랜드의 본질을 담은 독보적인 디지털 경험', icon: 'Monitor', color: '#18181B', order_num: 15 }
];

const DETAILS_MAP = {
  'place-optimize': {
    tagline: '네이버 플레이스 상위노출 통합 솔루션',
    blocks: [
      { label: '1. 상품 효과', content: `네이버 플레이스는 위치, 메뉴, 리뷰 등 상세 정보를 제공하는 서비스로, 지역 기반 업종(음식점, 병원, 헬스장 등)의 매출에 절대적인 영향을 미칩니다. 기브니즈의 PlaceOptimize는 단순히 트래픽만 높이는 것이 아니라, 네이버의 3단계 로직(적합성→신뢰도→인기도) 전체를 최적화하여 **실제 매출로 이어지는 상위 노출**을 만들어냅니다.\n\n경쟁이 극심한 대표 키워드("강남역 맛집")를 쫓는 대신, "강남역 회식장소"나 "강남역 생일파티"처럼 구매 전환율이 높은 세부 키워드에서 먼저 순위를 확보합니다. 이를 통해 유입된 사용자의 클릭, 체류시간, 저장하기 등 긍정적인 데이터가 쌓이면, 네이버 알고리즘은 해당 매장을 '인기 있는 곳'으로 인식하여 점차 상위권에 안착시킵니다.` },
      { label: '2. 운영 방식', content: `"왜 내 매장만 안 뜰까?" 그 이유는 대부분 정보 설계가 처음부터 잘못되었기 때문입니다. 기브니즈는 네이버 알고리즘이 매장의 정체성을 정확히 읽을 수 있도록 **N1(적합성/유사도)** 점수를 먼저 바로잡습니다. 업체명, 대표 키워드, 상세설명을 '교차 조합'하고 '맥락 키워드'를 활용해 봇이 이해하기 쉬운 구조로 만듭니다.\n\n그 후, 실제 사용자의 행동 데이터인 **'리워드 트래픽', '플레이스 리뷰', '블로그 기자단'** 작업을 유기적으로 결합하여 **N2(인지도/반응도)** 점수를 극대화합니다. 이는 어뷰징 프로그램이 아닌, 앱테크 어플을 기반으로 한 실제 사용자 유입이므로 안전합니다.` },
      { label: '3. 실제 사례', content: `[사진 첨부 예정 ]` },
      { label: '4. 진행 절차 및 기간 소요', content: `- **진행 절차 |**\n    [상권 분석 및 경쟁사 키워드 확인] → [1단계: SEO 세팅 및 정보 재설계] → [2, 3단계: 리뷰/트래픽 통합 집행] → [클릭률(CTR) 및 순위 모니터링/조정]\n- **기간 소요 |**\n    - 초기 정보 재설계: 영업일 기준 3~5일\n    - 상위 노출 안착까지: 1~3개월 집중 관리` },
      { label: '5. PlaceOptimize 세부 상품 안내', content: `PlaceOptimize는 아래 4가지 핵심 서비스를 고객사의 목표와 예산에 맞춰 최적의 조합으로 설계하는 통합 솔루션입니다.\n\n- **SEO 세팅**\n    네이버 봇에게 매장의 정체성을 각인시키는 가장 기초적이고 중요한 단계입니다.\n- **플레이스 리뷰**\n    실제 방문을 증명하는 '영수증/예약자 리뷰'를 통해 잠재 고객의 신뢰를 얻습니다.\n- **블로그 기자단**\n    특정 '세부 카테고리'를 뚫기 위한 전략적 도구입니다.\n- **리워드 트래픽**\n    상위 노출의 결정타 역할을 하는 마지막 단계입니다.` }
    ]
  },
  'cafe-viral': {
    tagline: '전략적 커뮤니티 전파 솔루션',
    blocks: [
      { label: '1. 상품 효과', content: `맘카페, 지역카페 등 타겟이 밀집된 커뮤니티에 자연스러운 입소문을 형성하여 브랜드 인지도와 신뢰도를 단기간에 확보합니다.` }
    ]
  },
  'press-release': {
    tagline: '매체 공신력 확보 솔루션',
    blocks: [
      { label: '1. 상품 효과', content: `주요 언론사를 통한 뉴스 배포로 브랜드의 공식적인 신뢰도를 높이고, 검색 시 브랜드 자산으로 남게 합니다.` }
    ]
  },
  'meta-ads': {
    tagline: '정교한 타겟 마케팅 솔루션',
    blocks: [
      { label: '1. 상품 효과', content: `페이스북, 인스타그램의 정교한 타겟팅 알고리즘을 활용하여 구매 가능성이 가장 높은 잠재 고객에게 브랜드를 노출시킵니다.` }
    ]
  },
  'powerlink': {
    tagline: '네이버 검색광고 최적화',
    blocks: [
      { label: '1. 상품 효과', content: `키워드별 인텐트를 분석하여 낮은 비용으로 최고의 효율을 내는 최적화된 파워링크 운영을 지원합니다.` }
    ]
  },
  'store-review': {
     tagline: '구매율을 높이는 신뢰의 지표',
     blocks: [{ label: '상품 개요', content: '실제 구매 데이터 기반의 고품질 리뷰를 생성하여 구매 전환율을 극대화합니다.' }]
  },
  'place-review': {
     tagline: '방문 결정의 핵심 평판 관리',
     blocks: [{ label: '상품 개요', content: '영수증 및 예약 기반 리뷰를 통해 지역 매장의 신뢰도를 높입니다.' }]
  },
  'channel-review': {
     tagline: '멀티 채널 통합 평판 솔루션',
     blocks: [{ label: '상품 개요', content: '다양한 플랫폼에 흩어진 리뷰와 여론을 수집하고 통합 관리합니다.' }]
  },
  'sns-growth': {
     tagline: '강력한 브랜드 소셜 파워',
     blocks: [{ label: '상품 개요', content: '인스타그램, 블로그 등의 팔로워와 인게이지먼트를 높여 브랜드 팬덤을 구축합니다.' }]
  },
  'global-experience': {
     tagline: '글로벌 프리미엄 체험단',
     blocks: [{ label: '상품 개요', content: '전세계 타겟을 향한 전문 리뷰어의 심층 후기를 생성합니다.' }]
  },
  'store-optimize': {
     tagline: '스토어 상단 노출 솔루션',
     blocks: [{ label: '상품 개요', content: '스마트스토어와 쿠팡의 노출 알고리즘을 최적화하여 매출을 증폭시킵니다.' }]
  },
  '070-service': {
     tagline: '지역 확장 지표 최적화',
     blocks: [{ label: '상품 개요', content: '가상 번호 및 지역 지표 설계를 통해 전국구 비즈니스 확장을 지원합니다.' }]
  },
  'kakao-map': {
     tagline: '카카오 플랫폼 노출 전략',
     blocks: [{ label: '상품 개요', content: '국내 최대 지도 서비스 내에서 브랜드가 우선 발견되도록 기술적 지원을 합니다.' }]
  },
  'ai-posting': {
     tagline: '24시간 지능형 콘텐츠 제작 엔진',
     blocks: [{ label: '상품 개요', content: 'AI가 실시간으로 최적화된 마케팅 콘텐츠를 생성하고 자동 발행합니다.' }]
  },
  'premium-web': {
     tagline: '독보적인 디지털 쇼룸 구축',
     blocks: [{ label: '상품 개요', content: '고객을 설득하고 브랜드의 가치를 담는 고급 웹사이트 제작 솔루션입니다.' }]
  },
  'blog-marketing': {
     tagline: '검색 엔진 점유 마케팅',
     blocks: [{ label: '상품 개요', content: '고품질 최적화 블로그를 활용하여 검색 결과 상단에 브랜드 정보를 안착시킵니다.' }]
  }
};

async function forceUpsertServices() {
  console.log('🚀 Finalizing 16 Services with FULL Content Blocks...');
  
  for (const item of ALL_SERVICES) {
    const details = DETAILS_MAP[item.slug] || { tagline: item.title, blocks: [{ label: 'INFO', content: item.description }] };
    
    const { error } = await supabase
      .from('services')
      .upsert({
        slug: item.slug,
        title: item.title,
        subtitle: item.description,
        description: item.description,
        category: item.category,
        icon: item.icon,
        color: item.color,
        order_num: item.order_num,
        details: details,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (error) console.error(`❌ Error ${item.slug}:`, error.message);
    else console.log(`✅ ${item.slug} synced.`);
  }
  console.log('✨ Data Restoration Complete.');
}

forceUpsertServices();
