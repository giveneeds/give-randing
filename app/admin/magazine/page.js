'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import { Plus, Trash2, Edit3, BookOpen, Clock, Tag, ExternalLink } from 'lucide-react';

export default function AdminMagazine() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);

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
      title: '새로운 아티클 제목',
      category: 'INSIGHT',
      thumbnail_url: '',
      content_html: '',
      is_premium: false
    });
    setIsEditing(true);
  };

  if (loading) return <div className="p-8 text-gray-500">매거진 데이터를 불러오고 있습니다...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold mb-2">📖 매거진 관리</h1>
          <p className="text-gray-500">브랜드 전문성을 보여주는 에디토리얼 글을 발행하고 관리하세요.</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-bold hover:bg-primary transition-colors">
          <Plus size={18} /> 새 아티클 작성
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white border rounded-2xl overflow-hidden group hover:border-primary transition-all hover:shadow-xl">
            <div className="aspect-video relative overflow-hidden bg-gray-100">
              <img src={post.thumbnail_url} alt={post.title} className="object-cover w-full h-full" />
              {post.is_premium && (
                <span className="absolute top-3 left-3 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded">PREMIUM</span>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-primary tracking-widest">{post.category}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-4 line-clamp-2 min-h-[3.5rem]">{post.title}</h3>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(post)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                <a href={`/magazine/${post.slug}`} target="_blank" className="p-2 hover:bg-zinc-100 rounded-lg text-gray-400">
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Magazine Editor Modal (Mockup) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-4xl h-full p-12 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start mb-12">
              <h2 className="text-3xl font-bold">에디토리얼 작성</h2>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-black">닫기</button>
            </div>
            
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">카테고리</label>
                  <select className="w-full p-4 bg-gray-50 border-none rounded-xl font-medium" value={currentPost.category} onChange={e => setCurrentPost({...currentPost, category: e.target.value})}>
                    <option value="INSIGHT">INSIGHT</option>
                    <option value="CASE STUDY">CASE STUDY</option>
                    <option value="GUIDE">GUIDE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">프리미엄 여부 (DB 수집 트리거)</label>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input type="checkbox" checked={currentPost.is_premium} onChange={e => setCurrentPost({...currentPost, is_premium: e.target.checked})} className="w-5 h-5 rounded" />
                    <span className="font-medium text-sm">리드 폼 연동 (Premium 콘텐츠)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">아티클 제목</label>
                <input className="text-3xl font-bold w-full border-none focus:ring-0 p-0 placeholder-gray-200" placeholder="제목을 입력하세요..." value={currentPost.title} onChange={e => setCurrentPost({...currentPost, title: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">URL 슬러그</label>
                <input className="w-full p-4 bg-gray-50 border-none rounded-xl font-mono text-sm" value={currentPost.slug} onChange={e => setCurrentPost({...currentPost, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">썸네일 이미지 URL</label>
                <input className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm" value={currentPost.thumbnail_url} onChange={e => setCurrentPost({...currentPost, thumbnail_url: e.target.value})} placeholder="https://..." />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">본문 (Markdown/HTML 지원 예정)</label>
                <textarea className="w-full h-80 p-6 bg-gray-50 border-none rounded-2xl resize-none" placeholder="여기에 내용을 작성하세요..." value={currentPost.content_html} onChange={e => setCurrentPost({...currentPost, content_html: e.target.value})}></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-12 pb-12">
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 border border-gray-200 rounded-full font-bold text-gray-400">취소</button>
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 bg-zinc-900 text-white rounded-full font-bold hover:bg-primary transition-colors">아티클 발행하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
