'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const AdminContext = createContext();

export function useAdmin() {
  return useContext(AdminContext);
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
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-zinc-900" size={28} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex">
        {/* Left decorative panel */}
        <div className="hidden lg:flex w-1/2 bg-zinc-950 flex-col justify-between p-16 relative overflow-hidden border-r border-zinc-800">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center text-zinc-950 font-black text-sm">G</div>
              <span className="text-white font-bold tracking-tight">GIVENEEDS</span>
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase mb-4">Admin Console</p>
              <h1 className="text-white text-4xl font-black leading-tight tracking-tighter mb-6">
                통합 마케팅<br/>관리 시스템
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                캠페인, 매거진, 리드 데이터를 한 곳에서. 데이터 기반으로 마케팅 성과를 극대화하세요.
              </p>
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-6 text-zinc-600 text-xs">
              <span>© 2026 Giveneeds</span>
              <span>All rights reserved</span>
            </div>
          </div>
        </div>

        {/* Right login panel */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-3 mb-12">
              <div className="w-8 h-8 bg-zinc-950 rounded-sm flex items-center justify-center text-white font-black text-sm">G</div>
              <span className="text-zinc-950 font-bold tracking-tight">GIVENEEDS</span>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-black text-zinc-950 tracking-tighter mb-2">로그인</h2>
              <p className="text-sm text-zinc-500">어드민 계정으로 로그인하세요.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">ID</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-sm text-zinc-950 placeholder:text-zinc-400"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="giveneeds"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-sm text-zinc-950 placeholder:text-zinc-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-zinc-950 hover:bg-black text-white font-bold rounded-lg transition-all text-sm tracking-wide mt-2 shadow-sm active:scale-[0.98]"
              >
                로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ handleLogout }}>
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
