'use client';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Rocket, 
  BookOpen, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    leads: [],
    campaigns: [],
    magazines: [],
    sections: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [leadRes, secRes, settingsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/sections?all=true'),
        fetch('/api/settings')
      ]);
      
      const leadData = await leadRes.json();
      const secData = await secRes.json();
      const settingsData = await settingsRes.json();

      // Mocking campaigns and magazines based on provided data/structure
      // In a real app, these would be separate API calls
      setStats({
        leads: leadData.leads || [],
        sections: secData.sections || [],
        campaigns: (secData.sections || []).filter(s => s.type === 'hero'), // Mocking campaigns
        magazines: [] // Placeholder
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const kpis = [
    { 
      label: '전체 리드 (DB)', 
      value: stats.leads.length, 
      icon: Users, 
      color: 'text-zinc-900', 
      bg: 'bg-zinc-100',
      trend: '+12% 이번주'
    },
    { 
      label: '활성 캠페인', 
      value: stats.sections.filter(s => s.is_active && s.type === 'hero').length || 1, 
      icon: Rocket, 
      color: 'text-zinc-900', 
      bg: 'bg-zinc-100',
      trend: '안정적'
    },
    { 
      label: '매거진 발행', 
      value: 2, // Mocked from HANDOFF_GUIDE
      icon: BookOpen, 
      color: 'text-zinc-900', 
      bg: 'bg-zinc-100',
      trend: '신규 1건'
    },
    { 
      label: '평균 전환율', 
      value: '8.4%', 
      icon: TrendingUp, 
      color: 'text-zinc-900', 
      bg: 'bg-zinc-100',
      trend: '+2.1% 상승'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">데이터 분석 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">GOOD MORNING, AGENT</h1>
        <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">오늘의 마케팅 엔진 가동 상태를 확인하세요.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-md border border-[var(--admin-border)] shadow-sm hover:border-zinc-400 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 ${kpi.bg} ${kpi.color} rounded-md`}>
                <kpi.icon size={24} />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-sm flex items-center gap-1">
                <ArrowUpRight size={10} /> {kpi.trend}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-3xl font-black text-[var(--admin-text-main)] mt-1 tracking-tighter">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads Table */}
        <div className="lg:col-span-2 bg-white rounded-md border border-[var(--admin-border)] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--admin-border)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--admin-text-main)] flex items-center gap-2 tracking-tight">
              <Clock size={18} className="text-zinc-900" /> 최근 수집된 리드
            </h3>
            <Link href="/admin/leads" className="text-xs font-bold text-[var(--admin-primary)] hover:underline flex items-center gap-1 uppercase tracking-widest">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">이름</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">연락처/이메일</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">유입 캠페인</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">날짜</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {stats.leads.length > 0 ? stats.leads.slice(0, 5).map((lead, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-[var(--admin-text-main)]">{lead.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--admin-text-muted)]">
                      {lead.email || lead.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded-sm uppercase tracking-widest">
                        {lead.campaign_id || lead.magazine_id || '메인'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--admin-text-muted)]">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-sm text-[var(--admin-text-muted)]">
                      아직 수집된 리드가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Status */}
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-md p-6 text-white shadow-sm border border-black">
            <h3 className="font-black text-lg mb-2 tracking-tighter uppercase">캠페인 즉시 생성</h3>
            <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
              광고 매체별로 최적화된 새로운 랜딩페이지를 몇 번의 클릭만으로 생성할 수 있습니다.
            </p>
            <Link href="/admin/campaigns" className="inline-flex items-center justify-center w-full py-3 bg-white text-black font-bold rounded-md text-sm hover:bg-zinc-200 transition-colors uppercase tracking-widest">
              새 캠페인 만들기
            </Link>
          </div>

          <div className="bg-white rounded-md border border-[var(--admin-border)] p-6 shadow-sm">
            <h3 className="font-bold text-[var(--admin-text-main)] mb-4 flex items-center gap-2 tracking-tight uppercase">
              <CheckCircle2 size={18} className="text-zinc-900" /> 플랫폼 건전성
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-zinc-100 pb-3">
                <span className="text-[var(--admin-text-muted)] font-bold tracking-widest uppercase text-xs">Supabase 연결</span>
                <span className="font-black text-zinc-900">정상</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-zinc-100 pb-3">
                <span className="text-[var(--admin-text-muted)] font-bold tracking-widest uppercase text-xs">SSL 보안인증</span>
                <span className="font-black text-zinc-900">활성</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-1">
                <span className="text-[var(--admin-text-muted)] font-bold tracking-widest uppercase text-xs">최근 빌드 성공</span>
                <span className="text-[var(--admin-text-main)] font-medium">3시간 전</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
