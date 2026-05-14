'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, ExternalLink, BookOpen } from 'lucide-react';

const SOURCE_LABEL = {
  youtube: 'YouTube',
  threads: 'Threads',
  instagram: 'Instagram',
  hackernews: 'Hacker News',
  web: 'Web',
};

export default function ContentStudioApprovedPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const params = new URLSearchParams();
      params.set('status', 'approved');
      params.set('limit', '100');
      const res = await fetch(`/api/admin/content-studio/items?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      alert('승인 목록 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-[12px] text-blue-800 leading-relaxed">
        <div className="font-bold mb-1 inline-flex items-center gap-1">
          <BookOpen size={12} /> 매거진 연계 안내
        </div>
        승인된 항목은 추후 <strong>콘텐츠 에이전트</strong>가 매거진 주제·기획의 입력으로 사용합니다.
        Phase 2에서 매거진 초안과의 연결 정보가 우측 컬럼에 표시될 예정입니다.
      </div>

      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <CheckCircle2 size={32} strokeWidth={1} className="mx-auto mb-3" />
            <p className="text-sm">승인된 콘텐츠가 없습니다.</p>
            <p className="text-xs mt-1 text-zinc-300">검수 탭에서 승인하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['승인 시각', '소스', '제목 (한국어)', '한 줄 요약', '경로', '매거진 연결'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((r) => {
                const title = r.translation?.translated_title || r.normalized?.title || r.post_url;
                const summary = r.summary?.one_line_summary || '—';
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-zinc-600">
                      {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                        {SOURCE_LABEL[r.source] || r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[360px]">
                      <a href={r.post_url} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-zinc-800 hover:text-zinc-900 inline-flex items-center gap-1">
                        <span className="truncate">{title}</span>
                        <ExternalLink size={11} className="text-zinc-400 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-[400px] text-[11px] text-zinc-600">
                      <div className="line-clamp-2">{summary}</div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-zinc-400">
                      {r.approved_via ? `via ${r.approved_via}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-300 italic">
                      Phase 2 연결 예정
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
