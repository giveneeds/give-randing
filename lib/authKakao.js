'use client';

import { supabase, isDummyMode } from '@/lib/supabase';
import { getSafeAuthRedirect, saveAuthRedirect, inferCurrentPath } from '@/lib/authRedirect';

/**
 * Kakao OAuth 로그인 트리거.
 * Supabase Provider(Kakao)를 사용하며, 인증 후 /auth/callback 으로 돌아옴.
 *
 * 목적지(next) 결정 우선순위:
 *   1) 호출자가 명시한 next
 *   2) 현재 페이지 (window.location.pathname + search)
 *   3) '/' (로그인/콜백 페이지에서 호출되어 현재 경로가 사용 불가일 때)
 *
 * 견고성을 위해 next 를 두 채널로 운반한다:
 *   - localStorage (`giveneeds.auth.next`) — 같은 오리진 유지 시 가장 단순한 경로
 *   - redirectTo URL 의 ?next= 쿼리 — localStorage 가 막혀도 콜백이 복구
 *
 * @param {string=} next - 명시적 다음 경로. 미지정 시 현재 페이지로.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function signInWithKakao(next) {
  if (isDummyMode || !supabase) {
    return { ok: false, error: '현재 환경에서는 로그인이 비활성화되어 있습니다.' };
  }
  if (typeof window === 'undefined') {
    return { ok: false, error: '브라우저 환경에서만 호출 가능합니다.' };
  }

  const fallback = inferCurrentPath();
  const safeNext = getSafeAuthRedirect(next, fallback);
  saveAuthRedirect(safeNext);

  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo },
    });
    if (error) throw error;
    // 성공 시 브라우저가 카카오 로그인 페이지로 리다이렉트되므로 이 함수는 사실상 반환되지 않음.
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || '카카오 로그인 중 오류가 발생했습니다.' };
  }
}
