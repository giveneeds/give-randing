'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Loader2, ChevronLeft, ExternalLink, Check, X, Clock,
  Search, GitBranch, MousePointerClick, Microscope, BookOpen,
  MessageSquare, PenLine, ShieldCheck, Archive, FileText, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';

const STEP_ICONS = {
  collection: Search,
  report: FileText,
  pillar: GitBranch,
  selection: MousePointerClick,
  deep_research: Microscope,
  supplemental_research: BookOpen,
  tone_research: MessageSquare,
  generation: PenLine,
  quality_review: ShieldCheck,
  saved: Archive,
};

export default function PipelineReplayPage({ params }) {
  const { sessionId } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/content-studio/sessions/${sessionId}/pipeline`, { headers: await authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '조회 실패');
      setData(d);
      setErr('');
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [sessionId, authHeaders]);

  useEffect(() => { load(); }, [load]);

  // 진행 중이면 5초마다 폴링, 완료/실패면 중단.
  const sessionStatus = data?.session?.status;
  useEffect(() => {
    if (sessionStatus !== 'phase2_running') return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [sessionStatus, load]);

  if (loading) return (
    <div className="p-10 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
  );
  if (err) return <div className="p-8 text-sm text-red-600">{err}</div>;
  if (!data) return null;

  const running = data.session.status === 'phase2_running';
  const failed = data.session.status === 'failed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/content-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
          <ChevronLeft className="w-3.5 h-3.5" /> 콘텐츠 스튜디오
        </Link>
        {data.session.job_id && (
          <Link href={`/admin/content-studio/jobs/${data.session.job_id}`} className="text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
            묶음 허브 →
          </Link>
        )}
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-muted)]">
          <PenLine className="w-3.5 h-3.5" /> 발행 파이프라인 진행 과정
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
          {data.selected_item?.title || '후보 선택 대기 중'}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <SessionStatusBadge status={data.session.status} />
          {data.selected_item?.post_url && (
            <a href={data.selected_item.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--admin-text-muted)] hover:underline">
              <ExternalLink className="w-3 h-3" /> 원본 자료
            </a>
          )}
          {data.session.completed_at && (
            <span className="inline-flex items-center gap-1 text-[var(--admin-text-muted)]">
              <Clock className="w-3 h-3" /> 완료 {new Date(data.session.completed_at).toLocaleString('ko-KR')}
            </span>
          )}
          <button type="button" onClick={load} className="inline-flex items-center gap-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
            <RefreshCw className="w-3 h-3" /> 새로고침
          </button>
        </div>
        {running && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 파이프라인 진행 중 — 5초마다 자동 갱신됩니다.
          </p>
        )}
        {failed && data.session.error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
            실패: {data.session.error}
          </p>
        )}
      </header>

      <ol className="relative">
        {data.steps.map((step, i) => (
          <StepRow key={step.key} step={step} isLast={i === data.steps.length - 1} drafts={data.drafts} />
        ))}
      </ol>
    </div>
  );
}

function StepRow({ step, isLast, drafts }) {
  const Icon = STEP_ICONS[step.key] || FileText;
  const tone = STATUS_TONE[step.status] || STATUS_TONE.pending;
  return (
    <li className="relative pl-12 pb-5">
      {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--admin-border)]" />}
      <span className={clsx('absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full border', tone.dot)}>
        {step.status === 'running'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Icon className="w-4 h-4" />}
      </span>
      <div className={clsx('rounded-xl border bg-[var(--admin-card-bg)] overflow-hidden', tone.border)}>
        <div className="px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-black text-sm">{step.label}</div>
            <div className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{step.summary}</div>
          </div>
          <StepStatusBadge status={step.status} />
        </div>
        <StepDetail step={step} drafts={drafts} />
      </div>
    </li>
  );
}

function StepDetail({ step, drafts }) {
  const d = step.detail || {};
  const items = [];

  if (step.key === 'collection' && d.trigger) {
    items.push(<Meta key="t" label="트리거" value={d.trigger} />);
  }
  if (step.key === 'report' && d.report_excerpt) {
    items.push(<Excerpt key="r" text={d.report_excerpt} />);
  }
  if (step.key === 'pillar' && Array.isArray(d.candidates) && d.candidates.length > 0) {
    items.push(
      <ul key="p" className="space-y-1.5">
        {d.candidates.map((c, i) => (
          <li key={i} className="text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-bold text-violet-700">
              {c.pillar}{c.fit_score != null && ` · ${c.fit_score}%`}
            </span>
            <span className="ml-2 text-[var(--admin-text-muted)]">{c.title}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (step.key === 'selection') {
    if (d.user_decision_raw) items.push(<Meta key="u" label="채택 방식" value={d.user_decision_raw} />);
    if (d.selection_reason) items.push(<Excerpt key="s" text={d.selection_reason} />);
  }
  if (step.key === 'deep_research') {
    if (Array.isArray(d.hook_patterns) && d.hook_patterns.length > 0) items.push(<Bullets key="h" label="후킹 포인트" rows={d.hook_patterns} />);
    if (Array.isArray(d.adapted_angles) && d.adapted_angles.length > 0) items.push(<Bullets key="a" label="조정 앵글" rows={d.adapted_angles} />);
  }
  if (step.key === 'supplemental_research' && Array.isArray(d.evidence_points) && d.evidence_points.length > 0) {
    items.push(<Bullets key="e" label="보강 근거" rows={d.evidence_points} />);
  }
  if (step.key === 'tone_research' && Array.isArray(d.voice_patterns) && d.voice_patterns.length > 0) {
    items.push(<Bullets key="v" label="문장 감각" rows={d.voice_patterns} />);
  }
  if (step.key === 'saved' && Array.isArray(drafts) && drafts.length > 0) {
    items.push(
      <div key="dr" className="grid grid-cols-1 gap-2">
        {drafts.map((dr) => (
          <Link
            key={dr.id}
            href={`/admin/content-studio/thread-drafts/${dr.id}`}
            className={clsx(
              'block rounded-lg border p-3 transition hover:shadow-sm',
              dr.status === 'published' ? 'border-emerald-200 bg-emerald-50/40' : 'border-[var(--admin-border)] bg-white hover:border-zinc-400'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs line-clamp-1">{dr.title || '(제목 없음)'}</span>
              <span className="text-[10px] text-[var(--admin-text-muted)] shrink-0">{dr.format_type} · {dr.post_count}p</span>
            </div>
            {dr.preview && <p className="mt-1 text-[11px] text-[var(--admin-text-muted)] line-clamp-2">{dr.preview}…</p>}
          </Link>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;
  return <div className="px-4 py-3 border-t border-[var(--admin-border)] bg-[var(--admin-bg)] space-y-2">{items}</div>;
}

function Meta({ label, value }) {
  return <div className="text-xs"><span className="font-bold text-[var(--admin-text-main)]">{label}</span> <span className="text-[var(--admin-text-muted)]">{value}</span></div>;
}
function Excerpt({ text }) {
  return <p className="text-xs leading-relaxed text-[var(--admin-text-muted)] whitespace-pre-wrap line-clamp-6">{text}</p>;
}
function Bullets({ label, rows }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-muted)] mb-1">{label}</div>
      <ul className="space-y-0.5">
        {rows.map((r, i) => <li key={i} className="text-xs text-[var(--admin-text-muted)]">· {typeof r === 'string' ? r : JSON.stringify(r)}</li>)}
      </ul>
    </div>
  );
}

const STATUS_TONE = {
  done: { dot: 'border-emerald-300 bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
  running: { dot: 'border-blue-300 bg-blue-50 text-blue-600', border: 'border-blue-300' },
  failed: { dot: 'border-red-300 bg-red-50 text-red-600', border: 'border-red-200' },
  skipped: { dot: 'border-zinc-300 bg-zinc-50 text-zinc-400', border: 'border-[var(--admin-border)]' },
  pending: { dot: 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)]', border: 'border-[var(--admin-border)]' },
};

function StepStatusBadge({ status }) {
  const map = {
    done: { l: '완료', c: 'bg-emerald-50 text-emerald-700', I: Check },
    running: { l: '진행중', c: 'bg-blue-50 text-blue-700', I: Loader2 },
    failed: { l: '실패', c: 'bg-red-50 text-red-700', I: X },
    skipped: { l: '건너뜀', c: 'bg-zinc-100 text-zinc-500', I: null },
    pending: { l: '대기', c: 'bg-zinc-100 text-zinc-500', I: Clock },
  };
  const s = map[status] || map.pending;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', s.c)}>
      {s.I && <s.I className={clsx('w-2.5 h-2.5', status === 'running' && 'animate-spin')} />}
      {s.l}
    </span>
  );
}

function SessionStatusBadge({ status }) {
  const map = {
    completed: { l: '완성', c: 'bg-emerald-50 text-emerald-700' },
    phase2_running: { l: '생성중', c: 'bg-blue-50 text-blue-700' },
    phase1_reported: { l: '후보 채택 대기', c: 'bg-amber-50 text-amber-700' },
    awaiting_decision: { l: '답변 대기', c: 'bg-amber-50 text-amber-700' },
    failed: { l: '실패', c: 'bg-red-50 text-red-700' },
  };
  const s = map[status] || { l: status, c: 'bg-zinc-100 text-zinc-700' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.c}`}>{s.l}</span>;
}
