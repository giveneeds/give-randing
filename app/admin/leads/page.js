'use client';
import { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, MoreHorizontal, Mail, Phone, 
  Calendar, Tag, ChevronLeft, ChevronRight, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertCircle, Building2, Globe,
  MessageSquare, Coins, MapPin
} from 'lucide-react';

const LEAD_TYPE_CONFIG = {
  consultation: { label: '문의하기', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  campaign:     { label: '캠페인 LP', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  magazine:     { label: '매거진 회원가입', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  organic:      { label: '기타 유입', color: 'bg-zinc-50 text-zinc-500 border-zinc-200' },
};

const BUDGET_LABEL = {
  under_100: '100만원 이하',
  '100_500': '100~500만원',
  '500_1000': '500~1000만원',
  over_1000: '1000만원 이상',
  undecided: '미정 (상담 필요)',
};

const STATUS_CONFIG = {
  new:       { label: '신규', icon: <AlertCircle size={10}/>, color: 'bg-amber-50 text-amber-600' },
  contacted: { label: '진행중', icon: <Clock size={10}/>, color: 'bg-blue-50 text-blue-600' },
  converted: { label: '완료', icon: <CheckCircle2 size={10}/>, color: 'bg-emerald-50 text-emerald-600' },
  rejected:  { label: '거절', icon: <XCircle size={10}/>, color: 'bg-red-50 text-red-600' },
};

const PAGE_SIZE = 10;

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadLeads();
  }, [leadTypeFilter, statusFilter]);

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (leadTypeFilter !== 'all') params.set('lead_type', leadTypeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    return (
      (lead.name || '').toLowerCase().includes(q) ||
      (lead.email || '').toLowerCase().includes(q) ||
      (lead.phone || '').includes(searchQuery) ||
      (lead.company_name || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getLeadTypeBadge = (type) => {
    const cfg = LEAD_TYPE_CONFIG[type] || LEAD_TYPE_CONFIG.organic;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.color}`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  async function handleExportCSV() {
    if (filteredLeads.length === 0) return;
    const headers = ['이름', '연락처', '이메일', '회사명', '홈페이지', '예산', '리드유형', '유입페이지', '클릭요소', '상태', '수집일'];
    const rows = filteredLeads.map(l => [
      l.name, l.phone, l.email, l.company_name, l.website_url,
      BUDGET_LABEL[l.budget] || l.budget,
      LEAD_TYPE_CONFIG[l.lead_type]?.label || l.lead_type,
      l.source_page, l.click_element, l.status,
      new Date(l.created_at).toLocaleDateString('ko-KR')
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">리드(DB) 조회</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1">
            전체 <span className="font-black text-zinc-900">{filteredLeads.length}</span>건 · 
            문의 <span className="font-black text-violet-600">{leads.filter(l=>l.lead_type==='consultation').length}</span>건 · 
            캠페인 <span className="font-black text-blue-600">{leads.filter(l=>l.lead_type==='campaign').length}</span>건 · 
            매거진 <span className="font-black text-emerald-600">{leads.filter(l=>l.lead_type==='magazine').length}</span>건
          </p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-900 px-5 py-2.5 rounded-md font-bold text-sm hover:bg-zinc-50 transition-all shadow-sm"
        >
          <Download size={16} /> CSV 내보내기
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" placeholder="이름, 이메일, 연락처, 회사명 검색..."
            value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select 
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
            value={leadTypeFilter} onChange={e => { setLeadTypeFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">모든 유입 경로</option>
            <option value="consultation">문의하기</option>
            <option value="campaign">캠페인 LP</option>
            <option value="magazine">매거진 회원가입</option>
            <option value="organic">기타</option>
          </select>
        </div>
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">모든 상태</option>
            <option value="new">신규</option>
            <option value="contacted">진행중</option>
            <option value="converted">완료</option>
            <option value="rejected">거절</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm animate-pulse">데이터 불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  {['고객 정보', '연락처', '유입 경로', '예산', '상태', '수집일', ''].map((h, i) => (
                    <th key={i} className="px-6 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {pagedLeads.length > 0 ? pagedLeads.map(lead => (
                  <>
                    <tr 
                      key={lead.id} 
                      className="group hover:bg-zinc-50/80 transition-all cursor-pointer"
                      onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-sm text-zinc-700">
                            {(lead.name || '?')[0]}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 text-sm">{lead.name}</div>
                            {lead.company_name && <div className="text-[11px] text-zinc-400">{lead.company_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          {lead.phone && <div className="flex items-center gap-1.5 text-xs text-zinc-600"><Phone size={11} className="text-zinc-400"/>{lead.phone}</div>}
                          {lead.email && <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Mail size={11} className="text-zinc-400"/>{lead.email}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          {getLeadTypeBadge(lead.lead_type || 'organic')}
                          {lead.source_page && (
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <MapPin size={9}/>{lead.source_page}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {lead.budget ? (
                          <span className="text-xs font-bold text-zinc-700">{BUDGET_LABEL[lead.budget] || lead.budget}</span>
                        ) : <span className="text-zinc-300 text-xs">-</span>}
                      </td>
                      <td className="px-6 py-5">{getStatusBadge(lead.status || 'new')}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium whitespace-nowrap">
                          <Calendar size={11}/>{new Date(lead.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-700 transition-all">
                          <MoreHorizontal size={16}/>
                        </button>
                      </td>
                    </tr>

                    {/* 상세 확장 행 */}
                    {expandedId === lead.id && (
                      <tr key={`${lead.id}-detail`} className="bg-zinc-50/50">
                        <td colSpan={7} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {lead.website_url && (
                              <div className="flex items-start gap-2">
                                <Globe size={13} className="text-zinc-400 mt-0.5 flex-shrink-0"/>
                                <div>
                                  <p className="text-zinc-400 font-bold uppercase tracking-wider mb-0.5">홈페이지</p>
                                  <a href={lead.website_url} target="_blank" className="text-blue-600 underline underline-offset-2 break-all">{lead.website_url}</a>
                                </div>
                              </div>
                            )}
                            {lead.message && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <MessageSquare size={13} className="text-zinc-400 mt-0.5 flex-shrink-0"/>
                                <div>
                                  <p className="text-zinc-400 font-bold uppercase tracking-wider mb-0.5">상세 문의</p>
                                  <p className="text-zinc-700 leading-relaxed">{lead.message}</p>
                                </div>
                              </div>
                            )}
                            {lead.click_element && (
                              <div className="flex items-start gap-2">
                                <Tag size={13} className="text-zinc-400 mt-0.5 flex-shrink-0"/>
                                <div>
                                  <p className="text-zinc-400 font-bold uppercase tracking-wider mb-0.5">클릭 위치</p>
                                  <code className="text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">{lead.click_element}</code>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-zinc-300">
                        <Users size={40} strokeWidth={1}/>
                        <p className="text-sm font-medium">조회 결과가 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <p className="text-xs text-zinc-500 font-medium">전체 {filteredLeads.length}건 중 {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, filteredLeads.length)} 표시</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1} className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white disabled:opacity-30 transition-all"><ChevronLeft size={14}/></button>
              {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${p===currentPage ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-white border border-transparent hover:border-zinc-200'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-white disabled:opacity-30 transition-all"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
