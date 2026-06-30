import { supabase } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr';
const SITE_NAME = 'GIVENEEDS 마케팅 인사이트 매거진';
const SITE_DESC = '기브니즈 매거진에서 마케팅 대행사 실무자가 정리한 광고, 검색 노출, 리뷰 관리, 콘텐츠 전략, AI 마케팅 인사이트를 확인하세요.';

function escapeXml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  let posts = [];

  if (supabase) {
    const { data } = await supabase
      .from('magazines')
      .select('slug, title, excerpt, content_html, category, thumbnail_url, created_at, updated_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    posts = data || [];
  }

  const items = posts.map((post) => {
    const url = `${SITE_URL}/magazine/${post.slug}`;
    const description = post.excerpt || stripHtml(post.content_html || '').slice(0, 200);
    const pubDate = new Date(post.created_at).toUTCString();
    const image = post.thumbnail_url
      ? `<enclosure url="${escapeXml(post.thumbnail_url)}" type="image/jpeg" />`
      : '';

    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ''}
      ${image}
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}/magazine</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/opengraph-image.png</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${SITE_URL}/magazine</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
