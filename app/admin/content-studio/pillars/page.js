'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, GitBranch, MessageSquareText, Scale, Search, ShieldCheck, Target, BarChart3 } from 'lucide-react';

const PILLAR_TONE = {
  cost_before_spend: 'border-rose-200 bg-rose-50 text-rose-700',
  do_today: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  current_observation: 'border-blue-200 bg-blue-50 text-blue-700',
  trend_plain: 'border-violet-200 bg-violet-50 text-violet-700',
  content_showcase: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function PillarsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/content-studio/pillars', { headers: await authHeaders() });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '기둥 조회 실패');
      setData(payload);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (err) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>;
  }

  const rows = data?.rows || [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-zinc-700">
              <GitBranch size={13} /> Content Pillars
            </div>
            <h2 className="text-lg font-black tracking-tight text-zinc-950">고정 콘텐츠 기둥 5개</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
              기둥은 운영자가 고르는 주제 탭이 아니라, 에이전트가 후보를 평가할 때 쓰는 내부 전략 레인입니다. 텔레그램에는 선택된 기둥과 근거가 노출되고, 실제 발행 분포는 이 화면에서 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <MetaPill icon={Target} label="선택 주체" value="에이전트" />
            <MetaPill icon={MessageSquareText} label="텔레그램" value="근거 노출" />
            <MetaPill icon={ShieldCheck} label="운영자" value="피드백" />
            <MetaPill icon={BarChart3} label="30일 발행" value={`${data?.recentDraftTotal || 0}개`} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {rows.map((pillar) => (
          <PillarCard key={pillar.key} pillar={pillar} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoPanel icon={Scale} title="에이전트 점수화 기준" items={data?.scoreCriteria || []} />
        <InfoPanel icon={MessageSquareText} title="텔레그램 후보에 보이는 값" items={data?.telegramFields || []} />
      </section>
    </div>
  );
}

function PillarCard({ pillar }) {
  const tone = PILLAR_TONE[pillar.key] || 'border-zinc-200 bg-zinc-50 text-zinc-700';
  return (
    <article className="rounded-lg border border-[var(--admin-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${tone}`}>
          {pillar.weight || `#${pillar.index}`}
        </span>
        <span className="text-[10px] font-black text-zinc-300">{pillar.key}</span>
      </div>
      <h3 className="text-sm font-black leading-snug text-zinc-950">{pillar.label}</h3>
      <p className="mt-2 min-h-12 text-xs leading-relaxed text-zinc-500">{pillar.docsRole || pillar.role}</p>

      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <span>최근 30일 발행</span>
          <span>{pillar.recentDraftCount || 0}개 · {pillar.recentDraftShare || 0}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-zinc-900" style={{ width: `${Math.min(100, pillar.recentDraftShare || 0)}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <MiniList icon={Search} title="판단 키워드" items={pillar.threadKeywords} />
        <MiniList icon={Target} title="리서치 각도" items={pillar.researchAngles} />
      </div>
    </article>
  );
}

function MiniList({ icon: Icon, title, items }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <Icon size={11} /> {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((item) => (
          <span key={item} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({ icon: Icon, title, items }) {
  return (
    <section className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500">
        <Icon size={14} /> {title}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(items || []).map((item) => (
          <li key={item} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MetaPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <Icon size={11} /> {label}
      </div>
      <div className="font-black text-zinc-900">{value}</div>
    </div>
  );
}
