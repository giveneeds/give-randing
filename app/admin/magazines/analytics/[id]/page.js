'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft, Eye, Users, Download, TrendingUp, Calendar, Loader2, ExternalLink, FileText,
  Smartphone, Monitor, User,
} from 'lucide-react';

const METHOD_LABEL = {
  direct: { label: '직접', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  kakao: { label: '카카오', cls: 'bg-[#FEE500]/30 text-yellow-700 border-yellow-200' },
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function MagazineAnalyticsDetailPage({ params }) {
  const { id } = use(params);
  const [magazine, setMagazine] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [daily, setDaily] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const params = new URLSearchParams();
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      const res = await fetch(`/api/admin/magazines/analytics/${id}?${params}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setMagazine(data.magazine);
        setKpi(data.kpi);
        setDaily(data.daily || []);
        setViewers(data.viewers || []);
        setDownloads(data.downloads || []);
      } else {
        console.error('detail load error', data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.views));

  if (loading && !magazine) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!magazine) {
    return (
      <div className="text-center py-32">
        <div className="text-zinc-400 text-sm">매거진을 찾을 수 없습니다.</div>
        <Link href="/admin/magazines/analytics" className="inline-block mt-4 text-zinc-900 text-sm font-bold underline">
          ← 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/admin/magazines/analytics"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> 분석 목록으로
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-24 h-16 bg-zinc-100 rounded-lg overflow-hidden shrink-0">
            {magazine.thumbnail_url ? (
              <img src={magazine.thumbnail_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><FileText size={18} className="text-zinc-300" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">{magazine.category || 'UNCATEGORIZED'}</div>
            <h1 className="text-xl font-black text-zinc-900 mb-2">{magazine.title}</h1>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="font-mono">/{magazine.slug}</span>
              <span>•</span>
              <span>{new Date(magazine.created_at).toLocaleDateString('ko-KR')} 발행</span>
              <a
                href={`/magazine/${magazine.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900 font-bold"
              >
                보기 <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 기간 필터 */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex items-center gap-3">
        <Calendar size={14} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">기간</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-1.5 border border-zinc-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        <span className="text-zinc-300">~</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-1.5 border border-zinc-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        <span className="text-[10px] text-zinc-400 ml-2">미설정 시 최근 30일</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="총 조회수" hint="페이지뷰 합계" value={kpi?.views ?? 0} />
        <KpiCard icon={Users} label="고유 방문자" hint="익명 ID 기준" value={kpi?.unique_visitors ?? 0} />
        <KpiCard icon={Download} label="자료 다운로드" hint="DB 기록 기준" value={kpi?.downloads ?? 0} />
        <KpiCard icon={TrendingUp} label="전환율" hint="다운로드 ÷ 조회수" value={`${kpi?.conversion_rate ?? 0}%`} />
      </div>

      {/* 일별 조회 추이 */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">일별 조회 추이</div>
        {daily.length === 0 ? (
          <div className="text-sm text-zinc-400 py-8 text-center">기간 내 조회 데이터가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-zinc-500 tabular-nums shrink-0">{d.date.slice(5)}</div>
                <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900"
                    style={{ width: `${(d.views / maxDaily) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs font-bold text-zinc-900 tabular-nums">{d.views}</div>
                <div className="w-12 text-right text-[10px] text-zinc-400 tabular-nums">·{d.unique_visitors} uniq</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 조회자 목록 — 익명 ID 기준, 카카오 가입자는 이름 매칭 */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">조회자 목록</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">익명 ID 기준 집계 · 카카오 가입자는 이름 표시 · 어드민은 자동 제외</div>
          </div>
          <div className="text-[10px] text-zinc-400">{viewers.length}명</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">최근 조회</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">신원</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">익명 ID</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">조회</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">디바이스</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">첫 조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {viewers.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-400">
                  기간 내 조회 데이터가 없습니다.
                </td></tr>
              ) : viewers.map((v) => {
                const DeviceIcon = v.device_type === 'mobile' ? Smartphone : Monitor;
                return (
                  <tr key={v.anonymous_id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-5 py-3 text-xs text-zinc-700 whitespace-nowrap">{fmtDateTime(v.last_view)}</td>
                    <td className="px-5 py-3 text-xs">
                      {v.kakao_name ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-zinc-900">
                          <User size={12} className="text-zinc-400" />
                          {v.kakao_name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">— (비회원)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[10px] font-mono text-zinc-500">{v.anonymous_id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-xs text-right font-bold text-zinc-900 tabular-nums">{v.view_count}</td>
                    <td className="px-5 py-3 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1.5">
                        <DeviceIcon size={12} className="text-zinc-400" />
                        {v.device_type || '—'}{v.browser ? ` · ${v.browser}` : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[10px] text-zinc-400 whitespace-nowrap">{fmtDateTime(v.first_view)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 다운로드자 목록 */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">자료 다운로드자</div>
          <div className="text-[10px] text-zinc-400">{downloads.length}건</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/50 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">시각</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">이메일</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">이름·회사</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">자료</th>
                <th className="px-5 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest">경로</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {downloads.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-400">
                  기간 내 자료 다운로드 기록이 없습니다.
                </td></tr>
              ) : downloads.map((d) => {
                const meth = METHOD_LABEL[d.delivery_method] || { label: d.delivery_method || '—', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
                return (
                  <tr key={d.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-5 py-3 text-xs text-zinc-700 whitespace-nowrap">{fmtDateTime(d.created_at)}</td>
                    <td className="px-5 py-3 text-xs">
                      <span className="font-bold text-zinc-900">{d.user_email || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-600">
                      {d.user_name || '—'}
                      {d.user_company && <span className="text-zinc-400"> · {d.user_company}</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-700">
                      <div className="font-bold">{d.resource?.title || '—'}</div>
                      {d.resource?.file_name && (
                        <div className="text-[10px] text-zinc-400 font-mono">{d.resource.file_name}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded-full ${meth.cls}`}>{meth.label}</span>
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

function KpiCard({ icon: Icon, label, hint, value }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-400 mb-3">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black text-zinc-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint && (
        <div className="text-[10px] text-zinc-400 mt-1.5">{hint}</div>
      )}
    </div>
  );
}
