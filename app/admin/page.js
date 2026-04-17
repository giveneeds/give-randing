'use client';
import { useState, useEffect } from 'react';
import {
  Users, Rocket, BookOpen, TrendingUp,
  ArrowUpRight, Clock, ChevronRight,
  BarChart2, Globe
} from 'lucide-react';
import Link from 'next/link';

const PIPELINE_CONFIG = {
  new:       { label: '신규',  color: 'bg-amber-50 text-amber-700' },
  contacted: { label: '컨택',  color: 'bg-sky-50 text-sky-700' },
  qualified: { label: '적격',  color: 'bg-blue-50 text-blue-700' },
  proposal:  { label: '제안',  color: 'bg-violet-50 text-violet-700' },
  won:       { label: '계약',  color: 'bg-emerald-50 text-emerald-700' },
  lost:      { label: '이탈',  color: 'bg-red-50 text-red-500' },
};

const CHANNEL_LABELS = {
  direct: 'Direct', organic: 'Organic', paid_search: 'Paid Search',
  paid_social: 'Paid Social', email: 'Email', referral: 'Referral',
  kakao: 'Kakao', organic_social: 'Social', other: 'Other',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [leadRes, magRes, campRes, funnelRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/magazines'),
        fetch('/api/campaigns'),
        fetch('/api/analytics/funnel'),
      ]);

      const leads    = (await leadRes.json()).leads || [];
      const mags     = (await magRes.json()).magazines || [];
      const camps    = (await campRes.json()).campaigns || [];
      const funnel   = await funnelRes.json();

      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const newThisWeek = leads.filter(l => new Date(l.created_at).getTime() > weekAgo).length;

      const sessionCount = funnel.steps?.find(s => s.key === 'sessions')?.count || 0;
      const leadCount    = funnel.steps?.find(s => s.key === 'leads')?.count || 0;
      const convRate     = sessionCount > 0 ? ((leadCount / sessionCount) * 100).toFixed(1) : '0.0';

      // Pipeline breakdown
      const pipelineMap = {};
      for (const l of leads) {
        const s = l.pipeline_stage || 'new';
        pipelineMap[s] = (pipelineMap[s] || 0) + 1;
      }

      setData({
        leads,
        recentLeads: leads.slice(0, 6),
        totalLeads: leads.length,
        newThisWeek,
        totalMags: mags.filter(m => m.status === 'published').length,
        totalCamps: camps.filter(c => c.status === 'published').length,
        convRate,
        sessionCount,
        pipelineMap,
        channelBreakdown: funnel.channel_breakdown || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-zinc-500 text-sm">데이터 분석 중...</div>
      </div>
    );
  }

  const d = data || {};

  const kpis = [
    {
      label: '전체 리드',
      value: d.totalLeads ?? 0,
      sub: `이번 주 +${d.newThisWeek ?? 0}건`,
      icon: Users,
      href: '/admin/leads',
      accent: 'text-violet-600',
    },
    {
      label: '발행 매거진',
      value: d.totalMags ?? 0,
      sub: '게시 중인 아티클',
      icon: BookOpen,
      href: '/admin/magazines',
      accent: 'text-blue-600',
    },
    {
      label: '활성 캠페인',
      value: d.totalCamps ?? 0,
      sub: 'published 상태',
      icon: Rocket,
      href: '/admin/campaigns',
      accent: 'text-amber-600',
    },
    {
      label: '리드 전환율',
      value: `${d.convRate ?? '0.0'}%`,
      sub: `세션 ${(d.sessionCount ?? 0).toLocaleString()}건 기준`,
      icon: TrendingUp,
      href: '/admin/funnel',
      accent: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">대시보드</h1>
        <p className="text-zinc-500 text-sm mt-1">오늘의 마케팅 엔진 가동 상태를 확인하세요.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-zinc-50 border border-zinc-100 rounded-lg">
                <kpi.icon size={18} className="text-zinc-600" />
              </div>
              <ArrowUpRight size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className={`text-3xl font-black tracking-tighter ${kpi.accent}`}>{kpi.value}</h3>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2 uppercase tracking-widest">
              <Clock size={14} /> 최근 리드
            </h3>
            <Link href="/admin/leads" className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors">
              전체보기 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {d.recentLeads?.length > 0 ? d.recentLeads.map((lead) => {
              const pipe = PIPELINE_CONFIG[lead.pipeline_stage || 'new'];
              return (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-black text-sm text-zinc-700 flex-shrink-0">
                    {(lead.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{lead.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {lead.email || lead.phone || '-'}
                      {lead.company_name ? ` · ${lead.company_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pipe.color}`}>
                      {pipe.label}
                    </span>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </Link>
              );
            }) : (
              <div className="px-6 py-12 text-center text-sm text-zinc-400">
                아직 수집된 리드가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Pipeline breakdown */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart2 size={13} /> 파이프라인 현황
            </h3>
            <div className="space-y-2">
              {Object.entries(PIPELINE_CONFIG).map(([stage, cfg]) => {
                const count = d.pipelineMap?.[stage] || 0;
                const total = d.totalLeads || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={stage}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={`font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-zinc-500 font-bold">{count}건</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Channel breakdown */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe size={13} /> 유입 채널
            </h3>
            {d.channelBreakdown?.length > 0 ? (
              <div className="space-y-2">
                {d.channelBreakdown.slice(0, 5).map((row) => {
                  const total = d.channelBreakdown.reduce((s, r) => s + r.count, 0) || 1;
                  const pct = Math.round((row.count / total) * 100);
                  return (
                    <div key={row.channel} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-600 w-24 truncate">
                        {CHANNEL_LABELS[row.channel] || row.channel}
                      </span>
                      <div className="flex-1 mx-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-zinc-400 font-bold w-8 text-right">{row.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 text-center py-4">
                채널 데이터가 아직 없습니다.<br />
                <span className="text-zinc-300">방문자 유입 후 자동 집계됩니다.</span>
              </p>
            )}
          </div>

          {/* Quick action */}
          <div className="bg-zinc-900 rounded-xl p-5 text-white">
            <h3 className="font-black text-sm mb-1 uppercase tracking-tight">퍼널 분석 보기</h3>
            <p className="text-zinc-400 text-[11px] mb-4 leading-relaxed">
              세션 → 콘텐츠 → CTA → 리드 전환 흐름을 확인하세요.
            </p>
            <Link
              href="/admin/funnel"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-zinc-900 font-black rounded-lg text-xs hover:bg-zinc-100 transition-colors uppercase tracking-widest"
            >
              <BarChart2 size={13} /> 퍼널 대시보드
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
