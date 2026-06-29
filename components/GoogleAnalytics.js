'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { GA_MEASUREMENT_ID, pageview } from '@/lib/analytics/ga4';
import { isAdminOrPreviewPath } from '@/lib/adminPreviewPaths';
import useThirdPartyGate from '@/lib/useThirdPartyGate';

/**
 * GA4 스크립트 주입 + SPA 라우트 변경 시 페이지뷰 자동 전송.
 *
 * - 측정 ID(NEXT_PUBLIC_GA_MEASUREMENT_ID)가 없으면 아무것도 렌더링하지 않음 — 개발/PR 환경에서 안전.
 * - 첫 스크롤/터치/클릭/키 입력 이후, 또는 로드 후 10초 뒤 로드해 모바일 초기 렌더 부담을 낮춘다.
 * - usePathname() 변화를 useEffect 로 감지해 pageview() 호출.
 *
 * Setup: docs/SETUP_GA4.md
 */
function GAPageTracker({ enabled }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!enabled || !pathname) return;
    if (isAdminOrPreviewPath(pathname)) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    pageview(url);
  }, [enabled, pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const thirdPartyReady = useThirdPartyGate({ fallbackDelay: 10000 });

  if (!GA_MEASUREMENT_ID) return null;
  if (isAdminOrPreviewPath(pathname)) return null;
  if (!thirdPartyReady) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
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
        <GAPageTracker enabled={ready} />
      </Suspense>
    </>
  );
}
