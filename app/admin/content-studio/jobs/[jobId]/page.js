'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Loader2, ChevronLeft, ExternalLink, MessageSquare, XCircle,
  Sparkles, Clock, Hash, FileText, GitBranch, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function JobHubPage({ params }) {
  const { jobId } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showRejected, setShowRejected] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/content-studio/jobs/${jobId}`, { headers: await authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '조회 실패');
      setData(d);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [jobId, authHeaders]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
  );
  if (err) return (
    <div className="p-8 text-sm text-red-600">{err}</div>
  );
  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4">
        <Link href="/admin/content-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
          <ChevronLeft className="w-3.5 h-3.5" /> 콘텐츠 스튜디오
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-muted)]">
          <Sparkles className="w-3.5 h-3.5" /> 콘텐츠 자동화 1회 묶음 (job)
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
          {data.job?.started_at ? new Date(data.job.started_at).toLocaleString('ko-KR') : jobId.slice(0, 8)} 의 결과
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--admin-text-muted)]">
          <StatPill label="채택 후보" value={data.stats.accepted_candidates} />
          <StatPill label="생성된 variant" value={data.stats.total_drafts} />
          <StatPill label="발행됨" value={data.stats.published_drafts} tone={data.stats.published_drafts > 0 ? 'emerald' : 'zinc'} />
          {data.job?.status && <StatPill label="job 상태" value={data.job.status} />}
        </div>
      </header>

      {data.sessions.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)] py-12 text-center">
          이 job 에 채택된 후보가 없습니다. 텔레그램에서 &quot;후보 N&quot; 답변 후 다시 확인해 주세요.
        </p>
      ) : (
        <div className="space-y-6">
          {data.sessions.map((s, idx) => (
            <SessionCard key={s.id} session={s} index={idx + 1} />
          ))}
        </div>
      )}

      {data.rejected_candidates.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            onClick={() => setShowRejected(!showRejected)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]"
          >
            <XCircle className="w-3.5 h-3.5" />
            폐기된 후보 {data.rejected_candidates.length}건 {showRejected ? '닫기' : '펼치기'}
          </button>
          {showRejected && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.rejected_candidates.map((c) => (
                <div key={c.id} className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] p-3 text-sm">
                  <div className="text-xs text-[var(--admin-text-muted)]">
                    {c.label || `[후보 ${c.candidate_index || '?'}]`}
                    {typeof c.fit_score === 'number' && <> · 적합도 {Math.round(c.fit_score * 100)}%</>}
                    {c.theme && <> · {c.theme}</>}
                  </div>
                  <div className="font-semibold mt-1">{c.recommended_title || c.title || '(제목 없음)'}</div>
                  {c.reader_problem && <div className="mt-1 text-xs text-[var(--admin-text-muted)] line-clamp-2">{c.reader_problem}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SessionCard({ session, index }) {
  const drafts = session.drafts || [];
  const published = drafts.filter((d) => d.status === 'published');
  const candidate = session.selected_candidate || {};
  const pillarLabel = candidate.selected_content_pillar_label || candidate.selected_content_pillar || null;
  const pillarReason = candidate.content_pillar_reason || null;
  const writingDirection = candidate.writing_direction || null;
  const sourceSummary = candidate.research_source_summary || session.item_source || null;
  return (
    <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--admin-text-muted)] mb-1">
              채택 후보 #{index}
            </div>
            <h2 className="font-black text-base sm:text-lg leading-tight">
              {session.item_recommended_title || session.item_title || '(제목 없음)'}
            </h2>
            {session.user_decision_raw && (
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                <MessageSquare className="inline w-3 h-3 mr-1" />
                정욱님 답변: &quot;{session.user_decision_raw}&quot;
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <SessionStatusBadge status={session.status} />
            {published.length > 0 && (
              <span className="text-xs text-emerald-700 font-bold">{published.length}건 발행됨</span>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--admin-text-muted)]">
          {pillarLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-bold text-violet-700">
              <GitBranch className="w-3 h-3" /> 기둥: {pillarLabel}
            </span>
          )}
          {typeof candidate.content_pillar_fit_score === 'number' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5">
              적합도 {candidate.content_pillar_fit_score}/5
            </span>
          )}
          {sourceSummary && (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5">
              출처 역할: {sourceSummary}
            </span>
          )}
          {session.item_post_url && (
            <a href={session.item_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3 h-3" /> 원본 자료
            </a>
          )}
          {session.completed_at && (
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 완성 {new Date(session.completed_at).toLocaleString('ko-KR')}</span>
          )}
        </div>
        {(pillarReason || writingDirection || candidate.target_fit_summary) && (
          <div className="mt-3 rounded-md border border-[var(--admin-border)] bg-white/70 p-3 text-xs leading-relaxed text-[var(--admin-text-muted)]">
            {pillarReason && <p><b className="text-[var(--admin-text-main)]">기둥 선택 이유</b> · {pillarReason}</p>}
            {candidate.target_fit_summary && <p className="mt-1"><b className="text-[var(--admin-text-main)]">타겟 적합도</b> · {candidate.target_fit_summary}</p>}
            {writingDirection && <p className="mt-1"><b className="text-[var(--admin-text-main)]">작성 방향</b> · {writingDirection}</p>}
          </div>
        )}
      </header>

      <div className="px-5 py-4">
        {drafts.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">
            {session.status === 'phase2_running' || session.status === 'awaiting_decision'
              ? '아직 생성 중입니다. 잠시 후 새로고침해 주세요.'
              : '드래프트가 없습니다.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {drafts.map((d, i) => <DraftCard key={d.id} draft={d} variantIndex={i + 1} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function DraftCard({ draft, variantIndex }) {
  const firstPost = Array.isArray(draft.posts) ? draft.posts[0] : null;
  const preview = firstPost?.body?.slice(0, 100) || '';
  const variantReview = draft.research_context_used?.variant_review || {};
  const generationDecision = draft.research_context_used?.generation_decision || {};
  const variantMeta = Array.isArray(variantReview.variants)
    ? variantReview.variants.find((v) => v.variant_id === variantReview.saved_variant_id)
    : null;
  const score = variantMeta?.scores?.overall || variantReview.selected_scores?.overall || null;
  const pillar = generationDecision.content_pillar || variantMeta?.content_pillar || null;
  const treatment = generationDecision.content_treatment || variantMeta?.content_treatment || null;
  const fomo = generationDecision.fomo_mechanism || variantMeta?.fomo_mechanism || null;
  return (
    <Link
      href={`/admin/content-studio/thread-drafts/${draft.id}`}
      className={clsx(
        'block rounded-lg border p-4 transition hover:shadow-sm',
        draft.status === 'published'
          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
          : 'border-[var(--admin-border)] bg-white hover:border-zinc-400'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-black uppercase tracking-widest text-[var(--admin-text-muted)]">
          <Hash className="inline w-3 h-3 mr-0.5" />V{variantIndex}
          {draft.format_type && <> · {draft.format_type.replace('_', ' ')}</>}
        </span>
        <DraftStatusBadge status={draft.status} />
      </div>
      <div className="font-bold text-sm leading-snug line-clamp-2">{draft.title || '(제목 없음)'}</div>
      {(score || pillar || treatment) && (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
          {score && (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">
              <ShieldCheck className="w-2.5 h-2.5" /> {score}/5
            </span>
          )}
          {pillar && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700">{pillar}</span>}
          {treatment && <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-zinc-600">{treatment}</span>}
          {fomo && fomo !== 'none' && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">FOMO {fomo}</span>}
        </div>
      )}
      {preview && (
        <p className="mt-2 text-xs text-[var(--admin-text-muted)] line-clamp-3">{preview}…</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--admin-text-muted)]">
        {draft.hook_pattern && <span>훅: {draft.hook_pattern}</span>}
        {draft.tone_pattern && <span>· 톤: {draft.tone_pattern}</span>}
        <span className="ml-auto inline-flex items-center gap-1"><FileText className="w-2.5 h-2.5" />{(draft.posts || []).length}p</span>
      </div>
    </Link>
  );
}

function StatPill({ label, value, tone = 'zinc' }) {
  const toneCls = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    zinc: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)] border-[var(--admin-border)]',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${toneCls}`}>
      <b>{value}</b> {label}
    </span>
  );
}

function SessionStatusBadge({ status }) {
  const map = {
    completed: { l: '완성', c: 'bg-emerald-50 text-emerald-700' },
    phase2_running: { l: '생성중', c: 'bg-blue-50 text-blue-700' },
    awaiting_decision: { l: '답변 대기', c: 'bg-amber-50 text-amber-700' },
    failed: { l: '실패', c: 'bg-red-50 text-red-700' },
    cancelled: { l: '취소', c: 'bg-zinc-100 text-zinc-600' },
  };
  const s = map[status] || { l: status, c: 'bg-zinc-100 text-zinc-700' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.c}`}>{s.l}</span>;
}

function DraftStatusBadge({ status }) {
  const map = {
    draft: { l: '초안', c: 'bg-zinc-100 text-zinc-700' },
    reviewed: { l: '검토', c: 'bg-blue-50 text-blue-700' },
    approved: { l: '승인', c: 'bg-violet-50 text-violet-700' },
    published: { l: '발행', c: 'bg-emerald-50 text-emerald-700' },
    rejected: { l: '폐기', c: 'bg-red-50 text-red-700' },
  };
  const s = map[status] || { l: status, c: 'bg-zinc-100 text-zinc-700' };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.c}`}>{s.l}</span>;
}
