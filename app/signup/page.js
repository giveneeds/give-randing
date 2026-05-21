'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  Sparkles,
  BookOpen,
  Gift,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { signInWithKakao } from '@/lib/authKakao';
import { inferReferrerPath } from '@/lib/authRedirect';
import PrivacyPolicyDisclosure from '@/components/auth/PrivacyPolicyDisclosure';
import BrandLoader from '@/components/ui/BrandLoader';

const BENEFITS = [
  {
    icon: Sparkles,
    title: '기브니즈 라이트 AI 마케팅 전략',
    desc:
      '내 업장 정보만 입력하면 즉시 받아보는 AI 전략 리포트. 더 깊이 파고들고 싶다면 기브니즈 오토마케팅 AI로 자연스럽게 확장할 수 있어요.',
    tag: 'FREE · 회원 전용',
  },
  {
    icon: BookOpen,
    title: '내 업장에 맞는 마케팅 매거진 무제한',
    desc:
      '업종별 실전 칼럼, 캠페인 케이스, 카피라이팅 가이드까지 — 프리미엄 매거진을 회원이라면 전부 무료로 열람할 수 있어요.',
    tag: 'Premium Archive',
  },
  {
    icon: Gift,
    title: '도움되는 정보와 무료 툴, 계속 받아보기',
    desc:
      '신규 마케팅 툴, 업데이트되는 진단 리포트, 한정 가이드북까지 — 가입자분들에게만 정기적으로 보내드려요.',
    tag: 'Members Only',
  },
];

function SignupPageInner() {
  const searchParams = useSearchParams();
  // /signup 진입 시 redirect 추론. 파라미터 → referrer → '/' 순으로 폴백.
  const [redirectTo, setRedirectTo] = useState(() => {
    return searchParams.get('redirect') || searchParams.get('next') || '/';
  });
  useEffect(() => {
    const explicit = searchParams.get('redirect') || searchParams.get('next');
    if (explicit) return;
    const ref = inferReferrerPath();
    if (ref) setRedirectTo(ref);
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        {/* Brand / Benefits Side */}
        <div className="hidden lg:flex bg-zinc-900 text-white p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <Link href="/" className="text-xl font-black tracking-tight relative z-10">
            GIVENEEDS
          </Link>

          <div className="relative z-10 my-10">
            <div className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase mb-4">
              Why Join Giveneeds
            </div>
            <h2 className="text-4xl xl:text-5xl font-black tracking-tighter leading-[1.05] mb-10">
              마케팅 고민의 답,<br />
              <span className="text-zinc-500">카카오 한 번이면 충분해요.</span>
            </h2>

            <ul className="space-y-6 max-w-md">
              {BENEFITS.map((b, i) => {
                const Icon = b.icon;
                return (
                  <li key={i} className="flex gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-1">
                        {b.tag}
                      </div>
                      <h3 className="text-base font-black tracking-tight text-white mb-1">
                        {b.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{b.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase relative z-10">
            © 2026 Giveneeds. All rights reserved.
          </div>
        </div>

        {/* Form Side */}
        <div className="flex items-center justify-center p-5 sm:p-10 lg:p-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 text-center">
              <Link
                href="/"
                className="text-lg font-black tracking-tight text-zinc-900 dark:text-white"
              >
                GIVENEEDS
              </Link>
            </div>

            <div className="mb-7">
              <div className="text-[10px] font-black tracking-[0.25em] text-zinc-400 uppercase mb-2">
                Create your account
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mb-2">
                3초 만에 시작하고,<br />지금 바로 사용해 보세요.
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                AI 라이트 전략 · 프리미엄 매거진 · 무료 마케팅 툴
                <br />
                모두 무료로 열어드립니다.
              </p>
            </div>

            {/* 모바일 전용 혜택 요약 */}
            <ul className="lg:hidden mb-7 grid grid-cols-1 gap-2.5">
              {BENEFITS.map((b, i) => {
                const Icon = b.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
                      <Icon size={14} className="text-white dark:text-zinc-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-zinc-900 dark:text-white truncate">
                        {b.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                        {b.desc}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

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
                  카카오로 3초 만에 시작하기
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-zinc-400 mt-6 leading-relaxed">
              회원가입 시 GIVENEEDS 서비스 이용약관 및 개인정보 처리방침에
              <br />
              동의하게 됩니다.
            </p>

            <PrivacyPolicyDisclosure />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <BrandLoader size={72} />
        </div>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
