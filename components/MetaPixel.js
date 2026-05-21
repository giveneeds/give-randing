'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { isAdminPath, metaPageview, META_PIXEL_ID } from '@/lib/analytics/metaPixel';

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
    metaPageview();
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
