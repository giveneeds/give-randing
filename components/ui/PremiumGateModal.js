'use client';
import { Lock } from 'lucide-react';
import { supabase, isDummyMode } from '@/lib/supabase';

export default function PremiumGateModal({ slug }) {
  async function handleKakaoLogin() {
    if (isDummyMode || !supabase) {
      alert('현재 환경에서는 카카오 로그인이 비활성화되어 있습니다.');
      return;
    }
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/magazine/${slug}`
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo },
    });
    if (error) alert('로그인 실패: ' + error.message);
  }

  const loginHref = typeof window !== 'undefined'
    ? `/login?redirect=${encodeURIComponent(`/magazine/${slug}`)}`
    : '/login';
  const signupHref = typeof window !== 'undefined'
    ? `/signup?redirect=${encodeURIComponent(`/magazine/${slug}`)}`
    : '/signup';

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      style={{ padding: '12px', boxSizing: 'border-box' }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[300px] sm:max-w-md p-5 sm:p-10 text-center border border-zinc-200 dark:border-zinc-800 mx-auto">
        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center mx-auto mb-3 sm:mb-6">
          <Lock size={15} className="text-white dark:text-zinc-900 sm:hidden" />
          <Lock size={22} className="text-white dark:text-zinc-900 hidden sm:block" />
        </div>
        <div className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em] text-zinc-400 uppercase mb-1.5 sm:mb-3">Premium Archive</div>
        <h3 className="text-sm sm:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white mb-1.5 sm:mb-3 break-keep leading-tight">
          이 콘텐츠는<br />프리미엄 매거진입니다
        </h3>
        <p className="text-[11px] sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 sm:mb-8">
          로그인하고 모든 프리미엄<br className="sm:hidden" /> 콘텐츠를 무료로 열람하세요.
        </p>

        {/* 회원가입 (메인 CTA) */}
        <a
          href={signupHref}
          className="block w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-2.5 sm:py-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm transition-all active:scale-[0.98] mb-1.5 sm:mb-2"
        >
          무료 회원가입하고 열람하기
        </a>

        {/* 이메일 로그인 (보조) */}
        <a
          href={loginHref}
          className="block w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-black py-2.5 sm:py-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm transition-all active:scale-[0.98] mb-1.5 sm:mb-2"
        >
          이메일로 로그인
        </a>

        {/* 카카오 로그인 (보조) */}
        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-black py-2.5 sm:py-4 rounded-lg sm:rounded-xl text-[11px] sm:text-sm transition-colors active:scale-[0.98]"
        >
          <KakaoIcon /> 카카오로 계속하기
        </button>

        <p className="text-[8px] sm:text-[10px] text-zinc-400 mt-2.5 sm:mt-4 leading-relaxed">
          로그인 시 GIVENEEDS 서비스 이용약관 및<br className="sm:hidden" /> 개인정보 처리방침에 동의하게 됩니다.
        </p>

        {/* 뒤로가기 — 가볍게 빠져나가기 */}
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            if (window.history.length > 1) window.history.back();
            else window.location.href = '/magazine';
          }}
          className="mt-3 sm:mt-5 text-[10px] sm:text-[11px] font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors"
        >
          지금은 배울 시간이 없어요
        </button>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.79 1.846 5.235 4.628 6.604l-1.17 4.276c-.103.378.327.677.658.456l5.13-3.39c.25.014.5.024.754.024 5.523 0 10-3.477 10-7.97C22 6.477 17.523 3 12 3z"
        fill="#191919"
      />
    </svg>
  );
}
