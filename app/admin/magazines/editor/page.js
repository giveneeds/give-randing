'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Trash2, 
  Monitor, 
  Smartphone, 
  Image as ImageIcon, 
  Type, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import MagazineDetailPage from '@/app/magazine/[slug]/page';

export default function MagazineEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [magazine, setMagazine] = useState({
    title: '',
    slug: '',
    category: 'INSIGHT',
    thumbnail_url: '',
    content_html: '',
    is_premium: false,
    is_published: true,
    author: 'GIVENEEDS'
  });

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) loadMagazine();
  }, [id]);

  async function loadMagazine() {
    try {
      const res = await fetch(`/api/magazines?id=${id}`);
      const data = await res.json();
      if (data.magazine) setMagazine(data.magazine);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/magazines', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { ...magazine, id } : magazine)
      });
      if (res.ok) router.push('/admin/magazines');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-20 text-center text-zinc-400 font-black uppercase animate-pulse tracking-widest text-[10px]">Loading Archive...</div>;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[100] animate-in fade-in duration-500 overflow-hidden">
      {/* ─── Top Navbar ─── */}
      <header className="h-16 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-50 rounded-lg group transition-all">
               <ArrowLeft size={18} className="text-zinc-400 group-hover:text-zinc-900 group-hover:-translate-x-1 transition-all" />
            </button>
            <div className="h-4 w-px bg-zinc-200" />
            <h1 className="text-xs font-black uppercase tracking-widest text-zinc-900">Archive Editor</h1>
         </div>

         <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", previewMode === 'desktop' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", previewMode === 'mobile' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
            >
              <Smartphone size={14} /> Mobile
            </button>
         </div>

         <div className="flex items-center gap-3">
            <button className="text-zinc-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-zinc-900 text-white px-6 py-2.5 rounded-md font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 disabled:bg-zinc-100 disabled:text-zinc-300"
            >
              {saving ? 'Syncing...' : 'Publish Archive'}
            </button>
         </div>
      </header>

      {/* ─── Main Content Split ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input Panel */}
        <aside className="w-full max-w-[450px] border-r border-zinc-100 bg-zinc-50/50 flex flex-col overflow-y-auto p-10 space-y-12 shrink-0 custom-scrollbar">
           
           <div className="space-y-8">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Essential Data</label>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-900 uppercase ml-1">Archive Title</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-md font-bold text-base outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm"
                      placeholder="기사 제목을 입력하세요"
                      value={magazine.title}
                      onChange={e => setMagazine({ ...magazine, title: e.target.value })}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-zinc-900 uppercase ml-1">Category</label>
                       <select 
                         className="w-full p-4 bg-white border border-zinc-200 rounded-md font-bold text-xs outline-none shadow-sm uppercase tracking-widest"
                         value={magazine.category}
                         onChange={e => setMagazine({ ...magazine, category: e.target.value })}
                       >
                         <option value="INSIGHT">Insight</option>
                         <option value="STRATEGY">Strategy</option>
                         <option value="ANALYSIS">Analysis</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-zinc-900 uppercase ml-1">Slug (URL)</label>
                       <input 
                         className="w-full p-4 bg-white border border-zinc-200 rounded-md font-mono text-[11px] outline-none shadow-sm"
                         placeholder="my-article-slug"
                         value={magazine.slug}
                         onChange={e => setMagazine({ ...magazine, slug: e.target.value })}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-900 uppercase ml-1">Thumbnail URL</label>
                    <input 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-md font-mono text-[11px] outline-none shadow-sm"
                      placeholder="https://..."
                      value={magazine.thumbnail_url}
                      onChange={e => setMagazine({ ...magazine, thumbnail_url: e.target.value })}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-8 pt-10 border-t border-zinc-200">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Content Engine (HTML/MD)</label>
              <textarea 
                className="w-full min-h-[400px] bg-white border border-zinc-200 rounded-md p-8 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 font-mono shadow-sm"
                placeholder="본문을 마크다운이나 HTML로 작성하세요..."
                value={magazine.content_html}
                onChange={e => setMagazine({ ...magazine, content_html: e.target.value })}
              />
           </div>

           <div className="space-y-6 pt-10 border-t border-zinc-200">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Preferences</label>
              <div className="space-y-3">
                 <button 
                   onClick={() => setMagazine({ ...magazine, is_premium: !magazine.is_premium })}
                   className={clsx("w-full p-4 rounded-xl border flex items-center justify-between transition-all", magazine.is_premium ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500")}
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest">Premium Content</span>
                   {magazine.is_premium && <CheckCircle2 size={16} />}
                 </button>
                 <button 
                   onClick={() => setMagazine({ ...magazine, is_published: !magazine.is_published })}
                   className={clsx("w-full p-4 rounded-xl border flex items-center justify-between transition-all", magazine.is_published ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-zinc-200 text-zinc-500")}
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest">Publish Instantly</span>
                   {magazine.is_published && <CheckCircle2 size={16} />}
                 </button>
              </div>
           </div>
        </aside>

        {/* Right: Live Preview Rendering */}
        <main className="flex-1 bg-zinc-100 overflow-y-auto flex flex-col items-center relative">
           {/* Preview Container (Simulating Mobile/Desktop Frame) */}
           <div className={clsx(
             "bg-white shadow-2xl transition-all duration-700 ease-in-out border-zinc-200 overflow-hidden",
             previewMode === 'mobile' 
               ? "w-[393px] h-[852px] my-10 rounded-[3rem] border-[12px] border-zinc-900 relative shrink-0" 
               : "w-full min-h-full"
           )}>
              <div className={clsx(
                "h-full overflow-y-auto scroll-smooth",
                previewMode === 'mobile' ? "custom-scrollbar" : ""
              )}>
                 {/* Reusing Post Content UI directly */}
                 <PreviewRenderer post={magazine} />
              </div>

              {/* Mobile Interaction Mockup */}
              {previewMode === 'mobile' && (
                <>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-32 bg-zinc-900 rounded-b-3xl" />
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-32 bg-zinc-300 rounded-full" />
                </>
              )}
           </div>
        </main>
      </div>
    </div>
  );
}

// Internal Preview Logic (Reusing styles from actual details page)
function PreviewRenderer({ post }) {
  if (!post.title) return (
    <div className="h-full flex items-center justify-center p-20 text-center">
       <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-loose">
          좌측에서 제목을 작성하면<br/>이곳에 실시간으로 렌더링됩니다.
       </div>
    </div>
  );

  return (
    <div className="bg-white min-h-full pb-32 animate-in fade-in duration-700">
       <div className="pt-24 px-8 max-w-screen-md mx-auto mb-16">
          <div className="flex items-center gap-4 mb-8">
             <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
               {post.category} — ISSUE 2025
             </span>
             {post.is_premium && (
               <span className="bg-zinc-900 text-white text-[9px] font-black px-2 py-0.5 rounded-sm">PREMIUM</span>
             )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-tighter text-zinc-900 mb-8 break-keep">
            {post.title}
          </h1>
          <div className="h-px bg-zinc-100 w-full" />
       </div>

       {post.thumbnail_url && (
         <div className="px-8 max-w-screen-md mx-auto mb-16">
            <div className="aspect-[16/9] bg-zinc-100 rounded-sm border border-zinc-200 overflow-hidden">
               <img src={post.thumbnail_url} className="w-full h-full object-cover" />
            </div>
         </div>
       )}

       <article className="px-8 max-w-screen-md mx-auto">
          <div 
             className="prose prose-zinc prose-lg max-w-none 
                        prose-headings:font-black prose-headings:tracking-tighter 
                        prose-p:text-zinc-600 prose-p:leading-relaxed prose-p:mb-8
                        prose-strong:text-zinc-900 prose-strong:font-black"
             dangerouslySetInnerHTML={{ __html: post.content_html || '<p className="text-zinc-300 text-sm italic">본문 내용을 작성해 주세요...</p>' }}
          />
       </article>
    </div>
  );
}
