'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, Lock as LockIcon, MessageCircle } from 'lucide-react';
import { signInWithKakao } from '@/lib/authKakao';
import PrivacyPolicyDisclosure from '@/components/auth/PrivacyPolicyDisclosure';

/**
 * 배경 블러 위에 띄우는 로그인 모달.
 * 카카오 로그인 단일 — 클릭 시 Supabase OAuth로 이동 → /auth/callback에서 세션 수립.
 */
export default function LoginModal({
  open,
  onClose,
  redirectPath,
  title = '로그인이 필요해요',
  description = '카카오 계정 한 번이면 끝나요. 별도 가입 절차도, 비밀번호도 필요 없어요.',
  dismissible = true,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleKakao = async () => {
    setError('');
    setLoading(true);
    // redirectPath 가 명시되지 않으면 signInWithKakao 가 현재 페이지를 추론
    const { ok, error: errMsg } = await signInWithKakao(redirectPath);
    if (!ok) {
      setError(errMsg || '카카오 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
    // 성공 시엔 브라우저가 리다이렉트되므로 여기 도달하지 않음.
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* 블러 배경 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={dismissible ? onClose : undefined}
      />

      {/* 카드 */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center mb-4">
          <LockIcon size={18} className="text-white dark:text-zinc-900" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white mb-1.5">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          {description}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleKakao}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-[#FEE500] hover:bg-[#FFEB3B] text-[#191919] font-black py-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <MessageCircle size={18} fill="#191919" />
              카카오로 3초 만에 시작하기
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-zinc-400 mt-5 leading-relaxed">
          로그인 시 GIVENEEDS 서비스 이용약관 및 개인정보 처리방침에
          <br />
          동의하게 됩니다.
        </p>

        <PrivacyPolicyDisclosure />
      </div>
    </div>
  );
}
