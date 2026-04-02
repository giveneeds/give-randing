'use client';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery));
    
    // In a real app, 'status' would be a field in the DB.
    // For now, we'll just filter by search.
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted':
        return <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> 완료</span>;
      case 'contacted':
        return <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><Clock size={10} /> 진행중</span>;
      case 'rejected':
        return <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><XCircle size={10} /> 거절</span>;
      default:
        return <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><AlertCircle size={10} /> 신규</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">리드 데이터 분석 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">리드(DB) 조회</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">캠페인 및 매거진을 통해 수집된 소중한 잠재 고객 데이터입니다.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-white border border-zinc-200 text-zinc-900 px-5 py-2.5 rounded-md font-bold text-sm hover:bg-zinc-50 transition-all shadow-sm tracking-widest uppercase">
          <Download size={18} /> CSV 내보내기
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="이름, 이메일, 연락처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="new">신규 유입</option>
            <option value="contacted">연락 완료</option>
            <option value="converted">전환됨</option>
          </select>
        </div>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <select className="w-full pl-12 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900">
            <option value="all">모든 유입 경로</option>
            <option value="campaign">캠페인(LP)</option>
            <option value="magazine">매거진</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-5 text-[11px] font-black text-zinc-900 uppercase tracking-widest">고객 정보</th>
                <th className="px-8 py-5 text-[11px] font-black text-zinc-900 uppercase tracking-widest">연락처</th>
                <th className="px-8 py-5 text-[11px] font-black text-zinc-900 uppercase tracking-widest">유입 경로</th>
                <th className="px-8 py-5 text-[11px] font-black text-zinc-900 uppercase tracking-widest">상태</th>
                <th className="px-8 py-5 text-[11px] font-black text-zinc-900 uppercase tracking-widest">수집일</th>
                <th className="px-8 py-5 text-right font-black text-zinc-900 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-zinc-50 transition-all duration-300">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-zinc-100 flex items-center justify-center text-[var(--admin-primary)] font-black text-sm group-hover:bg-zinc-200 transition-colors border border-zinc-200">
                        {lead.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 text-sm tracking-tight">{lead.name}</div>
                        <div className="text-[10px] text-zinc-400 font-medium">ID: {lead.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                          <Mail size={12} className="text-zinc-400" /> {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                          <Phone size={12} className="text-zinc-400" /> {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">
                        {lead.campaign_id ? 'Campaign' : lead.magazine_id ? 'Magazine' : 'Organic'}
                      </span>
                      <div className="text-xs font-medium text-zinc-600 flex items-center gap-1 group-hover:text-zinc-900 transition-colors">
                        {lead.campaigns?.title || lead.magazines?.title || '메인 페이지'}
                        <ExternalLink size={10} className="text-zinc-300" />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {lead.category || 'organic'}
                  </td>
                  <td className="px-8 py-6">
                    {getStatusBadge(lead.status || 'new')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold">
                      <Calendar size={12} strokeWidth={2.5} />
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-all border border-transparent hover:border-zinc-200 shadow-sm group-hover:shadow-sm">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-zinc-300">
                      <Users size={48} strokeWidth={1} />
                      <p className="text-sm italic font-medium">조회 결과가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <p className="text-xs text-zinc-500 font-bold tracking-tight">전체 {filteredLeads.length}개의 리드 중 1-10 표시</p>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white disabled:opacity-30 transition-all" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="px-3 py-1.5 rounded-md bg-[var(--admin-primary)] text-white text-xs font-bold shadow-sm">1</button>
            <button className="px-3 py-1.5 rounded-md text-zinc-500 text-xs font-bold hover:bg-white border border-transparent hover:border-zinc-200 transition-all">2</button>
            <button className="px-3 py-1.5 rounded-md text-zinc-500 text-xs font-bold hover:bg-white border border-transparent hover:border-zinc-200 transition-all">3</button>
            <button className="p-2 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
