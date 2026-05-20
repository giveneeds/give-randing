'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Search, Inbox, CheckCircle2, Activity } from 'lucide-react';

// 콘텐츠 스튜디오는 5단계 흐름.
// 주제 정의 → 시장 리서치 → 검토함(자동 모은 자료) → 발행(매거진으로 흘려보낸 결과) → 진행(자동화 상태).
const TABS = [
  { href: '/admin/content-studio/themes', label: '주제', icon: Target },
  { href: '/admin/content-studio/research', label: '리서치', icon: Search },
  { href: '/admin/content-studio', label: '검토함', icon: Inbox, exact: true },
  { href: '/admin/content-studio/published', label: '발행', icon: CheckCircle2 },
  { href: '/admin/content-studio/activity', label: '진행', icon: Activity },
];

export default function ContentStudioLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">
          콘텐츠 스튜디오
        </h1>
        <p className="text-[var(--admin-text-muted)] text-sm mt-1">
          주제를 정하고 자료를 모아 매거진으로 발행하기까지의 흐름을 한 곳에서 관리합니다.
        </p>
      </div>

      <nav className="flex items-center gap-1 border-b border-[var(--admin-border)] overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap ' +
                (active
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700')
              }
            >
              <Icon size={14} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
