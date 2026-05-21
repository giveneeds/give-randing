'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Edit3, Trash2, Eye, FileText, Clock, 
  ChevronUp, ChevronDown, Star, Archive, Send, Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import MagazineCard from '@/components/landing/MagazineCard';

export default function MagazineListPage() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, published, draft
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { loadMagazines(); }, []);

  async function loadMagazines() {
    try {
      const res = await fetch('/api/magazines?admin=true');
      const data = await res.json();
      const sorted = (data.magazines || []).sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
      setMagazines(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/magazines?id=${id}`, { method: 'DELETE' });
      setMagazines(magazines.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
  }

  async function handleReorder(index, direction) {
    const newList = [...magazines];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;

    // 순서 교환
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    
    // sort_order 재할당
    const updated = newList.map((m, i) => ({ ...m, sort_order: i + 1 }));
    setMagazines(updated);

    // DB 업데이트 (PATCH)
    try {
      await fetch('/api/magazines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated.map(m => ({ id: m.id, sort_order: m.sort_order })) })
      });
    } catch (e) { console.error('순서 저장 실패:', e); }
  }

  const filtered = magazines.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && (m.status || 'draft') === activeTab;
  });

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Archive Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tighter uppercase">Magazine Management</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 tracking-tight">발행된 마케팅 아카이브와 인사이트를 관리하고 순서를 조정하세요.</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={clsx("flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md font-bold text-xs sm:text-sm transition-all uppercase tracking-widest border",
              showPreview ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900"
            )}
          >
            <Eye size={14} /> <span className="hidden sm:inline">{showPreview ? '프리뷰 닫기' : '메인 프리뷰'}</span><span className="sm:hidden">{showPreview ? '닫기' : '프리뷰'}</span>
          </button>
          <Link
            href="/admin/magazines/editor"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-md font-bold text-xs sm:text-sm shadow-sm transition-all uppercase tracking-widest"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Archive</span><span className="sm:hidden">신규</span>
          </Link>
        </div>
      </div>

      {/* ─── Preview Panel ─── */}
      {showPreview && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">매거진 메인 프리뷰 (현재 순서 기준)</span>
          </div>
          <div className="bg-white rounded-lg border border-zinc-100 p-3 sm:p-4 overflow-hidden">
            {/* 미니 그리드 프리뷰 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ maxHeight: '300px', overflow: 'hidden' }}>
              {filtered.filter(m => m.is_published !== false).slice(0, 6).map((m, i) => (
                <div 
                  key={m.id} 
                  className={clsx(
                    "relative overflow-hidden rounded-lg",
                    i === 0 ? "col-span-2 row-span-2 min-h-[200px]" : "min-h-[95px]"
                  )}
                >
                  <div className="absolute inset-0 bg-zinc-200">
                    {m.thumbnail_url && <img src={m.thumbnail_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 z-10">
                    <span className="text-[8px] font-bold text-white/60 uppercase block">{m.category}</span>
                    <span className={clsx("font-black text-white leading-tight line-clamp-2", i === 0 ? "text-sm" : "text-[10px]")}>{m.title}</span>
                  </div>
                  {m.is_featured && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="bg-white rounded-md border border-zinc-100 overflow-hidden shadow-sm">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex p-1 bg-zinc-100 rounded-xl overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: '전체', icon: <Filter size={14} /> },
            { id: 'published', label: '발행됨', icon: <Send size={14} /> },
            { id: 'draft', label: '임시저장', icon: <Archive size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              {tab.icon} {tab.label}
              <span className={clsx(
                "ml-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors",
                activeTab === tab.id ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
              )}>
                {tab.id === 'all' ? magazines.length : magazines.filter(m => (m.status || 'draft') === tab.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900 placeholder:text-zinc-400"
            placeholder="아카이브 제목 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.length > 0 ? filtered.map((mag, index) => (
            <div key={`m-${mag.id}`} className="p-4">
              <div className="flex gap-3">
                <div className="w-16 h-12 bg-zinc-100 border border-zinc-200 rounded-md overflow-hidden flex-shrink-0">
                  {mag.thumbnail_url ? <img src={mag.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={14} className="text-zinc-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/magazine/${mag.slug}`} className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2 block">{mag.title}</Link>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={clsx(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase",
                      (mag.status || 'draft') === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    )}>{mag.status || 'draft'}</span>
                    {mag.is_featured && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase bg-blue-50 text-blue-600 flex items-center gap-0.5">
                        <Star size={8} className="fill-blue-500" /> F
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{mag.category}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{new Date(mag.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleReorder(index, 'up')} disabled={index === 0} className="p-1.5 rounded text-zinc-400 disabled:opacity-20"><ChevronUp size={14} /></button>
                  <span className="text-[11px] font-black text-zinc-500 tabular-nums px-1">{mag.sort_order || index + 1}</span>
                  <button onClick={() => handleReorder(index, 'down')} disabled={index === filtered.length - 1} className="p-1.5 rounded text-zinc-400 disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/magazines/editor?id=${mag.id}`} className="p-2 rounded-md border border-zinc-200 text-zinc-500"><Edit3 size={14} /></Link>
                  <a href={`/magazine/${mag.slug}`} target="_blank" className="p-2 rounded-md border border-zinc-200 text-zinc-500"><Eye size={14} /></a>
                  <button onClick={() => handleDelete(mag.id)} className="p-2 rounded-md border border-zinc-200 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-16 text-center text-zinc-400 text-sm italic">기록된 아카이브가 없습니다.</div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
             <thead>
               <tr className="bg-zinc-50/50">
                 <th className="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 w-20">순서</th>
                 <th className="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 w-24">Status</th>
                 <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Archive Details</th>
                 <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-50">
               {filtered.length > 0 ? filtered.map((mag, index) => (
                 <tr key={mag.id} className="hover:bg-zinc-50/50 transition-colors group">
                    {/* 순서 컨트롤 */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleReorder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-600 disabled:opacity-20 transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <span className="text-[11px] font-black text-zinc-400 tabular-nums">{mag.sort_order || index + 1}</span>
                        <button 
                          onClick={() => handleReorder(index, 'down')}
                          disabled={index === filtered.length - 1}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-600 disabled:opacity-20 transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                       <div className="flex flex-col gap-1.5">
                         <span className={clsx(
                           "text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase",
                           (mag.status || 'draft') === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                         )}>
                           {mag.status || 'draft'}
                         </span>
                         {mag.is_featured && (
                           <span className="text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase bg-blue-50 text-blue-600 flex items-center gap-1">
                             <Star size={8} className="fill-blue-500" /> Featured
                           </span>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-4">
                          <div className="w-20 h-14 bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden shrink-0">
                            {mag.thumbnail_url ? <img src={mag.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-zinc-300" /></div>}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 text-base leading-snug hover:underline"><Link href={`/magazine/${mag.slug}`}>{mag.title}</Link></div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{mag.category}</span>
                               <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                               <span className="text-[10px] font-medium text-zinc-400 tracking-tight flex items-center gap-1"><Clock size={10} /> {new Date(mag.created_at).toLocaleDateString('ko-KR')}</span>
                               {mag.tags && mag.tags.length > 0 && (
                                 <>
                                   <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                   {mag.tags.slice(0, 3).map((t, i) => (
                                     <span key={i} className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">#{t}</span>
                                   ))}
                                 </>
                               )}
                            </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                       <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Link href={`/admin/magazines/editor?id=${mag.id}`} className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Edit3 size={18} /></Link>
                          <a href={`/magazine/${mag.slug}`} target="_blank" className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Eye size={18} /></a>
                          <button onClick={() => handleDelete(mag.id)} className="p-2.5 hover:bg-red-50 rounded-xl text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                       </div>
                    </td>
                 </tr>
               )) : (
                 <tr><td colSpan="4" className="py-24 text-center text-zinc-400 text-sm italic">기록된 아카이브가 존재하지 않습니다.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
