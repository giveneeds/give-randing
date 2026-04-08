'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageCircle, AlertCircle } from 'lucide-react';
import { signInWithKakao } from '@/lib/authKakao';

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || searchParams.get('next') || '/chat';
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (errorParam === 'callback') {
      setError('인증 처리 중 문제가 발생했어요. 다시 시도해 주세요.');
    }
  }, [errorParam]);

  const handleKakao = async () => {
    setError('');
    setLoading(true);
    const { ok, error: errMsg } = await signInWithKakao(redirectTo);
    if (!ok) {
      setError(errMsg || '카카오 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Brand Side */}
        <div className="hidden lg:flex bg-zinc-900 text-white p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <Link href="/" className="text-xl font-black tracking-tight relative z-10">GIVENEEDS</Link>
          <div className="relative z-10">
            <h2 className="text-5xl font-black tracking-tighter leading-[1.05] mb-6">
              마케팅의 모든 인사이트,<br />
              <span className="text-zinc-500">한 곳에서.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              카카오 계정 한 번이면 프리미엄 매거진과 AI 마케팅 진단을
              모두 무료로 이용할 수 있어요.
            </p>
          </div>
          <div className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase relative z-10">
            © 2026 Giveneeds. All rights reserved.
          </div>
        </div>

        {/* Form Side */}
        <div className="flex items-center justify-center p-5 sm:p-10 lg:p-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-10 text-center">
              <Link href="/" className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                GIVENEEDS
              </Link>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mb-2">
                다시 만나서 반가워요
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                카카오 계정으로 3초 만에 로그인하세요.
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2"
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

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
                  카카오로 3초 만에 로그인
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-zinc-400 mt-6 leading-relaxed">
              로그인 시 GIVENEEDS 서비스 이용약관 및 개인정보 처리방침에<br />동의하게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-zinc-400 uppercase tracking-widest">Loading</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
