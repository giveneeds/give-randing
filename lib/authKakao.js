'use client';

import { supabase, isDummyMode } from '@/lib/supabase';

/**
 * Kakao OAuth 로그인 트리거.
 * Supabase Provider(Kakao)를 사용하며, 인증 후 /auth/callback?next=... 으로 돌아옴.
 *
 * @param {string} next - 인증 성공 후 이동할 경로 (예: '/chat')
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function signInWithKakao(next = '/chat') {
  if (isDummyMode || !supabase) {
    return { ok: false, error: '현재 환경에서는 로그인이 비활성화되어 있습니다.' };
  }
  if (typeof window === 'undefined') {
    return { ok: false, error: '브라우저 환경에서만 호출 가능합니다.' };
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
