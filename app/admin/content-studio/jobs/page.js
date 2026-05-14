'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ListChecks, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, XCircle, PlayCircle } from 'lucide-react';

const STATUS_CFG = {
  running: { label: '진행 중', cls: 'bg-blue-50 text-blue-600', Icon: PlayCircle },
  success: { label: '성공', cls: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle2 },
  partial: { label: '부분 성공', cls: 'bg-amber-50 text-amber-600', Icon: AlertCircle },
  failed:  { label: '실패', cls: 'bg-red-50 text-red-600', Icon: XCircle },
};

export default function ContentStudioJobsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content-studio/jobs?limit=100', {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
      alert('잡 로그 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  function duration(r) {
    if (!r.finished_at) return '—';
    const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${Math.round(ms / 1000)}초`;
    const m = Math.floor(ms / 60_000);
    const s = Math.round((ms % 60_000) / 1000);
    return `${m}분 ${s}초`;
  }

  return (
    <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-24 text-center text-zinc-400">
          <ListChecks size={32} strokeWidth={1} className="mx-auto mb-3" />
          <p className="text-sm">잡 실행 이력이 없습니다.</p>
          <p className="text-xs mt-1 text-zinc-300">에이전트가 실행되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              {['', '시작', '종료', '상태', 'Trigger', '수집', '실패', '실행 시간'].map((h, i) => (
                <th key={i} className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {rows.map((r) => {
              const cfg = STATUS_CFG[r.status] || STATUS_CFG.success;
              const Icon = cfg.Icon;
              const isOpen = !!expanded[r.id];
              return (
                <Fragment key={r.id}>
                  <tr className="hover:bg-zinc-50/80 transition cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                    <td className="px-4 py-3 text-zinc-300">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-zinc-600">
                      {new Date(r.started_at).toLocaleString('ko-KR', {
                        year: '2-digit', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-zinc-500">
                      {r.finished_at ? new Date(r.finished_at).toLocaleString('ko-KR', {
                        year: '2-digit', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.cls}`}>
                        <Icon size={10} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                        {r.trigger}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-zinc-700">
                      {r.stats?.collected ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-zinc-700">
                      {r.stats?.failed ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500">
                      {duration(r)}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-zinc-50/40">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Stats JSON</div>
                        <pre className="text-[11px] text-zinc-700 bg-white border border-zinc-100 rounded p-3 overflow-x-auto leading-relaxed">
{JSON.stringify(r.stats || {}, null, 2)}
                        </pre>
                        {r.error && (
                          <div className="mt-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Error</div>
                            <pre className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded p-3 overflow-x-auto leading-relaxed">
{r.error}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
