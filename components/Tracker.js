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
import { supabase } from '@/lib/supabase';

async function getKakaoMeta() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const m = user.user_metadata || {};
    return {
      user_id: user.id,
      kakao_name: m.name || m.nickname || m.full_name || null,
      kakao_phone: m.phone_number
        || m.kakao_account?.phone_number
        || m.phone
        || null,
    };
  } catch {
    return {};
  }
}

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
        const kakaoMeta = await getKakaoMeta();
        await startSession(kakaoMeta);
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
      getKakaoMeta().then(kakaoMeta =>
        startSession(kakaoMeta).then(() => {
          trackEvent('page_view', { url: pathname, title: document.title });
        })
      );
    } else {
      touchSession();
      trackEvent('page_view', { url: pathname, title: document.title });
    }
  }, [pathname]);

  return null;
}
