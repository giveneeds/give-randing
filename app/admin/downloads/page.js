'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Download, Search, Filter, Loader2, Calendar, Mail,
  ExternalLink, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';

const PAGE_SIZE = 50;

const METHOD_LABEL = {
  direct: { label: '직접 다운로드', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  kakao: { label: '카카오 발송', cls: 'bg-[#FEE500]/30 text-yellow-700 border-yellow-200' },
};

const STATUS_LABEL = {
  completed: { label: '완료', cls: 'bg-emerald-50 text-emerald-600' },
  pending: { label: '대기', cls: 'bg-amber-50 text-amber-600' },
  failed: { label: '실패', cls: 'bg-red-50 text-red-600' },
};

export default function AdminDownloadsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [magazineFilter, setMagazineFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);

  const [magazineOptions, setMagazineOptions] = useState([]);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 필터 바뀌면 1페이지로
  useEffect(() => { setPage(1); }, [magazineFilter, methodFilter, fromDate, toDate, debouncedQuery]);

  // 매거진 셀렉트 옵션 로드 (전체)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('magazines')
          .select('id, title')
          .order('created_at', { ascending: false });
        setMagazineOptions(data || []);
      } catch (e) {
        console.error('magazines load failed', e);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (magazineFilter !== 'all') params.set('magazine_id', magazineFilter);
      if (methodFilter !== 'all') params.set('delivery_method', methodFilter);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        // 종료일은 그날 23:59:59 까지 포함
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      if (debouncedQuery) params.set('q', debouncedQuery);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));

      const res = await fetch(`/api/admin/downloads?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      alert('다운로드 로그 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [magazineFilter, methodFilter, fromDate, toDate, debouncedQuery, page, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalLabel = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${total}건 중 ${start}–${end} 표시`;
  }, [page, total]);

  function parentInfo(r) {
    if (r.magazine) return { type: '매거진', title: r.magazine.title, href: `/magazine/${r.magazine.slug}` };
    if (r.campaign) return { type: 'LP', title: r.campaign.title, href: `/lp/${r.campaign.slug}` };
    return { type: '-', title: '-', href: null };
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">자료 다운로드 로그</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1">
            {totalLabel}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select
            value={magazineFilter}
            onChange={(e) => setMagazineFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 매거진</option>
            {magazineOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 경로</option>
            <option value="direct">직접 다운로드</option>
            <option value="kakao">카카오 발송</option>
          </select>
        </div>

        <div className="relative flex items-center gap-2">
          <Calendar size={14} className="text-zinc-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1 min-w-0 px-2 py-2 bg-white border border-[var(--admin-border)] rounded-md text-[11px] outline-none shadow-sm"
          />
          <span className="text-zinc-400 text-xs">~</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1 min-w-0 px-2 py-2 bg-white border border-[var(--admin-border)] rounded-md text-[11px] outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <Download size={32} strokeWidth={1} className="mx-auto mb-2" />
            <p className="text-sm">조회 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  {['시각', '유저', '매거진 / LP', '자료', '경로', '상태'].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map((r) => {
                  const pi = parentInfo(r);
                  const methodCfg = METHOD_LABEL[r.delivery_method] || METHOD_LABEL.direct;
                  const statusCfg = STATUS_LABEL[r.status] || STATUS_LABEL.completed;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/80 transition">
                      <td className="px-5 py-4 whitespace-nowrap text-[11px] text-zinc-500">
                        {new Date(r.created_at).toLocaleString('ko-KR', {
                          year: '2-digit', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-zinc-400" />
                          <div>
                            <div className="text-xs font-bold text-zinc-800">
                              {r.user?.full_name || r.user?.email || r.user_email || '알 수 없음'}
                            </div>
                            {r.user?.email && (
                              <div className="text-[10px] text-zinc-400">{r.user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {pi.href ? (
                          <Link href={pi.href} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:text-zinc-900">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{pi.type}</span>
                            <span className="truncate max-w-[220px]">{pi.title}</span>
                            <ExternalLink size={11} className="text-zinc-400" />
                          </Link>
                        ) : <span className="text-zinc-300 text-xs">-</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-zinc-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-800 truncate max-w-[260px]">
                              {r.resource?.title || '-'}
                            </div>
                            {r.resource?.file_name && (
                              <div className="text-[10px] text-zinc-400 truncate max-w-[260px]">{r.resource.file_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-bold border px-2 py-1 rounded-full ${methodCfg.cls}`}>
                          {methodCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <p className="text-xs text-zinc-500 font-medium">{totalLabel}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white disabled:opacity-30 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-zinc-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white disabled:opacity-30 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
