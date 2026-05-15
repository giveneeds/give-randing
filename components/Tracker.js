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
  setSkipTracking,
  clearSkipTracking,
} from '@/lib/tracker';
import { supabase } from '@/lib/supabase';
import { hasAdminTagCookie, isBotUserAgent } from '@/lib/botFilter';

// 어드민 트래픽은 분석 통계에서 제외해야 함:
// 1) /admin/* 경로 — admin이든 일반이든 어드민 페이지 방문은 무시
// 2) 로그인된 사용자가 admin/superadmin role이면 — 사이트 어디를 가도 무시
function isAdminPath(path) {
  return !!path && path.startsWith('/admin');
}

async function fetchUserRole() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return data?.role || null;
  } catch {
    return null;
  }
}

function isAdminRole(role) {
  return role === 'admin' || role === 'superadmin';
}

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
  // 한 번 결정되면 세션 동안 유지: admin/superadmin 사용자는 모든 트래킹 스킵
  const skipUser = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // 0) 빠른 차단 — role fetch 안 기다리고 즉시 결정:
      //    (a) 어드민 마커 쿠키가 있는 디바이스 (한 번이라도 어드민 로그인한 적 있음)
      //    (b) 봇/링크 프리뷰 UA (카톡·슬랙·디스코드 unfurl 등)
      if (hasAdminTagCookie()) {
        skipUser.current = true;
        setSkipTracking('admin_tag');
        return;
      }
      if (isBotUserAgent(navigator.userAgent || '')) {
        skipUser.current = true;
        setSkipTracking('bot');
        return;
      }

      // 1) 로그인 사용자의 role 확인 → admin/superadmin이면 이 탭 전체 트래킹 스킵
      //    sessionStorage 플래그로 저장해서 매거진/CTA 등 ad-hoc trackEvent도 자동 스킵.
      const role = await fetchUserRole();
      if (isAdminRole(role)) {
        skipUser.current = true;
        setSkipTracking(role);
        return;
      }
      // admin이 아닐 때는 이전 탭/세션이 남긴 잔여 스킵 플래그를 명시적으로 해제.
      clearSkipTracking();

      // 2) 현재 경로가 /admin/* 이면 이 진입은 무시 (다음 일반 페이지 진입부터 추적)
      if (isAdminPath(window.location.pathname)) {
        prevPath.current = window.location.pathname;
        return;
      }

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

    // admin/superadmin 사용자 또는 /admin/* 경로 방문은 분석에서 제외
    if (skipUser.current || isAdminPath(pathname)) return;

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
