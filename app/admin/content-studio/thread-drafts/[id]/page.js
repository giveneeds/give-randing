'use client';

import { useCallback, use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Loader2, Plus, Save, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const THREAD_POST_MAX_CHARS = 1000;
const THREAD_POST_WARNING_CHARS = 850;

export default function ThreadDraftEditorPage({ params }) {
  const { id } = use(params);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content-studio/thread-drafts/${id}`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setDraft(data.row);
      setPublishedUrl(data.row?.published_url || '');
    } catch (e) {
      alert('드래프트 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const totalChars = useMemo(() => (
    (draft?.posts || []).reduce((sum, post) => sum + (post.body || '').length, 0)
  ), [draft?.posts]);

  async function patchDraft(patch) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/content-studio/thread-drafts/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setDraft(data.row);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updatePost(idx, body) {
    if (!draft) return;
    const posts = [...(draft.posts || [])];
    posts[idx] = { ...posts[idx], body, char_count: body.length };
    setDraft({ ...draft, posts });
  }

  function addPost() {
    if (!draft) return;
    const posts = [...(draft.posts || [])];
    posts.push({ index: posts.length + 1, body: '', char_count: 0 });
    setDraft({ ...draft, posts });
  }

  function removePost(idx) {
    if (!draft) return;
    const posts = (draft.posts || [])
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, index: i + 1 }));
    setDraft({ ...draft, posts });
  }

  async function saveAll() {
    if (!draft) return;
    await patchDraft({
      title: draft.title,
      posts: draft.posts,
      cta: draft.cta,
      hashtags: draft.hashtags,
    });
  }

  async function markPublished() {
    if (!confirm('이 스레드를 발행 완료로 표시할까요?')) return;
    await patchDraft({ status: 'published', published_url: publishedUrl || null });
  }

  function copyAll() {
    if (!draft) return;
    const text = (draft.posts || []).map((p, i) => `[${i + 1}/${(draft.posts || []).length}]\n${p.body}`).join('\n\n---\n\n')
      + (draft.cta ? `\n\n${draft.cta}` : '')
      + (draft.hashtags?.length ? `\n\n${draft.hashtags.join(' ')}` : '');
    navigator.clipboard.writeText(text);
    alert('전체 스레드 복사 완료');
  }

  function copyPost(idx) {
    const body = (draft?.posts || [])[idx]?.body || '';
    navigator.clipboard.writeText(body);
    alert(`포스트 ${idx + 1} 복사됨`);
  }

  if (loading || !draft) {
    return <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/admin/content-studio/published" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
          <ArrowLeft size={14} /> 발행 목록
        </Link>
        <div className="text-xs font-bold text-[var(--admin-text-muted)]">
          총 {totalChars.toLocaleString('ko-KR')}자 · {(draft.posts || []).length}포스트
        </div>
      </div>

      <input
        value={draft.title || ''}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="내부 라벨"
        className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3 text-sm font-bold text-[var(--admin-text-main)] outline-none focus:border-zinc-400"
      />

      <div className="space-y-3">
        {(draft.posts || []).map((p, i) => {
          const length = (p.body || '').length;
          return (
            <section key={i} className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">
                  포스트 {i + 1} / {draft.posts.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono ${length > THREAD_POST_MAX_CHARS ? 'text-red-500 font-bold' : length > THREAD_POST_WARNING_CHARS ? 'text-amber-600 font-bold' : 'text-[var(--admin-text-muted)]'}`}>
                    {length} / {THREAD_POST_MAX_CHARS}
                  </span>
                  <button onClick={() => copyPost(i)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]" title="복사">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => removePost(i)} className="text-zinc-300 hover:text-red-500" title="삭제">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <textarea
                value={p.body || ''}
                onChange={(e) => updatePost(i, e.target.value)}
                rows={7}
                className="min-h-[160px] w-full resize-y rounded-md border border-transparent bg-[var(--admin-bg)] p-3 text-sm leading-relaxed text-[var(--admin-text-main)] outline-none focus:border-[var(--admin-border)]"
              />
            </section>
          );
        })}
      </div>

      <button onClick={addPost} className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--admin-border)] py-3 text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
        <Plus size={14} /> 포스트 추가
      </button>

      <section className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 space-y-3">
        <input
          value={draft.cta || ''}
          onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
          placeholder="CTA"
          className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text-main)] outline-none"
        />
        <input
          value={(draft.hashtags || []).join(' ')}
          onChange={(e) => setDraft({ ...draft, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
          placeholder="#해시태그"
          className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text-main)] outline-none"
        />
        <input
          value={publishedUrl}
          onChange={(e) => setPublishedUrl(e.target.value)}
          placeholder="발행 URL"
          className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text-main)] outline-none"
        />
      </section>

      <div className="sticky bottom-4 ml-auto flex w-fit items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)]/90 px-3 py-2 shadow-lg backdrop-blur">
        <button onClick={copyAll} className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] px-4 py-2 text-xs font-bold text-[var(--admin-text-main)] hover:bg-[var(--admin-bg)]">
          <Copy size={14} /> 전체 복사
        </button>
        <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          저장
        </button>
        <button onClick={markPublished} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
          <Send size={14} /> 발행 완료
        </button>
      </div>
    </div>
  );
}
