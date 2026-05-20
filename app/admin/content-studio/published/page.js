'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ExternalLink, BookOpen, Calendar } from 'lucide-react';

// 매거진으로 흘려보낸 콘텐츠 리스트.
// 현재는 magazines.status='published' 와 created_at 기준으로 단순 노출.
// 추후 agent_items → magazines 연결이 채워지면 "어떤 자료에서 시작됐는지"도 표시.
export default function PublishedPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select('id, slug, title, category, status, thumbnail_url, created_at, updated_at, is_featured')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      alert('발행 콘텐츠 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">매거진으로 발행된 콘텐츠. 검토함에서 채택된 글이 작가 검수를 거쳐 여기로 옵니다.</p>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[var(--admin-border)] rounded-md py-24 text-center text-zinc-400 text-sm">
          아직 발행된 콘텐츠가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((m) => (
            <a
              key={m.id}
              href={`/magazine/${m.slug}`}
              target="_blank"
              rel="noreferrer"
              className="block bg-white border border-[var(--admin-border)] rounded-md p-4 shadow-sm hover:shadow-md transition group"
            >
              <div className="aspect-video bg-zinc-100 rounded-md mb-3 overflow-hidden">
                {m.thumbnail_url ? (
                  <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300"><BookOpen size={28} /></div>
                )}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{m.category || 'UNCATEGORIZED'}</div>
              <h3 className="font-black text-sm text-zinc-900 line-clamp-2 group-hover:underline mb-2">{m.title}</h3>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Calendar size={11} /> {new Date(m.created_at).toLocaleDateString('ko-KR')}
                {m.is_featured && <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">FEATURED</span>}
                <ExternalLink size={11} className="text-zinc-300" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
