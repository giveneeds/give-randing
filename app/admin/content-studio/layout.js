'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, CheckCircle2, Rss, Send, ListChecks, Sparkles } from 'lucide-react';

const TABS = [
  { href: '/admin/content-studio', label: '검수', icon: Inbox, exact: true },
  { href: '/admin/content-studio/approved', label: '승인됨', icon: CheckCircle2 },
  { href: '/admin/content-studio/sources', label: '소스', icon: Rss },
  { href: '/admin/content-studio/telegram', label: '텔레그램', icon: Send },
  { href: '/admin/content-studio/jobs', label: '잡 로그', icon: ListChecks },
  { href: '/admin/content-studio/ai-logs', label: 'AI 로그', icon: Sparkles },
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
          에이전트가 수집·요약·번역한 결과를 검수하고 텔레그램·매거진으로 흘려보냅니다.
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
