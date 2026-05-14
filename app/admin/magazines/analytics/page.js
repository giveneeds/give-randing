'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  BarChart2, Search, Filter, Loader2, Calendar, Eye, Users, Download,
  TrendingUp, FileText, ChevronRight,
} from 'lucide-react';
import { MAGAZINE_CATEGORIES } from '@/lib/magazineCategories';

const STATUS_LABEL = {
  published: { label: '발행됨', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: '임시저장', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  pending: { label: '승인대기', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

function fmtRel(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function MagazineAnalyticsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total_views: 0, total_unique_visitors: 0, total_downloads: 0, overall_conversion: 0 });
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 검색 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      if (debouncedQuery) params.set('q', debouncedQuery);

      const res = await fetch(`/api/admin/magazines/analytics?${params}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
        setSummary(data.summary || { total_views: 0, total_unique_visitors: 0, total_downloads: 0, overall_conversion: 0 });
      } else {
        console.error('analytics load error', data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, fromDate, toDate, debouncedQuery]);

  useEffect(() => { load(); }, [load]);

  const maxViews = Math.max(1, ...rows.map((r) => r.views));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <BarChart2 size={22} /> 매거진 분석
          </h1>
          <p className="text-sm text-zinc-500 mt-1">글별 조회수와 자료 다운로드 통계 (기본 최근 30일)</p>
        </div>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="전체 조회수" value={summary.total_views.toLocaleString()} />
        <KpiCard icon={Users} label="고유 방문자" value={summary.total_unique_visitors.toLocaleString()} />
        <KpiCard icon={Download} label="자료 다운로드" value={summary.total_downloads.toLocaleString()} />
        <KpiCard icon={TrendingUp} label="다운로드 전환율" value={`${summary.overall_conversion}%`} />
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="제목 검색…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">전체 카테고리</option>
            {MAGAZINE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">전체 상태</option>
            <option value="published">발행됨</option>
            <option value="draft">임시저장</option>
          </select>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest">매거진</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest">상태</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">조회수</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">고유 방문자</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">다운로드</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">전환율</th>
                <th className="px-5 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest">마지막 활동</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                  <Loader2 size={20} className="animate-spin inline-block" />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-zinc-400 text-sm">
                  조건에 해당하는 매거진이 없습니다.
                </td></tr>
              ) : rows.map((r) => {
                const stat = STATUS_LABEL[r.status] || STATUS_LABEL.draft;
                const barPct = Math.round((r.views / maxViews) * 100);
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/magazines/analytics/${r.id}`} className="flex items-center gap-3 group">
                        <div className="w-12 h-9 bg-zinc-100 rounded-md overflow-hidden shrink-0">
                          {r.thumbnail_url ? (
                            <img src={r.thumbnail_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><FileText size={14} className="text-zinc-300" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-zinc-900 truncate group-hover:underline">{r.title}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">{r.category || 'UNCATEGORIZED'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[10px] font-bold border px-2 py-1 rounded-full ${stat.cls}`}>{stat.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="text-sm font-bold text-zinc-900 tabular-nums">{r.views.toLocaleString()}</div>
                      <div className="h-1 mt-1 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums">{r.unique_visitors.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums font-bold">{r.downloads.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums">{r.conversion_rate}%</td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500">{fmtRel(r.last_activity_at)}</td>
                    <td className="px-3 py-3.5 text-right">
                      <Link href={`/admin/magazines/analytics/${r.id}`} className="text-zinc-400 hover:text-zinc-900">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-400 mb-3">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black text-zinc-900 tabular-nums">{value}</div>
    </div>
  );
}
