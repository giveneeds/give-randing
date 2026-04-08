'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminContext = createContext();
export function useAdmin() {
  return useContext(AdminContext);
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isLoginPage) {
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
        setProfile(prof);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [isLoginPage, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  if (isLoginPage) {
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
      <div className="flex bg-zinc-50 text-zinc-900 min-h-screen" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <Sidebar handleLogout={handleLogout} />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
