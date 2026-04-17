'use client';
import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getAnonymousId,
  isNewSession,
  startSession,
  trackEvent,
  captureUtm,
  touchSession,
  getSessionId,
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

// 현재 세션에 카카오 신원 정보를 소급 업데이트
async function patchSessionIdentity(sessionId, kakaoMeta) {
  if (!sessionId || !kakaoMeta.kakao_name) return;
  try {
    await fetch(`/api/events/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kakaoMeta),
    });
  } catch {
    // silent
  }
}

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const prevPath = useRef(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      getAnonymousId();
      captureUtm();
      if (isNewSession()) {
        // 중복 세션 방지: async 호출 전에 먼저 touchSession()
        touchSession();
        const kakaoMeta = await getKakaoMeta();
        await startSession(kakaoMeta);
      } else {
        touchSession();
        // 이미 로그인된 상태라면 기존 세션에 신원 소급 패치
        const sessionId = getSessionId();
        if (sessionId) {
          getKakaoMeta().then(meta => patchSessionIdentity(sessionId, meta));
        }
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

    // welcome=1 파라미터 = 카카오 로그인 직후 리다이렉트 → 신규 세션 강제
    const isWelcome = searchParams?.get('welcome') === '1';

    if (isNewSession() || isWelcome) {
      touchSession(); // 중복 세션 방지
      getKakaoMeta().then(kakaoMeta =>
        startSession(kakaoMeta).then(() => {
          trackEvent('page_view', { url: pathname, title: document.title });
        })
      );
    } else {
      touchSession();
      trackEvent('page_view', { url: pathname, title: document.title });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function Tracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
