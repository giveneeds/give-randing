import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import { getServicePath } from '@/lib/serviceRoutes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr';

// 1시간마다 재생성
export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();

  const staticEntries = [
    { url: `${SITE_URL}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${SITE_URL}/magazine`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${SITE_URL}/service`, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${SITE_URL}/for-you`, priority: 0.8, changeFrequency: 'weekly' },
    { url: `${SITE_URL}/contact`, priority: 0.7, changeFrequency: 'monthly' },
  ].map((e) => ({ ...e, lastModified: now }));

  const [magazines, services, cases] = await Promise.all([
    fetchSlugs('magazines', { filter: (q) => q.eq('status', 'published') }),
    fetchSlugs('services', { filter: (q) => q.eq('is_active', true) }),
    fetchSlugs('case_studies', { filter: (q) => q.eq('status', 'published') }),
  ]);

  const dynamicEntries = [
    ...magazines.map((m) => ({
      url: `${SITE_URL}/magazine/${m.slug}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
    ...services.map((s) => ({
      url: `${SITE_URL}${getServicePath(s.slug)}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : now,
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
    ...cases.map((c) => ({
      url: `${SITE_URL}/for-you/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}

async function fetchSlugs(table, { filter } = {}) {
  if (isDummyMode) {
    if (table === 'magazines') {
      return DUMMY_MAGAZINES.filter((m) => m.status === 'published');
    }
    return [];
  }
  try {
    let query = supabase.from(table).select(table === 'services' ? 'slug, updated_at, details' : 'slug, updated_at');
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).filter((r) => r.slug && (table !== 'services' || r.details?.seo?.sitemap !== false));
  } catch {
    return [];
  }
}
