'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Edit3, Trash2, Eye, FileText,
  ChevronUp, ChevronDown, Star, Archive, Send, Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import ServiceCaseTabs from '@/components/admin/ServiceCaseTabs';

export default function CaseListPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, published, draft

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    try {
      const res = await fetch('/api/cases?admin=true');
      const data = await res.json();
      const sorted = (data.cases || []).sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
      setCases(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/cases?id=${id}`, { method: 'DELETE' });
      setCases(cases.filter((c) => c.id !== id));
    } catch (e) { console.error(e); }
  }

  async function handleReorder(index, direction) {
    const newList = [...cases];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;

    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];

    const updated = newList.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCases(updated);

    try {
      await fetch('/api/cases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated.map((c) => ({ id: c.id, sort_order: c.sort_order })) }),
      });
    } catch (e) { console.error('순서 저장 실패:', e); }
  }

  const filtered = cases.filter((c) => {
    const matchesSearch = (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && (c.status || 'draft') === activeTab;
  });

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Cases Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <ServiceCaseTabs />
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tighter uppercase">Case Studies Management</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 tracking-tight">고객 사례(For You)를 관리하고 노출 순서를 조정하세요.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/cases/editor"
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-md font-bold text-xs sm:text-sm shadow-sm transition-all uppercase tracking-widest"
          >
            <Plus size={16} /> New Case
          </Link>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white rounded-md border border-zinc-100 overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex p-1 bg-zinc-100 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'all', label: '전체', icon: <Filter size={14} /> },
              { id: 'published', label: '발행됨', icon: <Send size={14} /> },
              { id: 'draft', label: '임시저장', icon: <Archive size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                {tab.icon} {tab.label}
                <span className={clsx(
                  'ml-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors',
                  activeTab === tab.id ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                )}>
                  {tab.id === 'all' ? cases.length : cases.filter((c) => (c.status || 'draft') === tab.id).length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900 placeholder:text-zinc-400"
              placeholder="사례 제목 또는 고객사명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.length > 0 ? filtered.map((c, index) => (
            <div key={`m-${c.id}`} className="p-4">
              <div className="flex gap-3">
                <div className="w-16 h-12 bg-zinc-100 border border-zinc-200 rounded-md overflow-hidden flex-shrink-0">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center"><FileText size={14} className="text-zinc-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/for-you/${c.slug}`} className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2 block">{c.title}</Link>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={clsx(
                      'text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase',
                      (c.status || 'draft') === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                    )}>{c.status || 'draft'}</span>
                    {c.is_featured && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase bg-blue-50 text-blue-600 flex items-center gap-0.5">
                        <Star size={8} className="fill-blue-500" /> F
                      </span>
                    )}
                    {c.client_name && <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest truncate">{c.client_name}</span>}
                  </div>
                  {c.result_summary && (
                    <div className="text-[11px] font-bold text-amber-600 mt-1 line-clamp-1">▲ {c.result_summary}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleReorder(index, 'up')} disabled={index === 0} className="p-1.5 rounded text-zinc-400 disabled:opacity-20"><ChevronUp size={14} /></button>
                  <span className="text-[11px] font-black text-zinc-500 tabular-nums px-1">{c.sort_order || index + 1}</span>
                  <button onClick={() => handleReorder(index, 'down')} disabled={index === filtered.length - 1} className="p-1.5 rounded text-zinc-400 disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/cases/editor?id=${c.id}`} className="p-2 rounded-md border border-zinc-200 text-zinc-500"><Edit3 size={14} /></Link>
                  <a href={`/for-you/${c.slug}`} target="_blank" className="p-2 rounded-md border border-zinc-200 text-zinc-500"><Eye size={14} /></a>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-md border border-zinc-200 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-16 text-center text-zinc-400 text-sm italic">등록된 사례가 없습니다.</div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 w-20">순서</th>
                <th className="px-4 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 w-24">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Case Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length > 0 ? filtered.map((c, index) => (
                <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-600 disabled:opacity-20 transition-all"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <span className="text-[11px] font-black text-zinc-400 tabular-nums">{c.sort_order || index + 1}</span>
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
                        'text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase',
                        (c.status || 'draft') === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                      )}>
                        {c.status || 'draft'}
                      </span>
                      {c.is_featured && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-sm w-fit tracking-tighter uppercase bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Star size={8} className="fill-blue-500" /> Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-14 bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden shrink-0">
                        {c.thumbnail_url
                          ? <img src={c.thumbnail_url} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-zinc-300" /></div>}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 text-base leading-snug hover:underline">
                          <Link href={`/for-you/${c.slug}`}>{c.title}</Link>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c.client_name && (
                            <>
                              <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">{c.client_name}</span>
                              <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                            </>
                          )}
                          {c.category && (
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{c.category}</span>
                          )}
                        </div>
                        {c.result_summary && (
                          <div className="text-[11px] font-bold text-amber-600 mt-1.5 line-clamp-1">▲ {c.result_summary}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Link href={`/admin/cases/editor?id=${c.id}`} className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Edit3 size={18} /></Link>
                      <a href={`/for-you/${c.slug}`} target="_blank" className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"><Eye size={18} /></a>
                      <button onClick={() => handleDelete(c.id)} className="p-2.5 hover:bg-red-50 rounded-xl text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="py-24 text-center text-zinc-400 text-sm italic">등록된 사례가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
