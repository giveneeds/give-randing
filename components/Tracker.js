'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  getAnonymousId,
  isNewSession,
  startSession,
  trackEvent,
  captureUtm,
  touchSession,
} from '@/lib/tracker';

export default function Tracker() {
  const pathname = usePathname();
  const initialized = useRef(false);
  const prevPath = useRef(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      getAnonymousId();
      captureUtm();
      if (isNewSession()) {
        await startSession();
      } else {
        touchSession();
      }
      trackEvent('page_view', {
        url: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      });
      prevPath.current = window.location.pathname;
    })();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    if (isNewSession()) {
      startSession().then(() => {
        trackEvent('page_view', { url: pathname, title: document.title });
      });
    } else {
      touchSession();
      trackEvent('page_view', { url: pathname, title: document.title });
    }
  }, [pathname]);

  return null;
}
