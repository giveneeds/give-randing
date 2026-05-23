import HomePageClient from './HomePageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr';

export const metadata = {
  title: '기브니즈 마케팅 대행사 | 데이터 기반 디지털 마케팅 파트너',
  description:
    '기브니즈는 성과형 광고, 네이버 플레이스·SEO, 바이럴, 리뷰 관리, AI 마케팅 전략까지 통합 운영하는 B2B 마케팅 대행사입니다.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: '기브니즈 마케팅 대행사 | 데이터 기반 디지털 마케팅 파트너',
    description:
      '광고 운영부터 검색 노출, 콘텐츠, 리뷰, AI 전략까지 성장을 만드는 통합 마케팅 파트너 GIVENEEDS.',
    siteName: 'GIVENEEDS',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '기브니즈 마케팅 대행사 | 데이터 기반 디지털 마케팅 파트너',
    description:
      '성과형 광고, 네이버 플레이스·SEO, 바이럴, 리뷰 관리, AI 마케팅을 통합 운영합니다.',
  },
};

export default function Page() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    name: '기브니즈',
    alternateName: 'GIVENEEDS',
    url: SITE_URL,
    description:
      'B2B 디지털 마케팅 대행사. 성과형 광고, 검색 노출, 바이럴, 리뷰 관리, AI 마케팅 전략을 통합 운영합니다.',
    areaServed: 'KR',
    knowsAbout: [
      '마케팅 대행사',
      '디지털 마케팅',
      '퍼포먼스 마케팅',
      '네이버 플레이스',
      'SEO',
      '바이럴 마케팅',
      '리뷰 관리',
      'AI 마케팅',
    ],
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
