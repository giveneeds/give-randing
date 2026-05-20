'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase, isDummyMode } from '@/lib/supabase';
import { clearAuthRedirect, getSafeAuthRedirect, readAuthRedirect } from '@/lib/authRedirect';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = getSafeAuthRedirect(searchParams.get('next'), readAuthRedirect('/chat'));
    const code = searchParams.get('code');
    const errorDescription = searchParams.get('error_description');

    async function handle() {
      if (errorDescription) {
        router.replace(`/login?error=callback&next=${encodeURIComponent(next)}`);
        return;
      }
      if (isDummyMode || !supabase) {
        clearAuthRedirect();
        router.replace(next);
        return;
      }

      try {
        // PKCE flow — Supabase가 매직링크에서 ?code=...로 돌려보냄
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 해시 토큰 케이스(detectSessionInUrl 기본 처리)도 한 번 더 확인
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data?.session) {
            // 세션 수립 실패 — 로그인 페이지로
            router.replace(`/login?error=callback&next=${encodeURIComponent(next)}`);
            return;
          }
        }
        const welcomeUrl = next.includes('?')
          ? `${next}&welcome=1`
          : `${next}?welcome=1`;
        clearAuthRedirect();
        router.replace(welcomeUrl);
      } catch (err) {
        console.error('Auth callback error:', err);
        router.replace(`/login?error=callback&next=${encodeURIComponent(next)}`);
      }
    }

    handle();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 gap-4">
      <Loader2 size={28} className="animate-spin" />
      <p className="text-xs font-bold uppercase tracking-widest">로그인 처리 중…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-zinc-400 uppercase tracking-widest">
          Loading
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
