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
  // 포스트를 칸칸이 나누지 않고 하나의 본문으로 편집. 빈 줄(엔터 2번)로 포스트를 구분하고,
  // 발행/복사 시 포스트가 2개 이상이면 (1/N) 마커를 자동으로 붙인다.
  const [bodyText, setBodyText] = useState('');

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
      setBodyText((data.row?.posts || []).map((p) => p.body || '').join('\n\n'));
      setPublishedUrl(data.row?.published_url || '');
    } catch (e) {
      alert('드래프트 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => { load(); }, [load]);

  // 빈 줄 기준으로 포스트 분리. 본문 내 단일 줄바꿈은 보존.
  const splitPosts = useMemo(() => (
    bodyText.split(/\n{2,}/).map((s) => s.replace(/\s+$/, '')).filter((s) => s.trim().length > 0)
  ), [bodyText]);

  const totalChars = useMemo(() => bodyText.replace(/\n{2,}/g, '\n').length, [bodyText]);

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

  async function saveAll() {
    if (!draft) return;
    const posts = splitPosts.map((body, i) => ({ index: i + 1, body, char_count: body.length }));
    await patchDraft({
      title: draft.title,
      posts,
      cta: draft.cta,
      hashtags: draft.hashtags,
    });
  }

  async function markPublished() {
    if (!confirm('이 스레드를 발행 완료로 표시할까요?')) return;
    const posts = splitPosts.map((body, i) => ({ index: i + 1, body, char_count: body.length }));
    await patchDraft({ posts, status: 'published', published_url: publishedUrl || null });
  }

  // 발행용 합본 텍스트. 포스트 2개 이상이면 (1/N) 마커, 1개면 마커 없이.
  function buildPublishText() {
    const body = splitPosts.length > 1
      ? splitPosts.map((p, i) => `(${i + 1}/${splitPosts.length})\n${p}`).join('\n\n')
      : (splitPosts[0] || '');
    return body
      + (draft?.cta ? `\n\n${draft.cta}` : '')
      + (draft?.hashtags?.length ? `\n\n${draft.hashtags.join(' ')}` : '');
  }

  function copyAll() {
    if (!draft) return;
    navigator.clipboard.writeText(buildPublishText());
    alert('발행용 텍스트 복사 완료');
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
          총 {totalChars.toLocaleString('ko-KR')}자 · {splitPosts.length}포스트
        </div>
      </div>

      <input
        value={draft.title || ''}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="내부 라벨"
        className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3 text-sm font-bold text-[var(--admin-text-main)] outline-none focus:border-zinc-400"
      />

      <section className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">
            본문 · {splitPosts.length}포스트 (빈 줄로 구분)
          </span>
          <span className="text-[10px] text-[var(--admin-text-muted)]">
            발행 시 2개 이상이면 (1/N) 마커 자동
          </span>
        </div>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={16}
          placeholder="본문을 입력하세요. 포스트를 나누려면 빈 줄(엔터 2번)로 구분합니다."
          className="min-h-[360px] w-full resize-y rounded-md border border-transparent bg-[var(--admin-bg)] p-3 text-sm leading-relaxed text-[var(--admin-text-main)] outline-none focus:border-[var(--admin-border)]"
        />
      </section>

      {splitPosts.length > 0 && (
        <section className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">발행용 미리보기 (복사 그대로)</span>
            <button onClick={copyAll} className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]" title="복사">
              <Copy size={12} /> 복사
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--admin-text-main)] font-sans">{buildPublishText()}</pre>
        </section>
      )}

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
