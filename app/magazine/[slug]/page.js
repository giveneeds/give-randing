import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import MagazineDetailClient from './MagazineDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr';

function stripHtml(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDescription(post) {
  const raw = post?.excerpt || stripHtml(post?.content_html || '');
  const fallback =
    '기브니즈 매거진의 마케팅 전략 콘텐츠입니다. 광고, 검색 노출, 콘텐츠, 리뷰 관리와 전환 최적화 인사이트를 확인하세요.';
  return (raw || fallback).slice(0, 155);
}

async function getMagazineBySlug(slug) {
  if (!slug) return null;
  if (isDummyMode) return DUMMY_MAGAZINES.find((m) => m.slug === slug) || null;
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('magazines')
    .select('slug,title,excerpt,content_html,category,thumbnail_url,created_at,updated_at,status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getMagazineBySlug(slug);

  if (!post) {
    return {
      title: '매거진 콘텐츠',
      description: '기브니즈 마케팅 인사이트 매거진 콘텐츠입니다.',
      alternates: { canonical: `/magazine/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const title = `${post.title} | 마케팅 인사이트`;
  const description = toDescription(post);
  const url = `${SITE_URL}/magazine/${post.slug}`;

  return {
    title,
    description,
    keywords: [
      post.category,
      '기브니즈',
      '마케팅 대행사',
      '디지털 마케팅',
      '마케팅 인사이트',
      '광고 전략',
    ].filter(Boolean),
    alternates: {
      canonical: `/magazine/${post.slug}`,
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'GIVENEEDS',
      locale: 'ko_KR',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      section: post.category || 'Marketing',
      images: post.thumbnail_url
        ? [{ url: post.thumbnail_url, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.thumbnail_url ? [post.thumbnail_url] : undefined,
    },
  };
}

export default function Page() {
  return <MagazineDetailClient />;
}
