'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { isAdminPath, metaPageview, META_PIXEL_ID } from '@/lib/analytics/metaPixel';

function runWhenPageSettles(callback) {
  if (typeof window === 'undefined') return () => {};
  let timeoutId;
  let idleId;

  const run = () => {
    timeoutId = window.setTimeout(callback, 2500);
  };

  if (document.readyState === 'complete') {
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 3000 });
    } else {
      run();
    }
  } else {
    window.addEventListener('load', run, { once: true });
  }

  return () => {
    window.removeEventListener('load', run);
    if (timeoutId) window.clearTimeout(timeoutId);
    if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
  };
}

function MetaPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef('');

  useEffect(() => {
    if (!META_PIXEL_ID || !pathname || isAdminPath(pathname)) return;

    const queryString = searchParams?.toString();
    const url = pathname + (queryString ? `?${queryString}` : '');
    if (url === lastTrackedUrl.current) return;

    lastTrackedUrl.current = url;
    return runWhenPageSettles(metaPageview);
  }, [pathname, searchParams]);

  return null;
}

export default function MetaPixel() {
  if (!META_PIXEL_ID) return null;

  return (
    <Suspense fallback={null}>
      <MetaPageTracker />
    </Suspense>
  );
}
