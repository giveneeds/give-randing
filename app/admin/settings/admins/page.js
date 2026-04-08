'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/app/admin/layout';
import { UserPlus, Shield, Trash2, Loader2, Mail } from 'lucide-react';

export default function AdminAdminsPage() {
  const ctx = useAdmin();
  const myRole = ctx?.profile?.role;
  const isSuper = myRole === 'superadmin';

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'admin' });
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState(null);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      setAdmins(data.admins || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!isSuper) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '생성 실패');
      setInfo(`${form.email} 관리자가 생성되었습니다.`);
      setForm({ email: '', password: '', full_name: '', role: 'admin' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id, email) {
    if (!isSuper) return;
    if (!confirm(`${email} 의 관리자 권한을 회수하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '회수 실패');
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black tracking-tighter uppercase">관리자 계정</h1>
        <p className="text-sm text-zinc-500 mt-1">
          어드민 콘솔 접근 권한을 가진 계정 목록입니다. 신규 관리자 생성은 슈퍼관리자만 가능합니다.
        </p>
      </div>

      {!isSuper && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          현재 계정({myRole})은 목록 조회만 가능합니다. 슈퍼관리자만 신규 관리자 생성/권한 회수가 가능합니다.
        </div>
      )}

      {/* 신규 생성 폼 */}
      {isSuper && (
        <div className="bg-white rounded-md border border-[var(--admin-border)] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus size={16} className="text-zinc-700" />
            <h2 className="text-sm font-black uppercase tracking-widest">신규 관리자 생성</h2>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-xs">{error}</div>}
          {info && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs">{info}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">이메일 *</label>
              <input
                type="email"
                required
                pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-md text-sm outline-none focus:border-zinc-900"
                placeholder="newadmin@giveneeds.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">비밀번호 *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-md text-sm outline-none focus:border-zinc-900"
                placeholder="6자 이상"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">이름</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-md text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">권한</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-md text-sm outline-none focus:border-zinc-900 bg-white"
              >
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-black disabled:opacity-50"
              >
                {submitting && <Loader2 size={12} className="animate-spin" />}
                생성하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center gap-2">
          <Shield size={14} className="text-zinc-700" />
          <h2 className="text-sm font-black uppercase tracking-widest">관리자 목록</h2>
          <span className="text-xs text-zinc-400">· {admins.length}명</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-400 animate-pulse">불러오는 중...</div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-400">등록된 관리자가 없습니다.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                {['이메일', '이름', '권한', '생성일', ''].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-800">
                      <Mail size={12} className="text-zinc-400" />
                      {a.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">{a.full_name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      a.role === 'superadmin'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-400">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isSuper && (
                      <button
                        onClick={() => handleRevoke(a.id, a.email)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={11} /> 권한 회수
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
