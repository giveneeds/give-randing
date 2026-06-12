// 2-트랙 이슈 수집의 트랙 1(curated)에서 search_domain_filter로 강제하는 소스.
// 공통 자격: 사건을 사람/회사 단위 스토리로 해석하고, 돈·권한·일의 방식의 구조 이동을 다루는 매체.
export const CURATED_DOMAINS = [
  'stratechery.com',
  'review.firstround.com',
  'notboring.co',
  'theverge.com',
  'businessinsider.com',
];

export const ISSUE_SOURCE_DIRECTORY = [
  { name: 'FTC Press Releases', url: 'https://www.ftc.gov/news-events/news/press-releases', type: 'regulator', topics: 'consumer protection, antitrust, AI claims, advertising enforcement' },
  { name: 'DOJ Antitrust Division', url: 'https://www.justice.gov/atr/press-releases', type: 'regulator', topics: 'antitrust, platform power, market competition' },
  { name: 'SEC Press Releases', url: 'https://www.sec.gov/news/press-releases', type: 'regulator', topics: 'public companies, AI disclosure, market enforcement' },
  { name: 'EU Commission Digital/Competition', url: 'https://ec.europa.eu/commission/presscorner/home/en', type: 'regulator', topics: 'DMA, DSA, AI Act, platform regulation, competition' },
  { name: 'Florida AG', url: 'https://www.myfloridalegal.com/newsroom', type: 'regulator', topics: 'consumer protection, tech lawsuits, platform disputes' },
  { name: 'California AG Press Releases', url: 'https://oag.ca.gov/news', type: 'regulator', topics: 'privacy, consumer protection, platform enforcement' },
  { name: 'Texas AG Consumer Protection', url: 'https://www.texasattorneygeneral.gov/consumer-protection', type: 'regulator', topics: 'consumer protection, platform enforcement, privacy' },
  { name: 'CPSC News Releases', url: 'https://www.cpsc.gov/Newsroom/News-Releases', type: 'regulator', topics: 'product safety, recalls, consumer risk' },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/news-events/cybersecurity-advisories', type: 'regulator', topics: 'cybersecurity advisories, software vulnerabilities, infrastructure risk' },
  { name: 'ICO Media Centre', url: 'https://ico.org.uk/about-the-ico/media-centre/', type: 'regulator', topics: 'privacy, data protection, AI governance' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com', type: 'company_blog', topics: 'internet infrastructure, security, AI bots, traffic data' },
  { name: 'Stripe Blog', url: 'https://stripe.com/blog', type: 'company_blog', topics: 'payments, fraud, fintech, small business commerce' },
  { name: 'Shopify Engineering Blog', url: 'https://engineering.shopify.com', type: 'company_blog', topics: 'commerce infrastructure, AI tools, automation' },
  { name: 'Figma Blog', url: 'https://www.figma.com/blog', type: 'company_blog', topics: 'design, AI, creative workflow, Config announcements' },
  { name: 'Meta Business News', url: 'https://www.facebook.com/business/news', type: 'company_blog', topics: 'ads products, business tools, marketing policy, creator commerce' },
  { name: 'Google Ads & Commerce Blog', url: 'https://blog.google/products/ads-commerce/', type: 'company_blog', topics: 'Google Ads, Performance Max, commerce, measurement' },
  { name: 'Google Search Central Blog', url: 'https://developers.google.com/search/blog', type: 'company_blog', topics: 'search ranking, SEO, discoverability, web policy' },
  { name: 'YouTube Official Blog', url: 'https://blog.youtube/', type: 'company_blog', topics: 'creator policy, video commerce, recommendations, monetization' },
  { name: 'TikTok Newsroom', url: 'https://newsroom.tiktok.com', type: 'company_blog', topics: 'platform policy, creators, shopping, brand safety' },
  { name: 'LinkedIn Marketing Blog', url: 'https://www.linkedin.com/business/marketing/blog', type: 'company_blog', topics: 'B2B marketing, ads, sales, social selling' },
  { name: 'Amazon Ads Blog', url: 'https://advertising.amazon.com/blog', type: 'company_blog', topics: 'retail media, commerce ads, shopping behavior, measurement' },
  { name: 'Amazon News', url: 'https://www.aboutamazon.com/news', type: 'company_blog', topics: 'commerce, retail, logistics, consumer technology' },
  { name: 'HubSpot Blog', url: 'https://blog.hubspot.com', type: 'company_blog', topics: 'marketing software, CRM, sales, AI workflows' },
  { name: 'Canva Newsroom', url: 'https://www.canva.com/newsroom/', type: 'company_blog', topics: 'design tools, visual marketing, creator workflow, AI design' },
  { name: 'Perplexity Blog', url: 'https://www.perplexity.ai/hub/blog', type: 'company_blog', topics: 'AI search, answer engines, model updates' },
  { name: 'Notion Blog', url: 'https://www.notion.so/blog', type: 'company_blog', topics: 'AI workspace, collaboration, automation' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com', type: 'community', topics: 'developer reactions, AI tools, open source, startup debate' },
  { name: 'Product Hunt Daily', url: 'https://www.producthunt.com/newsletters/archive/daily', type: 'community', topics: 'new AI tools, SaaS launches, automation tools' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog', type: 'developer_release', topics: 'open source AI models, research, deployment' },
  { name: 'arXiv CS AI Recent', url: 'https://arxiv.org/list/cs.AI/recent', type: 'developer_release', topics: 'AI research signals before commercialization' },
  { name: 'GitHub Trending', url: 'https://github.com/trending', type: 'developer_release', topics: 'open source projects, developer adoption, AI tools' },
  { name: 'Socket.dev Blog', url: 'https://socket.dev/blog', type: 'developer_release', topics: 'open source security, supply chain attacks, package risk' },
  { name: 'SemiAnalysis', url: 'https://semianalysis.com', type: 'newsletter', topics: 'AI infrastructure, GPUs, data centers, model economics' },
  { name: 'Stratechery', url: 'https://stratechery.com', type: 'newsletter', topics: 'platform strategy, tech business, regulation' },
  { name: 'Exponential View', url: 'https://www.exponentialview.co', type: 'newsletter', topics: 'AI, energy, economics, geopolitics' },
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com', type: 'newsletter', topics: 'LLM research trends, model capability shifts' },
  { name: 'The Neuron', url: 'https://www.theneurondaily.com', type: 'newsletter', topics: 'AI tools, operator workflows, practical examples' },
  { name: 'TLDR AI', url: 'https://tldr.tech/ai', type: 'newsletter', topics: 'AI news summaries, source discovery' },
  { name: 'Gary Marcus Substack', url: 'https://garymarcus.substack.com', type: 'newsletter', topics: 'AI criticism, legal risk, ethics, overclaiming' },
  { name: 'Signal & Noise', url: 'https://www.signalandnoise.ai', type: 'newsletter', topics: 'data, tech, AI, marketing change' },
  { name: 'Financial Times', url: 'https://www.ft.com', type: 'media_research', topics: 'global business, tech strategy, AI market shifts, platform power' },
  { name: 'FT Tech', url: 'https://www.ft.com/technology', type: 'media_research', topics: 'technology business, AI companies, platform strategy' },
  { name: 'FT Alphaville', url: 'https://www.ft.com/alphaville', type: 'media_research', topics: 'markets, finance, tech business, capital flows' },
  { name: 'Wall Street Journal', url: 'https://www.wsj.com', type: 'media_research', topics: 'business, markets, technology companies, regulation' },
  { name: 'WSJ Tech', url: 'https://www.wsj.com/tech', type: 'media_research', topics: 'technology industry, AI, platforms, consumer tech' },
  { name: 'WSJ CMO Today', url: 'https://www.wsj.com/news/cmo-today', type: 'media_research', topics: 'marketing leadership, advertising, brand strategy, commerce' },
  { name: 'Bloomberg Technology', url: 'https://www.bloomberg.com/technology', type: 'media_research', topics: 'technology markets, AI companies, hardware, startups' },
  { name: 'Bloomberg Businessweek', url: 'https://www.bloomberg.com/businessweek', type: 'media_research', topics: 'business narratives, company strategy, market shifts' },
  { name: 'Stanford HAI AI Index', url: 'https://hai.stanford.edu/research/ai-index', type: 'media_research', topics: 'AI statistics, industry reports, benchmark data' },
  { name: 'EFF Deeplinks Blog', url: 'https://www.eff.org/deeplinks', type: 'media_research', topics: 'privacy, surveillance, digital rights, platform policy' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com', type: 'media_research', topics: 'AI, technology journalism, research translation' },
  { name: 'Rest of World', url: 'https://restofworld.org', type: 'media_research', topics: 'global platform shifts, non-US tech markets' },
  { name: 'The Markup', url: 'https://themarkup.org', type: 'media_research', topics: 'algorithms, advertising, platform investigations' },
];

export const ISSUE_TOPIC_CATEGORIES = [
  {
    value: 'ai_marketing_tools',
    label: 'AI 마케팅 도구',
    shortLabel: 'AI tools',
    description: '광고, CRM, 디자인, 콘텐츠, 자동화 툴이 AI로 바뀌는 순간',
    sourceTypes: ['company_blog', 'media_research', 'newsletter', 'developer_release'],
    prioritySources: ['Meta Business News', 'Google Ads & Commerce Blog', 'HubSpot Blog', 'Canva Newsroom', 'Figma Blog', 'Perplexity Blog', 'The Neuron', 'WSJ CMO Today'],
    searchAngles: ['실무 루틴이 바뀌는 기능 업데이트', '광고주나 마케터의 판단 기준 변화', 'AI 기능 과장과 실제 작동 범위'],
    targetCallouts: ['브랜드 인스타 운영하는 사람', '광고 대행사 운영하는 사람', '콘텐츠 만드는 사람'],
  },
  {
    value: 'platform_policy',
    label: '플랫폼 정책 변화',
    shortLabel: 'platform',
    description: '인스타, 유튜브, 틱톡, 구글, 네이버, 아마존 정책 변화와 실무 영향',
    sourceTypes: ['company_blog', 'regulator', 'media_research'],
    prioritySources: ['Meta Business News', 'Google Search Central Blog', 'YouTube Official Blog', 'TikTok Newsroom', 'Amazon Ads Blog', 'FTC Press Releases', 'EU Commission Digital/Competition', 'The Markup'],
    searchAngles: ['정책 변화가 도달, 검색, 광고비, 수수료에 미치는 영향', '브랜드와 크리에이터가 바꿔야 할 운영 방식', '공식 발표와 실제 반응의 차이'],
    targetCallouts: ['브랜드 인스타 운영하는 사람', '유튜브 채널 운영하는 사람', '검색 노출 신경 쓰는 사람'],
  },
  {
    value: 'consumer_behavior',
    label: '소비자 행동 변화',
    shortLabel: 'consumer',
    description: '리뷰, 검색, 쇼핑, 추천, 구매 경로가 달라지는 사건과 데이터',
    sourceTypes: ['media_research', 'company_blog', 'newsletter'],
    prioritySources: ['Amazon News', 'Amazon Ads Blog', 'Shopify Engineering Blog', 'Stripe Blog', 'Rest of World', 'The Markup', 'WSJ CMO Today', 'Bloomberg Businessweek'],
    searchAngles: ['사람들이 무엇을 보고 사는지', '리뷰, 검색, 추천, 결제 경로 변화', '소비자 선택권이나 브랜드 노출 구조 변화'],
    targetCallouts: ['온라인 쇼핑 자주 하는 사람', '커머스 브랜드 운영하는 사람', '리뷰 관리하는 사람'],
  },
  {
    value: 'brand_story',
    label: '브랜드 흥망성쇠',
    shortLabel: 'brand',
    description: '브랜드가 뜨거나 무너진 구조, 리브랜딩, 카테고리 전쟁',
    sourceTypes: ['media_research', 'newsletter', 'company_blog'],
    prioritySources: ['Bloomberg Businessweek', 'Wall Street Journal', 'Financial Times', 'WSJ CMO Today', 'Rest of World', 'Stratechery'],
    searchAngles: ['브랜드가 뜬 이유 또는 무너진 이유', '리브랜딩과 포지셔닝 전환', '카테고리 1등이 바뀌는 구조'],
    targetCallouts: ['브랜드 만드는 사람', '마케팅 전략 짜는 사람', '창업자'],
  },
  {
    value: 'regulation_business',
    label: '규제와 비즈니스 충격',
    shortLabel: 'regulation',
    description: 'FTC, SEC, EU, 개인정보, 광고 제재, 플랫폼 독과점이 사업에 미치는 영향',
    sourceTypes: ['regulator', 'media_research', 'newsletter'],
    prioritySources: ['FTC Press Releases', 'SEC Press Releases', 'DOJ Antitrust Division', 'EU Commission Digital/Competition', 'ICO Media Centre', 'California AG Press Releases', 'Financial Times', 'The Markup'],
    searchAngles: ['규제가 광고, 데이터, 플랫폼 운영에 미치는 영향', '법적 주장과 확정 사실 구분', '사업자가 확인해야 할 리스크'],
    targetCallouts: ['광고 도구 쓰는 사람', '플랫폼 사업하는 사람', '개인정보 다루는 사람'],
  },
  {
    value: 'capital_flow',
    label: '돈의 흐름',
    shortLabel: 'capital',
    description: '투자, M&A, 상장, 기업 가치 변화, 특정 카테고리에 돈이 몰리는 이유',
    sourceTypes: ['media_research', 'regulator', 'newsletter'],
    prioritySources: ['SEC Press Releases', 'FT Alphaville', 'Bloomberg Technology', 'Bloomberg Businessweek', 'Wall Street Journal', 'Financial Times', 'SemiAnalysis', 'Stratechery'],
    searchAngles: ['어떤 카테고리에 돈이 몰리는지', 'M&A나 투자 뒤의 전략 변화', '기업 가치 변화가 시장 신호가 되는 이유'],
    targetCallouts: ['스타트업 창업자', '투자 흐름 보는 사람', 'B2B 영업하는 사람'],
  },
  {
    value: 'work_shift',
    label: '일의 방식 변화',
    shortLabel: 'work',
    description: '마케터, 디자이너, 영업, 창업자, 프리랜서의 역할과 루틴 변화',
    sourceTypes: ['media_research', 'newsletter', 'company_blog', 'community'],
    prioritySources: ['LinkedIn Marketing Blog', 'HubSpot Blog', 'Notion Blog', 'Figma Blog', 'Product Hunt Daily', 'Hacker News', 'MIT Technology Review', 'Rest of World'],
    searchAngles: ['직무 루틴이 바뀐 구체 장면', '채용, 연봉, 필요 역량 변화', '소수 팀이 대형 팀처럼 일하는 구조'],
    targetCallouts: ['마케터', '디자이너', 'B2B 영업하는 사람', '프리랜서'],
  },
  {
    value: 'local_commerce',
    label: '로컬/커머스 실무',
    shortLabel: 'local',
    description: '네이버 플레이스, 리뷰, 배달, 예약, 지역 광고, 소상공인 운영 변화',
    sourceTypes: ['company_blog', 'media_research', 'regulator'],
    prioritySources: ['Google Search Central Blog', 'Amazon Ads Blog', 'Shopify Engineering Blog', 'Stripe Blog', 'CPSC News Releases', 'FTC Press Releases', 'Rest of World', 'The Markup'],
    searchAngles: ['로컬 노출과 리뷰 신호 변화', '결제, 예약, 배달, 커머스 운영 비용 변화', '작은 사업자가 바로 확인할 화면과 질문'],
    targetCallouts: ['가게 운영하는 사람', '로컬 브랜드 운영하는 사람', '네이버 플레이스 챙기는 사람'],
  },
];

const LEGACY_CATEGORY_ALIASES = {
  AI: 'ai_marketing_tools',
  marketing: 'ai_marketing_tools',
  tech: 'platform_policy',
  business: 'capital_flow',
};

export function normalizeIssueCategories(categories = []) {
  const values = new Set(ISSUE_TOPIC_CATEGORIES.map((item) => item.value));
  const normalized = categories
    .map((category) => LEGACY_CATEGORY_ALIASES[category] || category)
    .filter((category) => values.has(category));
  return Array.from(new Set(normalized));
}

export function getIssueCategoryValues() {
  return ISSUE_TOPIC_CATEGORIES.map((category) => category.value);
}

export function formatIssueTopicMap() {
  return ISSUE_TOPIC_CATEGORIES
    .map((category) => [
      `- ${category.value} (${category.label})`,
      `  설명: ${category.description}`,
      `  우선 소스 타입: ${category.sourceTypes.join(', ')}`,
      `  우선 소스: ${category.prioritySources.join(', ')}`,
      `  좋은 각도: ${category.searchAngles.join(' / ')}`,
      `  타깃 호칭 예: ${category.targetCallouts.join(', ')}`,
    ].join('\n'))
    .join('\n\n');
}

function uniqueByName(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    if (seen.has(source.name)) return false;
    seen.add(source.name);
    return true;
  });
}

export function formatIssueSourceStrategy({ categories = [], maxSources = 24 } = {}) {
  const normalized = normalizeIssueCategories(categories);
  const selectedCategories = normalized.length
    ? ISSUE_TOPIC_CATEGORIES.filter((category) => normalized.includes(category.value))
    : ISSUE_TOPIC_CATEGORIES.slice(0, 4);
  const priorityNames = selectedCategories.flatMap((category) => category.prioritySources);
  const priorityTypes = selectedCategories.flatMap((category) => category.sourceTypes);
  const prioritySources = uniqueByName([
    ...priorityNames
      .map((name) => ISSUE_SOURCE_DIRECTORY.find((source) => source.name === name))
      .filter(Boolean),
    ...ISSUE_SOURCE_DIRECTORY.filter((source) => priorityTypes.includes(source.type)),
  ]).slice(0, maxSources);

  return [
    '선택한 주제 축:',
    ...selectedCategories.map((category) => `- ${category.value} (${category.label}): ${category.description}`),
    '',
    '이 주제에서 우선 볼 소스:',
    ...prioritySources.map((source) => `- ${source.name}: ${source.url} [${source.type}] ${source.topics}`),
    '',
    '검색 각도:',
    ...selectedCategories.flatMap((category) => category.searchAngles.map((angle) => `- ${angle}`)),
    '',
    '타깃 호칭 후보:',
    ...selectedCategories.flatMap((category) => category.targetCallouts.map((callout) => `- ${callout}`)),
  ].join('\n');
}

export function formatIssueSourceDirectory({ maxPerType = 5 } = {}) {
  const byType = new Map();
  for (const source of ISSUE_SOURCE_DIRECTORY) {
    const rows = byType.get(source.type) || [];
    if (rows.length < maxPerType) rows.push(source);
    byType.set(source.type, rows);
  }

  return Array.from(byType.entries())
    .map(([type, sources]) => [
      `[${type}]`,
      ...sources.map((source) => `- ${source.name}: ${source.url} (${source.topics})`),
    ].join('\n'))
    .join('\n\n');
}

export function formatIssueSourceDomains({ max = 35 } = {}) {
  return ISSUE_SOURCE_DIRECTORY
    .slice(0, max)
    .map((source) => {
      try {
        return new URL(source.url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join(', ');
}
