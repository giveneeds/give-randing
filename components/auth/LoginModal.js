'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, X, Lock as LockIcon } from 'lucide-react';
import { supabase, isDummyMode } from '@/lib/supabase';

/**
 * 배경 블러 위에 띄우는 로그인 모달.
 * /login 페이지의 이메일/비밀번호 로직을 재사용.
 * 회원가입 필요 시 /signup으로 이동 (redirect 파라미터 포함).
 */
export default function LoginModal({
  open,
  onClose,
  onSuccess,
  redirectPath,
  title = '로그인이 필요해요',
  description = '이 기능은 로그인하신 분만 이용하실 수 있어요. 가입은 이메일만 있으면 30초면 끝나요.',
  dismissible = true,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식으로 입력해 주세요. (예: name@example.com)');
      return;
    }

    if (isDummyMode || !supabase) {
      setError('현재 환경에서는 로그인이 비활성화되어 있습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const signupHref = redirectPath
    ? `/signup?redirect=${encodeURIComponent(redirectPath)}`
    : '/signup';

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

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="email"
              required
              pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
              title="이메일은 반드시 @ 형식이어야 합니다"
              placeholder="이메일 (예: name@example.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="password"
              required
              minLength={6}
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (<>로그인 <ArrowRight size={16} /></>)}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
          아직 계정이 없으신가요?
          <Link
            href={signupHref}
            className="ml-2 font-black text-zinc-900 dark:text-white underline underline-offset-2"
          >
            30초 무료 가입
          </Link>
        </p>
      </div>
    </div>
  );
}
