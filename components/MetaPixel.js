'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { isAdminPath, metaPageview, META_PIXEL_ID } from '@/lib/analytics/metaPixel';
import useThirdPartyGate from '@/lib/useThirdPartyGate';


function MetaPageTracker({ enabled }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef('');

  useEffect(() => {
    if (!enabled || !META_PIXEL_ID || !pathname || isAdminPath(pathname)) return;

    const queryString = searchParams?.toString();
    const url = pathname + (queryString ? `?${queryString}` : '');
    if (url === lastTrackedUrl.current) return;

    lastTrackedUrl.current = url;
    metaPageview();
  }, [enabled, pathname, searchParams]);

  return null;
}

export default function MetaPixel() {
  const thirdPartyReady = useThirdPartyGate({ fallbackDelay: 10000 });

  if (!META_PIXEL_ID) return null;
  if (!thirdPartyReady) return null;
  return (
    <Suspense fallback={null}>
      <MetaPageTracker enabled={thirdPartyReady} />
    </Suspense>
  );
}
