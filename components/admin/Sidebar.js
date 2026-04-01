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
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ handleLogout }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
    { label: '캠페인(LP) 관리', href: '/admin/campaigns', icon: Rocket },
    { label: '매거진 관리', href: '/admin/magazines', icon: BookOpen },
    { href: '/admin/sections', icon: Component, label: '글로벌 섹션' },
    { href: '/admin/leads', icon: Users, label: '리드(DB) 조회' },
    { href: '/admin/settings', icon: Settings, label: '설정' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-zinc-200 flex flex-col z-30">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[var(--admin-primary)] rounded-sm flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
            G
          </div>
          <span className="font-bold text-lg text-[var(--admin-text-main)] tracking-tight">
            Giveneeds Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-zinc-50 text-zinc-900 border border-zinc-200 font-bold" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-[var(--admin-primary)]" : "text-[var(--admin-text-muted)]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-zinc-200 space-y-1">
        <a 
          href="/" 
          target="_blank" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <ExternalLink size={18} />
          내 사이트 보기
        </a>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
