'use client';
import { usePathname } from 'next/navigation';
import { Bell, Search, User } from 'lucide-react';

export default function AdminHeader() {
  const pathname = usePathname();
  
  // Simple breadcrumb mapper
  const getPageTitle = (path) => {
    if (path === '/admin') return '대시보드';
    if (path.includes('/campaigns')) return '캠페인(LP) 관리';
    if (path.includes('/magazine')) return '매거진 관리';
    if (path.includes('/sections')) return '글로벌 섹션';
    if (path.includes('/leads')) return '리드(DB) 조회';
    if (path.includes('/settings')) return '설정';
    return '관리자';
  };

  return (
    <header className="h-16 border-b border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-[var(--admin-text-main)]">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" size={16} />
          <input 
            type="text" 
            placeholder="검색..." 
            className="pl-10 pr-4 py-1.5 rounded-full bg-[var(--admin-bg)] border-none text-xs w-48 focus:w-64 focus:ring-1 focus:ring-[var(--admin-primary)] transition-all outline-none"
          />
        </div>
        
        <button className="p-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)] transition-colors">
          <Bell size={20} />
        </button>
        
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--admin-border)]">
          <div className="w-8 h-8 rounded-full bg-[var(--admin-primary)] flex items-center justify-center text-white text-xs font-bold">
            <User size={16} />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[var(--admin-text-main)]">Admin User</p>
            <p className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
