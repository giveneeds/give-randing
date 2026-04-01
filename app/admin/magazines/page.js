'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  ExternalLink,
  Eye,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

export default function MagazineListPage() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => { loadMagazines(); }, []);

  async function loadMagazines() {
    try {
      const res = await fetch('/api/magazines');
      const data = await res.json();
      setMagazines(data.magazines || []);
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

  const filtered = magazines.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-[var(--admin-text-muted)] animate-pulse">Archive Loading...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">Magazine Management</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">발행된 마케팅 아카이브와 인사이트를 관리하세요.</p>
        </div>
        <Link 
          href="/admin/magazines/editor" 
          className="flex items-center justify-center gap-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white px-5 py-2.5 rounded-md font-bold text-sm shadow-sm transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> New Archive
        </Link>
      </div>

      <div className="bg-white rounded-md border border-[var(--admin-border)] overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row gap-4 bg-zinc-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
              placeholder="아카이브 제목 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border border-zinc-200 rounded-md text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="INSIGHT">Insight</option>
            <option value="STRATEGY">Strategy</option>
            <option value="ANALYSIS">Analysis</option>
          </select>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-zinc-50/50">
                 <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Status</th>
                 <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Archive Details</th>
                 <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-50">
               {filtered.length > 0 ? filtered.map((mag) => (
                 <tr key={mag.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-6 w-32">
                       <div className="flex flex-col gap-2">
                         <span className={clsx(
                           "text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase",
                           mag.is_published ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                         )}>
                           {mag.is_published ? 'Published' : 'Draft'}
                         </span>
                         {mag.is_premium && (
                           <span className="bg-zinc-900 text-white text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase">Premium</span>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-4">
                          <div className="w-20 h-14 bg-zinc-100 border border-zinc-200 rounded-sm overflow-hidden shrink-0">
                            {mag.thumbnail_url ? (
                              <img src={mag.thumbnail_url} className="w-full h-full object-cover" alt={mag.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-zinc-300" /></div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 text-base leading-snug group-hover:underline cursor-pointer" onClick={() => window.open(`/magazine/${mag.slug}`, '_blank')}>
                              {mag.title}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{mag.category}</span>
                               <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                               <span className="text-[10px] font-medium text-zinc-400 tracking-tight flex items-center gap-1">
                                 <Clock size={10} /> {new Date(mag.created_at).toLocaleDateString('ko-KR')}
                               </span>
                            </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                       <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/magazines/editor?id=${mag.id}`} className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all">
                             <Edit3 size={18} />
                          </Link>
                          <a href={`/magazine/${mag.slug}`} target="_blank" className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all">
                             <Eye size={18} />
                          </a>
                          <button onClick={() => handleDelete(mag.id)} className="p-2.5 hover:bg-red-50 rounded-xl text-zinc-400 hover:text-red-500 transition-all">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                 </tr>
               )) : (
                 <tr>
                    <td colSpan="3" className="py-24 text-center">
                       <p className="text-zinc-400 text-sm italic">매치되는 아카이브가 없습니다.</p>
                    </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
