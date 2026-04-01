'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Lock, Mail, Loader2 } from 'lucide-react';
import Spline from '@splinetool/react-spline/next';

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
      <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9I/scene.splinecode" />
        </div>
        <div className="relative z-10 max-w-md w-full bg-white/70 backdrop-blur-3xl rounded-3xl shadow-2xl p-10 border border-white/60">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--admin-primary)] rounded-md text-white mb-6 shadow-md">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter mb-2 uppercase drop-shadow-sm">Giveneeds Admin</h1>
            <p className="text-sm text-[var(--admin-text-muted)] tracking-tight">통합 마케팅 관리 센터에 로그인하세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 backdrop-blur-md border border-red-200 text-red-600 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--admin-text-main)] uppercase tracking-wider pl-1 drop-shadow-sm">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 backdrop-blur-md border border-white/60 rounded-md focus:ring-2 focus:ring-zinc-900/20 focus:bg-white/80 outline-none transition-all text-sm shadow-inner"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="admin@giveneeds.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--admin-text-main)] uppercase tracking-wider pl-1 drop-shadow-sm">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 backdrop-blur-md border border-white/60 rounded-md focus:ring-2 focus:ring-zinc-900/20 focus:bg-white/80 outline-none transition-all text-sm shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[var(--admin-primary)]/90 backdrop-blur-md hover:bg-[var(--admin-primary)] text-white font-bold rounded-md shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-widest text-sm"
            >
              로그인하기
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs text-zinc-600 drop-shadow-sm">
            © 2026 Giveneeds Platform. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9I/scene.splinecode" />
        </div>
        <div className="relative z-10 flex min-h-screen bg-white/20 backdrop-blur-[2px]">
          <Sidebar handleLogout={handleLogout} />
          <div className="flex-1 ml-64 flex flex-col min-h-screen">
            <AdminHeader />
            <main className="flex-1 m-6 p-8 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl overflow-y-auto max-h-[calc(100vh-100px)]">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
