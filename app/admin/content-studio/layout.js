'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitBranch, Search, Inbox, CheckCircle2, Activity, Sparkles } from 'lucide-react';

// 콘텐츠 스튜디오는 운영 화면을 검토함 중심으로 두고,
// 기둥/리서치 설정은 고급 관리 영역으로 낮춘다.
const TABS = [
  { href: '/admin/content-studio', label: '검토함', icon: Inbox, exact: true },
  // 새 트랙 — 트렌드 기반 기획 에이전트 (USE_TREND_PIPELINE 분기). 기존 흐름과 별도.
  { href: '/admin/content-studio/research-workbench', label: '워크벤치', icon: Sparkles },
  { href: '/admin/content-studio/published', label: '발행', icon: CheckCircle2 },
  { href: '/admin/content-studio/activity', label: '진행', icon: Activity },
  { href: '/admin/content-studio/pillars', label: '기둥', icon: GitBranch, advanced: true },
  { href: '/admin/content-studio/research', label: '리서치 로그', icon: Search, advanced: true },
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
          에이전트가 주제와 기둥을 제안하고, 텔레그램 승인 뒤 생성된 글 묶음을 한 곳에서 관리합니다.
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
                  ? 'border-[var(--admin-text-main)] text-[var(--admin-text-main)]'
                  : `border-transparent text-[var(--admin-text-muted)] ${t.advanced ? 'opacity-70' : ''} hover:text-[var(--admin-text-main)]`)
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
