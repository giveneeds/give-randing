'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Clock, 
  Tag, 
  ExternalLink, 
  Search, 
  Filter, 
  ChevronRight,
  MoreVertical,
  Layers,
  Eye,
  Type,
  ImageIcon,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function AdminMagazine() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      let data;
      if (isDummyMode) {
        data = DUMMY_MAGAZINES;
      } else {
        const { data: magData, error } = await supabase
          .from('magazines')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = magData;
      }
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (post) => {
    setCurrentPost({ ...post });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentPost({
      slug: '',
      title: '',
      category: 'INSIGHT',
      thumbnail_url: '',
      content_html: '',
      is_premium: false,
      created_at: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[var(--admin-text-muted)]">매거진 아티클 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--admin-text-main)] tracking-tighter uppercase">매거진 관리</h1>
          <p className="text-[var(--admin-text-muted)] text-sm mt-1 tracking-tight">전문가적 통찰력을 공유하고 브랜드 가치를 높이는 아티클을 관리하세요.</p>
        </div>
        <button 
          onClick={handleCreate} 
          className="flex items-center justify-center gap-2 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] text-white px-5 py-2.5 rounded-md font-bold text-sm transition-all shadow-sm tracking-widest uppercase"
        >
          <Plus size={18} /> 새 아티클 작성
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-md border border-[var(--admin-border)] shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="제목 또는 카테고리 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all font-medium"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <Filter size={16} /> 필터
          </button>
        </div>
      </div>

      {/* Magazine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredPosts.length > 0 ? filteredPosts.map(post => (
          <div key={post.id} className="group bg-white rounded-md border border-[var(--admin-border)] overflow-hidden hover:border-zinc-400 transition-all duration-300 flex flex-col shadow-sm">
            <div className="aspect-[16/10] relative overflow-hidden bg-zinc-100">
              {post.thumbnail_url ? (
                <img 
                  src={post.thumbnail_url} 
                  alt={post.title} 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <ImageIcon size={48} strokeWidth={1} />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                {post.is_premium && (
                  <span className="bg-zinc-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-sm tracking-widest border border-zinc-700">PREMIUM</span>
                )}
                <span className="bg-white/90 backdrop-blur-md text-zinc-900 border border-zinc-200 text-[10px] font-bold px-3 py-1.5 rounded-sm tracking-widest uppercase">{post.category}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                <Link href={`/magazine/${post.slug}`} target="_blank" className="bg-white text-zinc-900 border border-zinc-200 px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 uppercase tracking-widest">
                  <Eye size={14} /> 미리보기
                </Link>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 mb-3 tracking-widest">
                <Clock size={12} strokeWidth={2.5} /> {new Date(post.created_at).toLocaleDateString()}
              </div>
              <h3 className="font-bold text-lg text-zinc-900 leading-snug mb-6 transition-colors line-clamp-2">{post.title}</h3>
              
              <div className="mt-auto pt-6 border-t border-zinc-100 flex justify-between items-center">
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(post)} className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-900 transition-all">
                    <Edit3 size={18} />
                  </button>
                  <button className="p-2.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                  Slug: {post.slug}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white rounded-md border border-dashed border-[var(--admin-border)]">
            <p className="text-[var(--admin-text-muted)] text-sm italic">작성된 아티클이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Editor Slide-over Panel */}
      {isEditing && (
        <div className="fixed inset-0 bg-zinc-900/80 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ease-out border-l border-zinc-200">
            {/* Editor Header */}
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-md flex items-center justify-center text-white border border-black">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">에디토리얼 에디터</h2>
                  <p className="text-xs text-zinc-500 font-medium tracking-tight">지정된 디자인 포맷의 프리미엄 콘텐츠를 작성하세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(false)} 
                className="p-2 hover:bg-zinc-200 rounded-md transition-colors text-zinc-400 hover:text-zinc-900"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Editor Toolbar (Conceptual) */}
            <div className="px-8 py-3 border-b border-slate-50 flex gap-4 bg-white sticky top-0 z-10">
              <button className="p-2 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-900 transition-colors"><Type size={18} /></button>
              <button className="p-2 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-900 transition-colors"><ImageIcon size={18} /></button>
              <button className="p-2 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-900 transition-colors"><Layers size={18} /></button>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 자동 저장됨
                </span>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-white">
              <div className="space-y-10 max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">카테고리</label>
                       <select 
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-bold text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all" 
                        value={currentPost.category} 
                        onChange={e => setCurrentPost({...currentPost, category: e.target.value})}
                      >
                        <option value="INSIGHT">INSIGHT</option>
                        <option value="CASE STUDY">CASE STUDY</option>
                        <option value="REPORT">REPORT</option>
                        <option value="GUIDE">GUIDE</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">상태</label>
                       <div 
                        onClick={() => setCurrentPost({...currentPost, is_premium: !currentPost.is_premium})}
                        className={`w-full p-4 rounded-md border flex items-center justify-between cursor-pointer transition-all ${currentPost.is_premium ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}
                      >
                        <span className="text-sm font-bold tracking-tight">PREMIUM GATING</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${currentPost.is_premium ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                          <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${currentPost.is_premium ? 'left-5' : 'left-1'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">아티클 제목</label>
                    <textarea 
                      className="text-4xl font-black uppercase w-full border-none focus:ring-0 p-0 placeholder-zinc-200 resize-none min-h-[120px] bg-transparent leading-[0.9] tracking-tighter" 
                      placeholder="매력적인 제목을 입력하세요..." 
                      value={currentPost.title} 
                      onChange={e => setCurrentPost({...currentPost, title: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">URL 슬러그</label>
                      <input 
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md font-mono text-xs outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-zinc-800" 
                        value={currentPost.slug} 
                        onChange={e => setCurrentPost({...currentPost, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">배포 일시</label>
                      <div className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-bold text-zinc-500 flex items-center gap-2">
                        <Clock size={14} /> {new Date(currentPost.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">썸네일 이미지</label>
                    <div className="group relative w-full aspect-[21/9] rounded-md bg-zinc-50 overflow-hidden border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-all">
                      {currentPost.thumbnail_url ? (
                        <>
                          <img src={currentPost.thumbnail_url} className="w-full h-full object-cover grayscale" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                            이미지 변경하기
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="mx-auto mb-2 text-zinc-300" size={32} />
                          <p className="text-[10px] font-bold text-zinc-400">클릭하여 이미지 업로드</p>
                        </div>
                      )}
                      <input 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        placeholder="썸네일 링크 직접 입력"
                        onChange={e => setCurrentPost({...currentPost, thumbnail_url: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">본문 콘텐츠</label>
                    <textarea 
                      className="w-full min-h-[400px] bg-transparent border-none focus:ring-0 p-0 text-lg text-zinc-800 leading-relaxed placeholder-zinc-200 resize-none font-sans" 
                      placeholder="여기에 내용을 자유롭게 작성하세요. Markdown 스타일을 권장합니다..." 
                      value={currentPost.content_html} 
                      onChange={e => setCurrentPost({...currentPost, content_html: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Footer */}
            <div className="p-8 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/20">
              <div className="flex items-center gap-2">
                 <button className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">임시 저장</button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="px-6 py-3 text-zinc-500 rounded-md font-bold text-sm hover:bg-zinc-100 transition-colors uppercase tracking-widest border border-zinc-200"
                >
                  편집 취소
                </button>
                <button 
                  onClick={() => { setIsEditing(false); /* Save logic */ }} 
                  className="px-10 py-3 bg-zinc-900 hover:bg-black text-white rounded-md font-bold text-sm shadow-sm transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-widest"
                >
                  <CheckCircle2 size={18} /> 아티클 발행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
