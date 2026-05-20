'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, ExternalLink, BookOpen, Calendar, MessageSquare, FileText, Trash2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { key: 'thread_drafts', label: '스레드', icon: MessageSquare },
  { key: 'magazines', label: '매거진', icon: BookOpen },
];

const STATUS_BUCKETS = [
  { key: 'draft', label: '초안', cls: 'bg-zinc-100 text-zinc-600' },
  { key: 'published', label: '발행됨', cls: 'bg-emerald-50 text-emerald-700' },
];

export default function PublishedPage() {
  const [activeTab, setActiveTab] = useState('thread_drafts');
  const [statusFilter, setStatusFilter] = useState('draft');
  const [rows, setRows] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const loadThreads = useCallback(async (status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('status', status);
      const res = await fetch(`/api/admin/content-studio/thread-drafts?${params.toString()}`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      alert('스레드 드래프트 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const loadMagazines = useCallback(async (status) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .select('id, slug, title, category, status, thumbnail_url, created_at, updated_at, is_featured')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setMagazines(data || []);
    } catch (e) {
      alert('매거진 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'thread_drafts') loadThreads(statusFilter);
    else loadMagazines(statusFilter === 'draft' ? 'draft' : 'published');
  }, [activeTab, statusFilter, loadThreads, loadMagazines]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">
        매거진과 스레드는 데이터 구조가 달라 별도 트랙으로 관리합니다. 검토함에서 [스레드 만들기] 누른 결과는 여기 스레드 탭에 쌓입니다.
      </p>

      <div className="flex items-center gap-1 border-b border-[var(--admin-border)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition',
                active ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
              )}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          {STATUS_BUCKETS.map((b) => (
            <button
              key={b.key}
              onClick={() => setStatusFilter(b.key)}
              className={clsx(
                'px-3 py-1 rounded-full text-[10px] font-bold border transition',
                statusFilter === b.key ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : activeTab === 'thread_drafts' ? (
        <ThreadList rows={rows} statusFilter={statusFilter} />
      ) : (
        <MagazineList rows={magazines} statusFilter={statusFilter} />
      )}
    </div>
  );
}

function ThreadList({ rows, statusFilter }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[var(--admin-border)] rounded-md py-24 text-center text-zinc-400 text-sm">
        {statusFilter === 'published' ? '아직 발행된 스레드가 없습니다.' : '아직 스레드 드래프트가 없습니다. 검토함에서 [스레드 만들기]로 시작하세요.'}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map((d) => (
        <Link
          key={d.id}
          href={`/admin/content-studio/thread-drafts/${d.id}`}
          className="block bg-white border border-[var(--admin-border)] rounded-md p-4 shadow-sm hover:shadow-md transition space-y-2"
        >
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">{d.format_type}</span>
            {d.theme?.name && <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">📌 {d.theme.name}</span>}
            {d.auto_generated && (
              <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 font-bold px-2 py-0.5 rounded-full">
                <Sparkles size={10} /> 자동
              </span>
            )}
            <span className="ml-auto text-zinc-400">{new Date(d.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
          <h3 className="font-black text-sm text-zinc-900 line-clamp-2">{d.title || '(제목 없음)'}</h3>
          <p className="text-xs text-zinc-500 line-clamp-3">{(d.posts || [])[0]?.body || ''}</p>
          {d.selection_reason && (
            <p className="text-[10px] text-violet-600 italic line-clamp-2 border-l-2 border-violet-200 pl-2">{d.selection_reason}</p>
          )}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
            <span>
              {(d.posts || []).length} 포스트
              {Array.isArray(d.rejected_candidates) && d.rejected_candidates.length > 0 && (
                <span className="ml-2">· 폐기 {d.rejected_candidates.length}건</span>
              )}
            </span>
            {d.published_url && (
              <a href={d.published_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900">
                발행본 보기 <ExternalLink size={10} />
              </a>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function MagazineList({ rows, statusFilter }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[var(--admin-border)] rounded-md py-24 text-center text-zinc-400 text-sm">
        {statusFilter === 'published' ? '아직 발행된 매거진이 없습니다.' : '아직 매거진 드래프트가 없습니다.'}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((m) => (
        <a
          key={m.id}
          href={statusFilter === 'published' ? `/magazine/${m.slug}` : `/admin/magazines/editor?id=${m.id}`}
          target={statusFilter === 'published' ? '_blank' : undefined}
          rel="noreferrer"
          className="block bg-white border border-[var(--admin-border)] rounded-md p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="aspect-video bg-zinc-100 rounded-md mb-3 overflow-hidden">
            {m.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300"><BookOpen size={28} /></div>
            )}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{m.category || 'UNCATEGORIZED'}</div>
          <h3 className="font-black text-sm text-zinc-900 line-clamp-2 mb-2">{m.title}</h3>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <Calendar size={11} /> {new Date(m.created_at).toLocaleDateString('ko-KR')}
            {m.is_featured && <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">FEATURED</span>}
          </div>
        </a>
      ))}
    </div>
  );
}
