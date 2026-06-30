// 서버 layout — /service/[slug] 의 서비스별 고유 metadata 를 DB(services)에서 생성.
// 본문 페이지는 client 컴포넌트라 generateMetadata 를 여기서 담당한다.

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let service = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('services')
      .select('title, subtitle, slug')
      .eq('slug', slug)
      .maybeSingle();
    service = data;
  }

  const name = service?.title || '서비스';
  const title = `${name} | 데이터 기반 광고 대행사 기브니즈`;
  const description =
    service?.subtitle ||
    `${name} — 데이터 기반 종합 광고 대행사 기브니즈가 제공하는 마케팅 대행 서비스입니다.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/service/${slug}` },
    openGraph: { title, description, url: `/service/${slug}` },
  };
}

export default async function ServiceSlugLayout({ children, params }) {
  const { slug } = await params;

  const faqJsonLd = slug === 'place-marketing' ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '네이버 플레이스 마케팅이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네이버 플레이스 마케팅은 N 포털 지도에서 가게 순위를 올려 더 많은 고객이 방문하도록 만드는 최적화 서비스입니다. 알고리즘이 신뢰하는 고품질 트래픽과 지도 SEO를 통해 진행합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '플레이스 마케팅 효과가 나타나는 기간은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '약 3주에 걸쳐 진행됩니다. 위험 없는 트래픽과 알고리즘이 선호하는 상태를 단계적으로 만들어갑니다.',
        },
      },
      {
        '@type': 'Question',
        name: '저품질·어뷰징 위험은 없나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '저가·출처 불명 트래픽을 사용하지 않습니다. 알고리즘이 신뢰하는 실제 고객 유입을 관리하며, 목표 미달 및 어뷰징·저품질 발생 시 100% 환불을 보장합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '어떤 업종에 플레이스 마케팅이 효과적인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '지역 기반 오프라인 매장이라면 모두 해당됩니다. 단, 시작 전 가게 상황을 정밀 진단해 효과 여부를 먼저 확인합니다. 효과가 없을 길이라면 명확하게 말씀드립니다.',
        },
      },
    ],
  } : null;

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
