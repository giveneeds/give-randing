'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, isDummyMode } from '@/lib/supabase';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (isDummyMode || !supabase) {
      setError('현재 환경에서는 로그인이 비활성화되어 있습니다.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(redirectTo);
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (err) throw err;
        setInfo('이메일로 인증 링크가 발송되었습니다. 메일함을 확인해 주세요.');
      }
    } catch (err) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakao = async () => {
    if (isDummyMode || !supabase) {
      setError('현재 환경에서는 카카오 로그인이 비활성화되어 있습니다.');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${origin}${redirectTo}` },
    });
    if (err) setError('카카오 로그인 실패: ' + err.message);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* 좌우 2단 — 모바일에선 단순 1단 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Brand Side (데스크탑 전용) */}
        <div className="hidden lg:flex bg-zinc-900 text-white p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <Link href="/" className="text-xl font-black tracking-tight relative z-10">GIVENEEDS</Link>
          <div className="relative z-10">
            <h2 className="text-5xl font-black tracking-tighter leading-[1.05] mb-6">
              마케팅의 모든 인사이트,<br />
              <span className="text-zinc-500">한 곳에서.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              로그인하고 프리미엄 매거진과 AI 마케팅 진단을
              모두 무료로 이용해 보세요.
            </p>
          </div>
          <div className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase relative z-10">
            © 2026 Giveneeds. All rights reserved.
          </div>
        </div>

        {/* Form Side */}
        <div className="flex items-center justify-center p-5 sm:p-10 lg:p-16">
          <div className="w-full max-w-md">
            {/* 모바일 상단 브랜드 */}
            <div className="lg:hidden mb-10 text-center">
              <Link href="/" className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                GIVENEEDS
              </Link>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mb-2">
                {mode === 'signin' ? '다시 만나서 반가워요' : '계정 만들기'}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'signin'
                  ? '이메일로 로그인하거나 카카오 계정으로 계속하세요.'
                  : '간단한 정보로 무료 계정을 만들어 보세요.'}
              </p>
            </div>

            {/* 알림 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold"
                >
                  {error}
                </motion.div>
              )}
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-start gap-2"
                >
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  <span>{info}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-4 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? '로그인' : '회원가입'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">또는</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Kakao */}
            <button
              type="button"
              onClick={handleKakao}
              className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-black py-4 rounded-xl text-sm transition-colors active:scale-[0.98]"
            >
              <KakaoIcon /> 카카오로 계속하기
            </button>

            {/* Mode toggle */}
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-8">
              {mode === 'signin' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
                className="ml-2 font-black text-zinc-900 dark:text-white underline underline-offset-2"
              >
                {mode === 'signin' ? '회원가입' : '로그인'}
              </button>
            </p>

            <p className="text-center text-[10px] text-zinc-400 mt-6 leading-relaxed">
              로그인 시 GIVENEEDS 서비스 이용약관 및 개인정보 처리방침에<br />동의하게 됩니다.
            </p>
          </div>
        </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-zinc-400 uppercase tracking-widest">Loading</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
