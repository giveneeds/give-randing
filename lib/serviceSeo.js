import { getServicePath } from '@/lib/serviceRoutes';

const SITE_NAME = 'GIVENEEDS';
const DEFAULT_SERVICE_DESCRIPTION =
  '데이터 기반 종합 광고 대행사 기브니즈가 제공하는 마케팅 대행 서비스입니다.';

function stripMarkdown(value = '') {
  return String(value)
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clipSeoText(value = '', max = 155) {
  const text = stripMarkdown(value);
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd();
}

export function getServiceSeo(service = {}) {
  const details = service?.details && typeof service.details === 'object' ? service.details : {};
  const seo = details.seo && typeof details.seo === 'object' ? details.seo : {};
  const name = service?.title || '서비스';
  const path = getServicePath(service?.slug || '');

  const h1 = seo.h1 || name;
  const title = seo.title || `${h1} | 데이터 기반 광고 대행사 기브니즈`;
  const description = clipSeoText(
    seo.description || service?.description || service?.subtitle || `${name} — ${DEFAULT_SERVICE_DESCRIPTION}`
  );
  const ogTitle = seo.ogTitle || title;
  const ogDescription = clipSeoText(seo.ogDescription || description);
  const keywords = Array.isArray(seo.keywords)
    ? seo.keywords.filter(Boolean)
    : String(seo.keywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    title,
    description,
    h1,
    ogTitle,
    ogDescription,
    ogImage: seo.ogImage || '',
    keywords,
    index: seo.index !== false,
    follow: seo.follow !== false,
    sitemap: seo.sitemap !== false,
    structuredName: seo.structuredName || h1,
    structuredDescription: clipSeoText(seo.structuredDescription || description, 240),
    path,
    absolutePath: path,
  };
}

export function getServiceJsonLd(service = {}, siteUrl = '') {
  const seo = getServiceSeo(service);
  const url = `${siteUrl}${seo.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: seo.structuredName,
    description: seo.structuredDescription,
    url,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
    areaServed: {
      '@type': 'Country',
      name: 'KR',
    },
    serviceType: service?.category || 'Marketing',
  };
}
