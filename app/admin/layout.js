'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Lock, Mail, Loader2 } from 'lucide-react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || '로그인에 실패했습니다');
      }
    } catch (e) {
      setError('서버 연결에 실패했습니다');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    router.push('/admin');
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--admin-bg)]">
        <Loader2 className="animate-spin text-[var(--admin-primary)]" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--admin-bg)] p-6">
        <div className="max-w-md w-full bg-white rounded-md shadow-sm p-10 border border-[var(--admin-border)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--admin-primary)] rounded-md text-white mb-6">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter mb-2 uppercase">Giveneeds Admin</h1>
            <p className="text-sm text-[var(--admin-text-muted)] tracking-tight">통합 마케팅 관리 센터에 로그인하세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-500 rounded-xl text-xs font-medium text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--admin-text-main)] uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-sm"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="admin@giveneeds.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--admin-text-main)] uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white font-bold rounded-md shadow-sm hover:scale-105 transition-transform uppercase tracking-widest text-sm"
            >
              로그인하기
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs text-[var(--admin-text-muted)]">
            © 2026 Giveneeds Platform. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <div className="flex bg-[var(--admin-bg)] min-h-screen">
        <Sidebar handleLogout={handleLogout} />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
