import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { DUMMY_SETTINGS, DUMMY_SERVICE_PRODUCTS, isDummyMode, supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServiceJsonLd, getServiceSeo } from '@/lib/serviceSeo';
import { getServicePath, isReservedServiceSlug, resolveServiceSlug } from '@/lib/serviceRoutes';
import ServicePreviewSurface from '@/components/service/ServicePreviewSurface';
import ServiceDetailTracker from '@/components/service/ServiceDetailTracker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr';

const getDb = () => supabaseAdmin || supabase;

const getActiveServices = cache(async () => {
  if (isDummyMode || !getDb()) {
    return DUMMY_SERVICE_PRODUCTS.map((service, index) => ({
      ...service,
      subtitle: service.subtitle || '',
      description: service.description || service.desc || '',
      icon: service.icon || 'Target',
      order_num: index,
      is_active: true,
      details: service.details || { status: 'published' },
    }));
  }

  const { data, error } = await getDb()
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('order_num', { ascending: true });

  if (error) {
    console.error('[service-root] services fetch failed:', error.message);
    return [];
  }
  return data || [];
});

const getLandingSettings = cache(async () => {
  if (isDummyMode || !getDb()) return DUMMY_SETTINGS;
  const { data, error } = await getDb().from('landing_settings').select('*').maybeSingle();
  if (error) return DUMMY_SETTINGS;
  return data || DUMMY_SETTINGS;
});

function findServiceByRequestedSlug(services, requestedSlug) {
  const normalized = resolveServiceSlug(requestedSlug);
  return services.find((service) => {
    const serviceSlug = resolveServiceSlug(service.slug);
    return service.slug === requestedSlug || serviceSlug === normalized;
  }) || null;
}

const getServiceByRequestedSlug = cache(async (requestedSlug) => {
  if (isReservedServiceSlug(requestedSlug)) return null;
  const services = await getActiveServices();
  return findServiceByRequestedSlug(services, requestedSlug);
});

function getRelatedMagazineSlugs(service) {
  const details = service?.details || {};
  const blockSlugs = Array.isArray(details.blocks)
    ? details.blocks
      .filter((block) => block?.type === 'related_magazine' && block.is_visible !== false && block.magazine_slug)
      .map((block) => block.magazine_slug)
    : [];
  return [...new Set([details.related_magazine_slug, ...blockSlugs].filter(Boolean))];
}

const getRelatedMagazines = cache(async (service) => {
  const relSlugs = getRelatedMagazineSlugs(service);
  if (relSlugs.length === 0 || !getDb()) return [];

  const { data, error } = await getDb()
    .from('magazines')
    .select('slug,title,thumbnail_url,category,status')
    .in('slug', relSlugs)
    .eq('status', 'published');

  if (error) return [];
  return data || [];
});

const PLACE_MARKETING_FAQ_JSON_LD = {
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
};

function getServiceFaqJsonLd(service) {
  return resolveServiceSlug(service?.slug) === 'placemarketing' ? PLACE_MARKETING_FAQ_JSON_LD : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await getServiceByRequestedSlug(slug);

  if (!service) {
    return {
      title: '서비스를 찾을 수 없습니다 | GIVENEEDS',
      robots: { index: false, follow: false },
    };
  }

  const seo = getServiceSeo(service);

  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.path },
    openGraph: {
      type: 'website',
      siteName: 'GIVENEEDS',
      locale: 'ko_KR',
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.path,
      ...(seo.ogImage ? { images: [{ url: seo.ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    robots: {
      index: seo.index,
      follow: seo.follow,
      googleBot: {
        index: seo.index,
        follow: seo.follow,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  };
}

export default async function RootServiceDetailPage({ params }) {
  const { slug } = await params;
  const service = await getServiceByRequestedSlug(slug);

  if (!service) notFound();

  const canonicalPath = getServicePath(service.slug);
  if (`/${slug}` !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const [settings, relatedMagazines] = await Promise.all([
    getLandingSettings(),
    getRelatedMagazines(service),
  ]);
  const relSlugs = getRelatedMagazineSlugs(service);
  const primarySlug = service.details?.related_magazine_slug || relSlugs[0];
  const relatedMagazine = relatedMagazines.find((magazine) => magazine.slug === primarySlug) || relatedMagazines[0] || null;
  const jsonLd = getServiceJsonLd(service, SITE_URL);
  const faqJsonLd = getServiceFaqJsonLd(service);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <ServiceDetailTracker service={service} />
      <ServicePreviewSurface
        service={service}
        settings={settings}
        relatedMagazine={relatedMagazine}
        preview={false}
        previewData={{ magazines: relatedMagazines }}
      />
    </>
  );
}
