'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Loader2, Inbox, Sparkles, CheckCircle2, Search, Clock, AlertTriangle, MessageSquare, Hourglass, ArrowRight } from 'lucide-react';

export default function ActivityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch('/api/admin/content-studio/activity', { headers });
      const obj = await res.json();
      if (!res.ok) throw new Error(obj.error || '조회 실패');
      setData(obj);
    } catch (e) {
      alert('진행 상황 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>;
  }

  const nextCronMs = new Date(data.next_cron).getTime() - Date.now();
  const nextCronHours = Math.max(0, Math.floor(nextCronMs / 1000 / 60 / 60));
  const nextCronMins = Math.max(0, Math.floor((nextCronMs / 1000 / 60) % 60));

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">자동화가 현재 어떻게 돌고 있는지 한 눈에 확인합니다.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Inbox} label="오늘 모은 자료" value={data.today.collected} />
        <Stat icon={Sparkles} label="이번 주 모은 자료" value={data.week.collected} />
        <Stat icon={MessageSquare} label="이번 주 스레드 초안" value={data.week.thread_drafts ?? 0} />
        <Stat icon={CheckCircle2} label="이번 주 발행" value={data.week.published} />
      </div>

      {data.pending?.awaiting_decisions > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start gap-3">
          <Hourglass size={16} className="text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold text-blue-900">
              정욱님 응답 대기 중 — {data.pending.awaiting_decisions}건
            </div>
            <p className="text-xs text-blue-700 mt-0.5">
              텔레그램으로 보낸 1차 보고서에 대한 답변 대기. 자유 텍스트로 답하면 자동으로 2차 워크플로우 진행됩니다.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[var(--admin-border)] rounded-md p-5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
          <Clock size={11} /> 다음 자동 수집
        </div>
        <div className="text-sm text-zinc-700">
          {nextCronHours}시간 {nextCronMins}분 뒤 ({new Date(data.next_cron).toLocaleString('ko-KR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })})
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">매일 새벽 6시 정각에 자동으로 자료를 모으고 텔레그램으로 카드를 보냅니다.</p>
      </div>

      {data.pending.drafts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3">
          <CheckCircle2 size={16} className="text-amber-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-900">매거진 초안 {data.pending.drafts}건 대기 중</div>
            <p className="text-xs text-amber-700 mt-0.5">&quot;매거진 콘텐츠&quot; 메뉴에서 초안을 다듬어 발행하세요.</p>
          </div>
        </div>
      )}

      {data.recent_sessions?.length > 0 && (
        <div className="bg-white border border-[var(--admin-border)] rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">최근 자동 워크플로우 세션</span>
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.recent_sessions.map((s) => (
              <li key={s.id} className="px-5 py-3 text-xs flex items-center gap-3">
                <SessionStatusBadge status={s.status} />
                <span className="text-zinc-500">후보 {s.candidate_count}건</span>
                <span className="ml-auto text-[10px] text-zinc-400">
                  {new Date(s.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                {s.thread_draft_id && (
                  <Link
                    href={`/admin/content-studio/thread-drafts/${s.thread_draft_id}`}
                    className="inline-flex items-center gap-1 text-violet-600 font-bold hover:text-violet-800"
                  >
                    초안 보기 <ArrowRight size={10} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.recent_errors.length > 0 && (
        <div className="bg-white border border-[var(--admin-border)] rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">최근 이슈</span>
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.recent_errors.map((e) => (
              <li key={e.id} className="px-5 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-700">{e.status === 'failed' ? '자동화 실패' : '부분 성공'}</span>
                  <span className="text-zinc-400 text-[10px]">{new Date(e.started_at).toLocaleString('ko-KR')}</span>
                </div>
                {e.hint && <p className="text-zinc-500 mt-1 truncate">{e.hint}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const SESSION_STATUS_LABEL = {
  phase1_reported: { label: '1차 보고됨', cls: 'bg-blue-50 text-blue-700' },
  phase1_skipped: { label: '후보 없음', cls: 'bg-zinc-100 text-zinc-500' },
  awaiting_decision: { label: '응답 대기', cls: 'bg-amber-50 text-amber-700' },
  phase2_running: { label: '2차 진행 중', cls: 'bg-violet-50 text-violet-700' },
  completed: { label: '완료', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: '취소', cls: 'bg-zinc-100 text-zinc-500' },
  failed: { label: '실패', cls: 'bg-red-50 text-red-600' },
};

function SessionStatusBadge({ status }) {
  const cfg = SESSION_STATUS_LABEL[status] || { label: status || '?', cls: 'bg-zinc-100 text-zinc-500' };
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-[var(--admin-border)] rounded-md p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-zinc-400 mb-2">
        <Icon size={12} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-zinc-900 tabular-nums">{value}</div>
    </div>
  );
}
