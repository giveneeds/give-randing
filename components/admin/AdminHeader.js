import { useAdmin } from '@/app/admin/layout';
import { Bell, Search, User, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminHeader({ onMenuClick = () => {} }) {
  const pathname = usePathname();
  const admin = useAdmin();

  // Simple breadcrumb mapper
  const getPageTitle = (path) => {
    if (path === '/admin') return '대시보드';
    if (path.includes('/campaigns')) return '랜딩페이지 빌더';
    if (path.includes('/services')) return '상품/솔루션 관리';
    if (path.includes('/magazine')) return '매거진 관리';
    if (path.includes('/sections')) return '웹사이트 수정';
    if (path.includes('/leads')) return '고객 리드 조회';
    if (path.includes('/settings')) return '시스템 설정';
    return '관리자';
  };

  return (
    <header className="h-14 sm:h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-3 sm:px-6 lg:px-8 sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-zinc-700 hover:text-zinc-900 rounded-md"
          aria-label="메뉴 열기"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight truncate">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="검색..."
            className="pl-9 pr-4 py-1.5 rounded-full bg-zinc-100 border-none text-[11px] font-bold w-40 focus:w-56 focus:ring-1 focus:ring-zinc-900 transition-all outline-none text-zinc-900"
          />
        </div>

        <button className="p-2 sm:p-2.5 text-zinc-500 hover:text-zinc-900 transition-colors relative">
          <Bell size={18} className="sm:hidden" />
          <Bell size={20} className="hidden sm:block" />
          <span className="absolute top-1.5 right-2 sm:top-2 sm:right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 sm:pl-3 sm:border-l border-zinc-200 sm:ml-1">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-zinc-900 uppercase tracking-tighter">Admin User</p>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Manager</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm">
            <User size={16} className="sm:hidden" />
            <User size={18} className="hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
