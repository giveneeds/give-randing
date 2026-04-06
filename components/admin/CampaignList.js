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
          <h1 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">랜딩페이지 빌더</h1>
          <p className="text-zinc-500 text-sm mt-1 tracking-tight">유입 매체별 전용 랜딩 페이지를 생성하고 최적화하세요.</p>
        </div>
        <button onClick={onCreate} className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-black text-white px-5 py-2.5 rounded-xl font-black text-[11px] transition-all shadow-lg tracking-widest uppercase active:scale-95">
          <Plus size={16} /> 새 캠페인 생성
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="캠페인 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(camp => (
          <div key={camp.id} className="group bg-white rounded-xl border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-400 transition-all shadow-sm">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-all ${camp.is_active ? 'bg-zinc-950 text-white border-zinc-900 shadow-md' : 'bg-zinc-50 text-zinc-300 border-zinc-200'}`}>
                <Globe size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-zinc-900 tracking-tight">{camp.title}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border transition-colors ${camp.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                    {camp.status || 'draft'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-1 tracking-tight">/landing/{camp.slug}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex gap-6 pr-6 border-r border-zinc-100">
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-black">Total Leads</p>
                  <p className="text-sm font-black text-zinc-900">2.4k</p>
                </div>
              </div>
              <button 
                onClick={() => onEdit(camp)} 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all active:scale-95 border border-transparent hover:border-zinc-700 shadow-sm"
              >
                <Edit3 size={14} /> 편집
              </button>
              <a 
                href={`/landing/${camp.slug}`} 
                target="_blank" 
                className="p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all border border-zinc-100"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-xl">
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">캠페인을 찾을 수 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
