'use client';
import { Globe, Plus, Trash2, Edit3, ExternalLink, ChevronRight, CheckCircle2, Search, Filter } from 'lucide-react';

export default function CampaignList({ campaigns, searchQuery, setSearchQuery, onEdit, onCreate }) {
  const filtered = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">캠페인(LP) 관리</h1>
          <p className="text-zinc-500 text-sm mt-1 tracking-tight">유입 매체별 전용 랜딩 페이지를 생성하고 최적화하세요.</p>
        </div>
        <button onClick={onCreate} className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-md font-bold text-sm transition-all shadow-sm tracking-widest uppercase">
          <Plus size={18} /> 새 캠페인 생성
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-md border border-zinc-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="캠페인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(camp => (
          <div key={camp.id} className="group bg-white rounded-md border border-zinc-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-400 transition-all shadow-sm">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 flex items-center justify-center rounded-md border ${camp.is_active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>
                <Globe size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-900">{camp.title}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${camp.status === 'published' ? 'bg-zinc-100 text-zinc-600' : 'bg-yellow-50 text-yellow-600'}`}>
                    {camp.status || 'draft'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-1">/landing/{camp.slug}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex gap-6 pr-6 border-r border-zinc-50">
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">리드</p>
                  <p className="text-sm font-black text-zinc-900">2.4k</p>
                </div>
              </div>
              <button onClick={() => onEdit(camp)} className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-all"><Edit3 size={18} /></button>
              <a href={`/landing/${camp.slug}`} target="_blank" className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-all"><ExternalLink size={18} /></a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
