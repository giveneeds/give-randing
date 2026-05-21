'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Key, User, Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, passkey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '가입 실패');

      // 자동 로그인
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        setSuccess(true);
        setTimeout(() => router.replace('/admin/login'), 1500);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/admin'), 1000);
    } catch (err) {
      setError(err.message);
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
          <p className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase mb-4">Admin Signup</p>
          <h1 className="text-white text-4xl font-black leading-tight tracking-tighter mb-6">
            관리자<br/>간편 가입
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
            승인된 암호키를 알고 계신 분만 관리자 계정을 생성할 수 있습니다.
          </p>
        </div>
        <div className="relative z-10 text-zinc-600 text-xs">© 2026 Giveneeds</div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl font-black text-zinc-950 tracking-tighter mb-2">관리자 가입</h2>
            <p className="text-sm text-zinc-500">암호키와 함께 가입하면 즉시 관리자 권한이 부여됩니다.</p>
          </div>

          {success ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-emerald-800">가입 완료!</p>
                <p className="text-xs text-emerald-600 mt-1">어드민으로 이동합니다…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">{error}</div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">암호키</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400 font-mono"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="암호키 입력"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">이름</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none text-sm text-zinc-900 placeholder:text-zinc-400"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
              </div>

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
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">비밀번호 (6자 이상)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="password"
                    required
                    minLength={6}
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
                관리자 계정 생성
              </button>

              <p className="text-center text-xs text-zinc-400 pt-2">
                이미 계정이 있으신가요?{' '}
                <Link href="/admin/login" className="text-zinc-900 font-bold hover:underline">
                  로그인
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
