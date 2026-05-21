'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { canAccessPath } from '@/lib/adminPermissions';

const AdminContext = createContext();
export function useAdmin() {
  return useContext(AdminContext);
}

const SidebarContext = createContext({ open: false, setOpen: () => {} });
export function useSidebar() {
  return useContext(SidebarContext);
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPage = pathname === '/admin/login' || pathname === '/admin/signup';

  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 라우트 이동 시 드로어 자동 닫힘
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isPublicPage) {
      setChecking(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('id,email,full_name,role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!active) return;
        if (!prof || (prof.role !== 'admin' && prof.role !== 'superadmin')) {
          await supabase.auth.signOut();
          router.replace('/admin/login?error=forbidden');
          return;
        }
        // 경로별 권한 체크 — admin이 superadmin 전용 경로 접근 시 대시보드로 리다이렉트
        if (!canAccessPath(pathname, prof.role)) {
          router.replace('/admin?error=permission');
          return;
        }
        // 어드민 디바이스 마커 쿠키 갱신 (idempotent, fire-and-forget).
        // 기존 쿠키 만료가 가까워졌거나 처음 어드민 페이지 진입한 디바이스에 1년 마커 발급.
        if (session?.access_token) {
          fetch('/api/admin/auth/tag', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {});
        }
        setProfile(prof);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [isPublicPage, router, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (checking || !profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-zinc-900" size={28} />
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ handleLogout, profile }}>
      <SidebarContext.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen }}>
        <div className="bg-zinc-50 text-zinc-900 min-h-screen" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
          <Sidebar handleLogout={handleLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-zinc-900/40 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col min-h-screen lg:ml-64">
            <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-[1200px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarContext.Provider>
    </AdminContext.Provider>
  );
}
