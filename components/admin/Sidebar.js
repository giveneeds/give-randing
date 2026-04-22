'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Rocket,
  BookOpen,
  Component,
  Settings,
  ExternalLink,
  LogOut,
  Users,
  Briefcase,
  BarChart2,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAdmin } from '@/app/admin/layout';
import { canAccessPath, isSuperadmin } from '@/lib/adminPermissions';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/sections', icon: Component, label: '웹사이트 수정' },
  { href: '/admin/service', icon: Rocket, label: '서비스 페이지 수정' },
  { href: '/admin/services', icon: Rocket, label: '상품/솔루션 관리' },
  { href: '/admin/campaigns', icon: Component, label: '랜딩페이지 빌더' },
  { href: '/admin/magazines', icon: BookOpen, label: '매거진 콘텐츠' },
  { href: '/admin/cases', icon: Briefcase, label: '고객 사례 (For You)' },
  { href: '/admin/leads', icon: Users, label: '고객 리드 조회' },
  { href: '/admin/downloads', icon: Download, label: '자료 다운로드 로그' },
  { href: '/admin/funnel', icon: BarChart2, label: '퍼널 분석' },
  { href: '/admin/settings', icon: Settings, label: '시스템 설정' },
  { href: '/admin/settings/admins', icon: Users, label: '관리자 계정' },
];

export default function Sidebar({ handleLogout }) {
  const pathname = usePathname();
  const ctx = useAdmin();
  const role = ctx?.profile?.role || 'admin';
  const superAdmin = isSuperadmin(role);

  const visibleItems = NAV_ITEMS.filter(item => canAccessPath(item.href, role));

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-zinc-200 flex flex-col z-30 transition-colors duration-300">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-zinc-900 rounded-sm flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-sm">
            G
          </div>
          <span className="font-black text-lg text-zinc-950 tracking-tighter">
            Giveneeds
          </span>
        </Link>
        {/* 역할 배지 */}
        <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
          style={superAdmin
            ? { background: '#fef3c7', color: '#b45309' }
            : { background: '#e0e7ff', color: '#4338ca' }}>
          <ShieldCheck size={10} />
          {superAdmin ? 'Superadmin' : 'Admin'}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 uppercase tracking-tight",
                isActive
                  ? "bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-zinc-900" : "text-zinc-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-zinc-200 space-y-1">
        <a
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-zinc-500 hover:bg-zinc-50 transition-all uppercase tracking-tight"
        >
          <ExternalLink size={18} />
          내 사이트 보기
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-red-500 hover:bg-red-50 transition-all uppercase tracking-tight"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
