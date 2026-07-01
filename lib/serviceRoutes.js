const RESERVED_ROOT_SLUGS = new Set([
  'admin',
  'api',
  'appleicon',
  'apple-icon',
  'auth',
  'chat',
  'contact',
  'for-you',
  'foryou',
  'icon',
  'kakao-token',
  'kakaotoken',
  'landing',
  'login',
  'magazine',
  'opengraph-image',
  'opengraphimage',
  'service',
  'signup',
  'sitemap',
  'robots',
  '428place',
]);

const LEGACY_SERVICE_SLUG_ALIASES = new Map([
  ['placeoptimize', 'placemarketing'],
]);

export function normalizeServiceSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/\s+/g, '');
}

export function resolveServiceSlug(value = '') {
  const normalized = normalizeServiceSlug(value);
  return LEGACY_SERVICE_SLUG_ALIASES.get(normalized) || normalized;
}

export function isReservedServiceSlug(value = '') {
  return RESERVED_ROOT_SLUGS.has(normalizeServiceSlug(value)) || RESERVED_ROOT_SLUGS.has(String(value).trim().toLowerCase());
}

export function getServicePath(slug = '') {
  const normalized = resolveServiceSlug(slug);
  return normalized ? `/${normalized}` : '/service';
}

export function buildServiceRedirectPath(slug = '') {
  return getServicePath(slug);
}
