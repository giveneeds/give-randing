'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';
import { Suspense } from 'react';
import { isAdminOrPreviewPath } from '@/lib/adminPreviewPaths';

function LoginToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAdminOrPreviewPath(pathname)) return;
    if (searchParams.get('welcome') === '1') {
      const showTimer = setTimeout(() => setVisible(true), 0);
      // URL에서 ?welcome=1 제거
      const params = new URLSearchParams(searchParams.toString());
      params.delete('welcome');
      const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '');
      router.replace(newUrl, { scroll: false });
      // 3.5초 후 자동 닫힘
      const t = setTimeout(() => setVisible(false), 3500);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(t);
      };
    }
  }, [searchParams, router, pathname]);

  if (!visible || isAdminOrPreviewPath(pathname)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed z-[999] flex items-center gap-3
        px-4 py-3 rounded-2xl shadow-2xl
        bg-zinc-900 dark:bg-white
        text-white dark:text-zinc-900
        border border-white/10 dark:border-zinc-900/10
        transition-all duration-300
        animate-in fade-in slide-in-from-bottom-4
        /* 모바일: 하단 중앙 full-width */
        bottom-5 left-4 right-4
        /* 데스크탑: 우하단 고정폭 */
        sm:left-auto sm:right-6 sm:bottom-6 sm:w-[320px]
      `}
    >
      <CheckCircle2 size={18} className="shrink-0 text-emerald-400 dark:text-emerald-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black tracking-tight">로그인 완료</p>
        <p className="text-[11px] font-medium opacity-70 mt-0.5 truncate">
          GIVENEEDS에 오신 걸 환영해요!
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="닫기"
        className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 transition"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function LoginToast() {
  return (
    <Suspense fallback={null}>
      <LoginToastInner />
    </Suspense>
  );
}
