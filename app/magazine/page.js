import MagazinePageClient from './MagazinePageClient';

export const metadata = {
  title: '마케팅 인사이트 매거진',
  description:
    '기브니즈 매거진에서 마케팅 대행사 실무자가 정리한 광고, 검색 노출, 리뷰 관리, 콘텐츠 전략, AI 마케팅 인사이트를 확인하세요.',
  alternates: {
    canonical: '/magazine',
  },
  openGraph: {
    type: 'website',
    url: '/magazine',
    title: '기브니즈 마케팅 인사이트 매거진',
    description:
      '브랜드 성장을 위한 디지털 마케팅 전략, 사례, 검색 노출과 전환 최적화 인사이트.',
    siteName: 'GIVENEEDS',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '기브니즈 마케팅 인사이트 매거진',
    description:
      '광고, SEO, 리뷰 관리, 바이럴, AI 마케팅 전략을 다루는 기브니즈 매거진.',
  },
};

export default function Page() {
  return <MagazinePageClient />;
}
