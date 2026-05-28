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

export default function ServiceSlugLayout({ children }) {
  return children;
}
