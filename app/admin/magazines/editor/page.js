'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Eye, Trash2, Monitor, Smartphone, CheckCircle2, ChevronRight,
  Archive, Send, X, Info
} from 'lucide-react';
import { clsx } from 'clsx';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';
import MagazineRichEditor from '@/components/admin/MagazineRichEditor';
import ThumbnailUploader from '@/components/admin/ThumbnailUploader';
import ResourcesManager from '@/components/admin/ResourcesManager';
import { CATEGORY_OPTIONS as MAGAZINE_CATEGORY_OPTIONS, MAGAZINE_CATEGORIES } from '@/lib/magazineCategories';

export default function MagazineEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [magazine, setMagazine] = useState({
    title: '', slug: '', category: '', thumbnail_url: '', content_html: '',
    excerpt: '', author: 'GIVENEEDS', tags: [],
    is_premium: false, status: 'draft', is_featured: false, sort_order: 0,
    show_ai_block: true
  });

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [loading, setLoading] = useState(!!id);
  const [tagInput, setTagInput] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { if (id) loadMagazine(); }, [id]);

  async function loadMagazine() {
    try {
      const res = await fetch(`/api/magazines?id=${id}&admin=true`);
      const data = await res.json();
      if (data.magazine) {
        setMagazine(data.magazine);
        setTagInput((data.magazine.tags || []).join(', '));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // 제목에서 자동 slug 생성
  function handleTitleChange(title) {
    const autoSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
    setMagazine({ ...magazine, title, slug: magazine.slug || autoSlug });
  }

  // 태그 파싱
  function handleTagChange(value) {
    setTagInput(value);
    const parsed = value.split(',').map(t => t.trim()).filter(Boolean);
    setMagazine({ ...magazine, tags: parsed });
  }

  async function handleSave(status) {
    setSaving(true);
    const updatedData = { ...magazine, status: status || magazine.status || 'draft' };
    // DB에 없는 클라이언트 전용 필드 제거
    const { show_ai_block, ...dbData } = updatedData;
    try {
      const res = await fetch('/api/magazines', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { ...dbData, id } : dbData)
      });
      const result = await res.json();
      if (res.ok) {
        router.push('/admin/magazines');
      } else {
        alert(`저장 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Editor Loading...</div>;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[100] animate-in fade-in duration-500 overflow-hidden">
      <header className="h-16 border-b border-zinc-100 flex items-center justify-between px-6 bg-white shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-50 rounded-lg group transition-all">
               <ArrowLeft size={18} className="text-zinc-400 group-hover:text-zinc-900 group-hover:-translate-x-1" />
            </button>
            <h1 className="text-xs font-black uppercase tracking-widest text-zinc-900">Archive Editor</h1>
         </div>

         <button
           onClick={() => setPreviewOpen(true)}
           className="flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
         >
           <Eye size={14} /> Preview
         </button>

         <div className="flex items-center gap-2">
           <button 
             onClick={() => handleSave('draft')} 
             disabled={saving} 
             className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-md font-black text-[10px] uppercase tracking-widest transition-all"
           >
             <Archive size={14} /> {saving ? 'Syncing...' : '임시 저장'}
           </button>
           <button 
             onClick={() => handleSave('published')} 
             disabled={saving} 
             className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-md font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 disabled:bg-zinc-100"
           >
             <Send size={14} /> {saving ? 'Syncing...' : '라이브 발행'}
           </button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-full max-w-[450px] border-r border-zinc-100 bg-zinc-50/50 flex flex-col overflow-y-auto p-8 space-y-8 shrink-0 custom-scrollbar">
           {/* 기본 정보 */}
           <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Archive Data</label>
              <input className="w-full p-4 bg-white border border-zinc-200 rounded-md font-bold text-base outline-none shadow-sm focus:ring-2 focus:ring-zinc-900/10" placeholder="기사 제목을 입력하세요" value={magazine.title} onChange={e => handleTitleChange(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-3">
                 <select className="w-full p-3 bg-white border border-zinc-200 rounded-md font-bold text-xs outline-none shadow-sm" value={magazine.category} onChange={e => setMagazine({ ...magazine, category: e.target.value })}>
                   {MAGAZINE_CATEGORY_OPTIONS.map(c => <option key={c.value || 'none'} value={c.value}>{c.label}</option>)}
                 </select>
                 <input className="w-full p-3 bg-white border border-zinc-200 rounded-md font-mono text-[11px] outline-none shadow-sm" placeholder="slug (auto)" value={magazine.slug} onChange={e => setMagazine({ ...magazine, slug: e.target.value })} />
              </div>

              {/* 카테고리 가이드 — 어떤 글을 쓸지 형식 안내 */}
              <CategoryGuideTooltip current={magazine.category} />
              
              <input className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm" placeholder="작성자 (기본: GIVENEEDS)" value={magazine.author} onChange={e => setMagazine({ ...magazine, author: e.target.value })} />
              <ThumbnailUploader value={magazine.thumbnail_url} onChange={(url) => setMagazine({ ...magazine, thumbnail_url: url })} />
           </div>

           {/* 요약 & 태그 */}
           <div className="space-y-4 pt-6 border-t border-zinc-200">
              <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">Excerpt & Tags</label>
              <textarea className="w-full min-h-[80px] bg-white border border-zinc-200 rounded-md p-4 text-sm leading-relaxed outline-none shadow-sm" placeholder="매거진 목록에서 보여질 요약문을 작성하세요..." value={magazine.excerpt || ''} onChange={e => setMagazine({ ...magazine, excerpt: e.target.value })} />
              <input className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm" placeholder="태그 (쉼표로 구분: AI, 마케팅, 트렌드)" value={tagInput} onChange={e => handleTagChange(e.target.value)} />
              {magazine.tags && magazine.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {magazine.tags.map((t, i) => (
                    <span key={i} className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-2.5 py-1 rounded-full">#{t}</span>
                  ))}
                </div>
              )}
           </div>

           {/* 첨부 자료 (다운로드 리소스) */}
           <div className="space-y-3 pt-6 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-900 uppercase ml-1">첨부 자료 (다운로드)</label>
                <span className="text-[9px] text-zinc-400">로그인 유저에게 바로 다운로드</span>
              </div>
              <ResourcesManager magazineId={id} />
           </div>

           {/* 토글 옵션 */}
           <div className="pt-6 border-t border-zinc-200 space-y-3">
              <input type="number" className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm outline-none shadow-sm" placeholder="정렬 순서 (숫자, 낮을수록 앞)" value={magazine.sort_order || 0} onChange={e => setMagazine({ ...magazine, sort_order: parseInt(e.target.value) || 0 })} />
              
              <button onClick={() => setMagazine({ ...magazine, is_featured: !magazine.is_featured })} className={clsx("w-full p-4 rounded-xl border flex items-center justify-between transition-all", magazine.is_featured ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-zinc-200 text-zinc-500")}><span className="text-[10px] font-black uppercase tracking-widest">Featured (대형 카드)</span>{magazine.is_featured && <CheckCircle2 size={16} />}</button>
              <button onClick={() => setMagazine({ ...magazine, is_premium: !magazine.is_premium })} className={clsx("w-full p-4 rounded-xl border flex items-center justify-between transition-all", magazine.is_premium ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500")}><span className="text-[10px] font-black uppercase tracking-widest">Premium Content</span>{magazine.is_premium && <CheckCircle2 size={16} />}</button>
              <button onClick={() => setMagazine({ ...magazine, show_ai_block: !magazine.show_ai_block })} className={clsx("w-full p-4 rounded-xl border flex items-center justify-between transition-all", magazine.show_ai_block ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-white border-zinc-200 text-zinc-500")}><span className="text-[10px] font-black uppercase tracking-widest">⚡ AI 솔루션 블록 표시</span>{magazine.show_ai_block && <CheckCircle2 size={16} />}</button>
           </div>
        </aside>

        <main className="flex-1 bg-white overflow-hidden flex flex-col">
           <MagazineRichEditor
             value={magazine.content_html}
             onChange={(html) => setMagazine((m) => ({ ...m, content_html: html }))}
           />
        </main>
      </div>

      {/* ─── Preview Modal ─── */}
      {previewOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-zinc-100 shrink-0">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900">Live Preview</h2>
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button onClick={() => setPreviewMode('desktop')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase", previewMode === 'desktop' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}><Monitor size={14} /> Desktop</button>
              <button onClick={() => setPreviewMode('mobile')} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase", previewMode === 'mobile' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}><Smartphone size={14} /> Mobile</button>
            </div>
            <button onClick={() => setPreviewOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
              <X size={18} className="text-zinc-600" />
            </button>
          </div>
          <div className="flex-1 bg-zinc-100 overflow-y-auto flex flex-col items-center">
            <div className={clsx("bg-white shadow-2xl transition-all duration-500 ease-in-out border-zinc-200 overflow-hidden", previewMode === 'mobile' ? "w-[393px] h-[852px] my-10 rounded-[3rem] border-[12px] border-zinc-900 relative shrink-0" : "w-full min-h-full")}>
              <div className="h-full overflow-y-auto scroll-smooth custom-scrollbar">
                <PreviewContent post={magazine} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewContent({ post }) {
  if (!post.title) return <div className="h-full flex items-center justify-center p-20 text-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-loose">좌측에서 제목을 작성하면<br/>이곳에 실시간으로 렌더링됩니다.</div>;
  return (
    <div className="bg-white min-h-full pb-32 animate-in fade-in duration-700">
       <div className="pt-20 px-8 max-w-screen-md mx-auto mb-12">
          <div className="flex items-center gap-4 mb-6">
             <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">{post.category}</span>
             {post.is_premium && <span className="bg-zinc-900 text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">PREMIUM</span>}
             {post.is_featured && <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase">FEATURED</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-[1.1] tracking-tighter text-zinc-900 mb-4 break-keep">{post.title}</h1>
          {post.excerpt && <p className="text-sm text-zinc-500 leading-relaxed mb-4">{post.excerpt}</p>}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((t, i) => <span key={i} className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full">#{t}</span>)}
            </div>
          )}
          <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 text-[10px] text-zinc-400">
            <span className="font-bold uppercase">BY {post.author || 'GIVENEEDS'}</span>
            <span>•</span>
            <span>순서: {post.sort_order || 0}</span>
          </div>
       </div>
       {post.thumbnail_url && <div className="px-8 max-w-screen-md mx-auto mb-12"><div className="aspect-[16/9] bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden"><img src={post.thumbnail_url} className="w-full h-full object-cover" /></div></div>}
       <article className="px-8 max-w-screen-md mx-auto prose prose-zinc prose-lg max-w-none prose-p:text-zinc-600 prose-headings:font-black prose-headings:tracking-tighter" dangerouslySetInnerHTML={{ __html: post.content_html }} />
       
       {/* AI 솔루션 블록 프리뷰 */}
       {post.show_ai_block && (
         <div className="px-8 max-w-screen-md mx-auto mt-16 mb-8">
           <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
             AI 솔루션 블록 (활성화됨)
           </div>
           <AiSolutionBlock />
         </div>
       )}
       {!post.show_ai_block && (
         <div className="px-8 max-w-screen-md mx-auto mt-16 mb-8">
           <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2 border border-dashed border-zinc-200 rounded-xl p-4 justify-center">
             <span className="w-2 h-2 rounded-full bg-zinc-300" />
             AI 솔루션 블록 꺼짐
           </div>
         </div>
       )}
    </div>
  );
}

function CategoryGuideTooltip({ current }) {
  const isUncat = !current;
  const meta = MAGAZINE_CATEGORIES.find(c => c.value === current);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest">
        <Info size={12} />
        {isUncat ? '미분류 안내' : `${meta?.label} 작성 가이드`}
      </div>

      {isUncat ? (
        <p className="text-[12px] leading-relaxed text-amber-900">
          맞는 카테고리가 없으면 비워두세요. <strong>"모든 글" 뷰 상단</strong>에 매일 12시(KST) 랜덤 순서로 노출됩니다.
          어떤 주제든 자유롭게 써도 되지만, 가능하면 4개 카테고리 중 하나에 맞춰 쓰면 검색·추천에서 더 잘 잡힙니다.
        </p>
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-amber-900">{meta.description}</p>
          <div className="pt-1">
            <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">예시 제목</div>
            <ul className="text-[11px] text-amber-900 space-y-0.5 list-disc pl-4">
              {meta.examples.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
