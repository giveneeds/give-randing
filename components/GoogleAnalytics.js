'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { GA_MEASUREMENT_ID, pageview } from '@/lib/analytics/ga4';

/**
 * GA4 스크립트 주입 + SPA 라우트 변경 시 페이지뷰 자동 전송.
 *
 * - 측정 ID(NEXT_PUBLIC_GA_MEASUREMENT_ID)가 없으면 아무것도 렌더링하지 않음 — 개발/PR 환경에서 안전.
 * - Script strategy="afterInteractive" 로 LCP 영향 최소화.
 * - usePathname() 변화를 useEffect 로 감지해 pageview() 호출.
 *
 * Setup: docs/SETUP_GA4.md
 */
function GAPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GAPageTracker />
      </Suspense>
    </>
  );
}
