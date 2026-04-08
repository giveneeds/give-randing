'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error') === 'forbidden' ? '관리자 권한이 없는 계정입니다.' : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const userId = data?.user?.id;
      if (!userId) throw new Error('로그인 실패');

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (pErr) throw pErr;

      if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        await supabase.auth.signOut();
        setError('관리자 권한이 없는 계정입니다.');
        return;
      }

      router.replace('/admin');
    } catch (err) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <div className="hidden lg:flex w-1/2 bg-zinc-950 flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center text-zinc-950 font-black text-sm">G</div>
            <span className="text-white font-bold tracking-tight">GIVENEEDS</span>
          </div>
          <p className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase mb-4">Admin Console</p>
          <h1 className="text-white text-4xl font-black leading-tight tracking-tighter mb-6">
            통합 마케팅<br/>관리 시스템
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
            관리자 계정으로만 접근할 수 있습니다.
          </p>
        </div>
        <div className="relative z-10 text-zinc-600 text-xs">© 2026 Giveneeds</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-2xl font-black text-zinc-950 tracking-tighter mb-2">관리자 로그인</h2>
            <p className="text-sm text-zinc-500">Supabase 관리자 계정으로 로그인하세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">{error}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="email"
                  required
                  pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@giveneeds.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-950 hover:bg-black text-white font-bold rounded-lg text-sm tracking-wide mt-2 shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
