// 서버 layout — /for-you/[slug] 의 사례별 고유 metadata 를 DB(case_studies)에서 생성.
// 본문 페이지는 client 컴포넌트라 generateMetadata 를 여기서 담당한다.

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let item = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('case_studies')
      .select('title, excerpt, client_name, slug')
      .eq('slug', slug)
      .maybeSingle();
    item = data;
  }

  const name = item?.title || '클라이언트 사례';
  const title = `${name} | 광고 대행사 기브니즈`;
  const description =
    item?.excerpt ||
    `${name} — 데이터 기반 종합 광고 대행사 기브니즈가 진행한 마케팅 클라이언트 사례입니다.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/for-you/${slug}` },
    openGraph: { title, description, url: `/for-you/${slug}` },
  };
}

export default function ForYouSlugLayout({ children }) {
  return children;
}
