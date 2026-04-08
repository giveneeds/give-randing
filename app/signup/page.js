'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Gift,
} from 'lucide-react';
import { supabase, isDummyMode } from '@/lib/supabase';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

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
      setError('현재 환경에서는 회원가입이 비활성화되어 있습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) throw err;

      // 어드민 리드 DB에도 동시 적재 (실패해도 가입 흐름은 막지 않음)
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            inquiry_type: 'signup',
            lead_type: 'signup',
            category: 'member',
            source_page: '/signup',
            source_referrer:
              typeof document !== 'undefined' ? document.referrer || null : null,
            message: '회원가입을 통해 등록된 리드입니다.',
          }),
        });
      } catch (leadErr) {
        console.warn('Lead capture failed (non-blocking):', leadErr);
      }

      setInfo('이메일로 인증 링크가 발송되었습니다. 메일함을 확인해 주세요.');
    } catch (err) {
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
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

  const loginHref = `/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;

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
              <span className="text-zinc-500">가입 한 번이면 충분해요.</span>
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
            {/* 모바일 상단 브랜드 */}
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
                30초 만에 가입하고,<br />지금 바로 시작하세요.
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
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-900 dark:focus:border-white outline-none transition"
                />
              </div>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
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
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={18}
                />
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
                    무료로 시작하기
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                또는
              </span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Kakao */}
            <button
              type="button"
              onClick={handleKakao}
              className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-black py-4 rounded-xl text-sm transition-colors active:scale-[0.98]"
            >
              <KakaoIcon /> 카카오로 1초 만에 가입하기
            </button>

            {/* Mode toggle */}
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-8">
              이미 계정이 있으신가요?
              <Link
                href={loginHref}
                className="ml-2 font-black text-zinc-900 dark:text-white underline underline-offset-2"
              >
                로그인
              </Link>
            </p>

            <p className="text-center text-[10px] text-zinc-400 mt-6 leading-relaxed">
              회원가입 시 GIVENEEDS 서비스 이용약관 및 개인정보 처리방침에
              <br />
              동의하게 됩니다.
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-zinc-400 uppercase tracking-widest">
          Loading
        </div>
      }
    >
      <SignupPageInner />
    </Suspense>
  );
}
