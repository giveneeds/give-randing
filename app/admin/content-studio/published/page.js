'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, ExternalLink, BookOpen, Calendar, MessageSquare, FileText, Trash2, Sparkles, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { key: 'thread_drafts', label: '스레드', icon: MessageSquare },
  { key: 'magazines', label: '매거진', icon: BookOpen },
];

const STATUS_BUCKETS = [
  { key: 'draft', label: '초안' },
  { key: 'published', label: '발행됨' },
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
                active ? 'border-[var(--admin-text-main)] text-[var(--admin-text-main)]' : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]'
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
                statusFilter === b.key
                  ? 'bg-[var(--admin-text-main)] text-[var(--admin-card-bg)] border-[var(--admin-text-main)]'
                  : 'bg-[var(--admin-card-bg)] text-[var(--admin-text-muted)] border-[var(--admin-border)] hover:text-[var(--admin-text-main)]'
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
      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md py-24 text-center text-[var(--admin-text-muted)] text-sm">
        {statusFilter === 'published' ? '아직 발행된 스레드가 없습니다.' : '아직 스레드 드래프트가 없습니다. 검토함에서 [스레드 만들기]로 시작하세요.'}
      </div>
    );
  }

  // 같은 묶음(planning_session_id)끼리 그룹핑. 묶음 없는 것(수동 생성 등)은 단독 그룹.
  const groups = [];
  const byKey = new Map();
  for (const d of rows) {
    const key = d.planning_session_id || `solo-${d.id}`;
    if (!byKey.has(key)) {
      const g = { key, items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    byKey.get(key).items.push(d);
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (g.items.length > 1
        ? <ThreadGroupCard key={g.key} items={g.items} />
        : <ThreadCard key={g.key} d={g.items[0]} />
      ))}
    </div>
  );
}

function ThreadGroupCard({ items }) {
  const [open, setOpen] = useState(false);
  const lead = items[0];
  // 대표 제목 — "후보 N · " prefix 떼고 공통 주제만.
  const groupTitle = (lead.title || '').replace(/^\s*후보\s*\d+\s*·\s*/, '') || '(제목 없음)';
  const published = items.filter((d) => d.status === 'published').length;
  return (
    <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--admin-bg)] transition"
      >
        {open ? <ChevronDown size={16} className="shrink-0 text-[var(--admin-text-muted)]" /> : <ChevronRight size={16} className="shrink-0 text-[var(--admin-text-muted)]" />}
        <Layers size={15} className="shrink-0 text-violet-500" />
        <span className="font-black text-sm text-[var(--admin-text-main)] line-clamp-1 flex-1">{groupTitle}</span>
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
          variant {items.length}개
        </span>
        {published > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-emerald-700">{published}건 발행</span>
        )}
        <span className="shrink-0 text-[10px] text-[var(--admin-text-muted)]">{new Date(lead.created_at).toLocaleDateString('ko-KR')}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--admin-border)] divide-y divide-[var(--admin-border)]">
          {items.map((d, i) => (
            <Link
              key={d.id}
              href={`/admin/content-studio/thread-drafts/${d.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--admin-bg)] transition"
            >
              <span className="shrink-0 mt-0.5 text-[10px] font-black text-[var(--admin-text-muted)] w-8">V{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-[10px] mb-1">
                  {d.hook_pattern && <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{d.hook_pattern}</span>}
                  <span className="text-[var(--admin-text-muted)]">{(d.posts || []).length}p</span>
                  {d.status === 'published' && <span className="text-emerald-700 font-bold">발행됨</span>}
                </div>
                <div className="font-bold text-xs text-[var(--admin-text-main)] line-clamp-1">{d.title || '(제목 없음)'}</div>
                <p className="text-[11px] text-[var(--admin-text-muted)] line-clamp-2 mt-0.5">{(d.posts || [])[0]?.body || ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadCard({ d }) {
  return (
    <Link
      href={`/admin/content-studio/thread-drafts/${d.id}`}
      className="block bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-4 shadow-sm hover:shadow-md transition space-y-2"
    >
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">{d.format_type}</span>
        {d.theme?.name && <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">📌 {d.theme.name}</span>}
        {d.auto_generated && (
          <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 font-bold px-2 py-0.5 rounded-full">
            <Sparkles size={10} /> 자동
          </span>
        )}
        <span className="ml-auto text-[var(--admin-text-muted)]">{new Date(d.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
      <h3 className="font-black text-sm text-[var(--admin-text-main)] line-clamp-2">{d.title || '(제목 없음)'}</h3>
      <p className="text-xs text-[var(--admin-text-muted)] line-clamp-3">{(d.posts || [])[0]?.body || ''}</p>
      {d.selection_reason && (
        <p className="text-[10px] text-violet-600 italic line-clamp-2 border-l-2 border-violet-200 pl-2">{d.selection_reason}</p>
      )}
      <div className="flex items-center justify-between text-[10px] text-[var(--admin-text-muted)] pt-1">
        <span>
          {(d.posts || []).length} 포스트
          {Array.isArray(d.rejected_candidates) && d.rejected_candidates.length > 0 && (
            <span className="ml-2">· 폐기 {d.rejected_candidates.length}건</span>
          )}
        </span>
        {d.published_url && (
          <a href={d.published_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
            발행본 보기 <ExternalLink size={10} />
          </a>
        )}
      </div>
    </Link>
  );
}

function MagazineList({ rows, statusFilter }) {
  if (rows.length === 0) {
    return (
      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md py-24 text-center text-[var(--admin-text-muted)] text-sm">
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
          className="block bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="aspect-video bg-zinc-100 dark:bg-slate-800 rounded-md mb-3 overflow-hidden">
            {m.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300"><BookOpen size={28} /></div>
            )}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)] mb-1">{m.category || 'UNCATEGORIZED'}</div>
          <h3 className="font-black text-sm text-[var(--admin-text-main)] line-clamp-2 mb-2">{m.title}</h3>
          <div className="flex items-center gap-2 text-[11px] text-[var(--admin-text-muted)]">
            <Calendar size={11} /> {new Date(m.created_at).toLocaleDateString('ko-KR')}
            {m.is_featured && <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">FEATURED</span>}
          </div>
        </a>
      ))}
    </div>
  );
}
