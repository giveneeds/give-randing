'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';

export default function ContentStudioAiLogsPage() {
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
      const res = await fetch('/api/admin/content-studio/ai-logs?limit=100', {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
      alert('AI 로그 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-[12px] text-amber-800 leading-relaxed">
        <div className="font-bold mb-1 flex items-center gap-1">
          <Sparkles size={12} /> LLM 단계 안내
        </div>
        현재 <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">tools/content-mvp/</code>의 요약기는 <strong>extractive 방식(LLM 미사용)</strong>입니다.
        이 화면은 향후 LLM이 연결되면 호출 이력을 보여줍니다. 지금은 비어 있어도 정상입니다.
      </div>

      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <Sparkles size={32} strokeWidth={1} className="mx-auto mb-3" />
            <p className="text-sm">AI 호출 이력이 없습니다.</p>
            <p className="text-xs mt-1 text-zinc-300">LLM 단계가 연결되면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['', '시각', 'Stage', '모델', '입력', '출력', '비용($)', 'Latency'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((r) => {
                const isOpen = !!expanded[r.id];
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-zinc-50/80 transition cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                      <td className="px-4 py-3 text-zinc-300">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-zinc-600">
                        {new Date(r.created_at).toLocaleString('ko-KR', {
                          year: '2-digit', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600">
                          {r.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-zinc-700 font-mono">{r.model}</td>
                      <td className="px-4 py-3 text-[11px] text-zinc-600">{r.input_tokens ?? '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-zinc-600">{r.output_tokens ?? '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-zinc-600">{r.cost_usd != null ? Number(r.cost_usd).toFixed(4) : '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-zinc-500">{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-zinc-50/40">
                        <td colSpan={8} className="px-6 py-4 space-y-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Prompt</div>
                            <pre className="text-[11px] text-zinc-700 bg-white border border-zinc-100 rounded p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{r.prompt}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Response</div>
                            <pre className="text-[11px] text-zinc-700 bg-white border border-zinc-100 rounded p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{r.response || '(empty)'}
                            </pre>
                          </div>
                          {r.error && (
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Error</div>
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
    </div>
  );
}
