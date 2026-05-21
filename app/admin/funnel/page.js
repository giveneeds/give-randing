'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart2, Users, BookOpen, MousePointer2, CheckCircle2,
  Loader2, AlertCircle, HelpCircle, Globe, Smartphone, Monitor,
  ChevronDown, ChevronUp, User, Phone, Tag, Calendar, Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';

const STEP_KEYS = ['sessions', 'content', 'cta', 'leads'];

const STEP_CONFIG = {
  sessions: {
    label: '사이트 방문',
    sub: '사이트에 들어옴',
    icon: Users,
    color: 'bg-zinc-800 text-white',
    bar: 'bg-zinc-800',
    tooltip: '외부 사용자가 사이트에 들어온 횟수(세션 시작). 어드민 본인이나 /admin/* 페이지 방문은 제외된 순수 외부 트래픽입니다.',
  },
  content: {
    label: '콘텐츠 열람',
    sub: '매거진/서비스 페이지를 읽음',
    icon: BookOpen,
    color: 'bg-violet-500 text-white',
    bar: 'bg-violet-500',
    tooltip: '매거진 글 또는 서비스 상세 페이지를 실제로 본 횟수. 들어와서 곧바로 이탈하지 않고 본문을 본 사람을 추적합니다.',
  },
  cta: {
    label: '관심 행동',
    sub: 'CTA·버튼 클릭',
    icon: MousePointer2,
    color: 'bg-blue-500 text-white',
    bar: 'bg-blue-500',
    tooltip: '페이지 내 핵심 행동(CTA, 문의·다운로드 버튼 등)을 클릭한 횟수. 진성 관심 지표.',
  },
  leads: {
    label: '문의 전환',
    sub: '리드 폼 제출 완료',
    icon: CheckCircle2,
    color: 'bg-emerald-500 text-white',
    bar: 'bg-emerald-500',
    tooltip: '문의·상담 폼을 제출해 실제 리드(고객 잠재 정보)로 전환된 수.',
  },
};

const CHANNEL_LABELS = {
  direct: 'Direct', organic: 'Organic', paid_search: 'Paid Search',
  paid_social: 'Paid Social', email: 'Email', referral: 'Referral',
  kakao: 'Kakao', organic_social: 'Social', other: 'Other',
};

const PIPELINE_CONFIG = {
  new:       { label: '신규',  color: 'bg-amber-50 text-amber-700' },
  contacted: { label: '컨택',  color: 'bg-sky-50 text-sky-700' },
  qualified: { label: '적격',  color: 'bg-blue-50 text-blue-700' },
  proposal:  { label: '제안',  color: 'bg-violet-50 text-violet-700' },
  won:       { label: '계약',  color: 'bg-emerald-50 text-emerald-700' },
  lost:      { label: '이탈',  color: 'bg-red-50 text-red-500' },
};

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle size={12} className="text-zinc-300 cursor-help" />
      {show && (
        <div className="absolute left-5 top-0 z-20 w-52 bg-zinc-900 text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-xl">
          {text}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function slugFromUrl(url) {
  if (!url) return '(unknown)';
  const parts = url.split('/').filter(Boolean);
  return parts.length > 0 ? `/${parts.join('/')}` : url;
}

// ── Drill-down tables ──

function SessionsTable({ rows }) {
  if (!rows?.length) return <EmptyDrill />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-100">
            {['방문자', '연락처', '채널', '디바이스', '랜딩 URL', '방문 시각'].map(h => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/admin/funnel/visitor/${encodeURIComponent(r.anonymous_id)}`} className="flex items-center gap-2 group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${r.is_identified ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-400'}`}>
                    {r.is_identified ? (r.display_name || '?')[0] : '?'}
                  </div>
                  <span className={`text-xs font-bold group-hover:underline ${r.is_identified ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {r.display_name}
                  </span>
                  <ExternalLink size={10} className="text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">{r.display_phone || '-'}</td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                  {CHANNEL_LABELS[r.channel_group] || r.channel_group || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 capitalize">{r.device_type || '-'}</td>
              <td className="px-4 py-3 text-[11px] font-mono text-zinc-500 max-w-[160px] truncate">{r.landing_url || '-'}</td>
              <td className="px-4 py-3 text-[11px] text-zinc-400 whitespace-nowrap">{timeAgo(r.session_start)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentTable({ rows }) {
  if (!rows?.length) return <EmptyDrill />;
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div className="divide-y divide-zinc-50">
      {rows.map((r, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
          <span className="text-[10px] font-black text-zinc-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.event_type === 'magazine_view' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                {r.event_type === 'magazine_view' ? '매거진' : '서비스'}
              </span>
              <span className="text-xs font-mono text-zinc-700 truncate">{slugFromUrl(r.page_url)}</span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-sm font-black text-zinc-700 flex-shrink-0 w-8 text-right">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function CtaTable({ rows }) {
  if (!rows?.length) return <EmptyDrill />;
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div className="divide-y divide-zinc-50">
      {rows.map((r, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
          <span className="text-[10px] font-black text-zinc-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-zinc-800 truncate">{r.label || r.cta_id}</span>
              <span className="text-[10px] font-mono text-zinc-400 truncate">{slugFromUrl(r.page_url)}</span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-sm font-black text-zinc-700 flex-shrink-0 w-8 text-right">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function LeadsTable({ rows }) {
  if (!rows?.length) return <EmptyDrill />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-100">
            {['이름', '연락처', '채널', '파이프라인', '수집일'].map(h => (
              <th key={h} className="px-4 py-2.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {rows.map(r => {
            const pipe = PIPELINE_CONFIG[r.pipeline_stage || 'new'];
            return (
              <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-sm text-zinc-900">{r.name}</div>
                  {r.company_name && <div className="text-[11px] text-zinc-400">{r.company_name}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{r.phone || r.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {CHANNEL_LABELS[r.channel_group] || r.channel_group || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pipe?.color || ''}`}>{pipe?.label || r.pipeline_stage}</span>
                </td>
                <td className="px-4 py-3 text-[11px] text-zinc-400 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyDrill() {
  return (
    <div className="py-10 text-center text-zinc-400 text-xs">
      아직 데이터가 없습니다. 방문자가 유입되면 자동으로 집계됩니다.
    </div>
  );
}

function DrillLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-zinc-400">
      <Loader2 size={14} className="animate-spin" />
      <span className="text-xs">불러오는 중...</span>
    </div>
  );
}

// ── Main page ──

export default function FunnelPage() {
  const [funnelData, setFunnelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeStep, setActiveStep] = useState(null);
  const [drillData, setDrillData] = useState({});
  const [drillLoading, setDrillLoading] = useState({});

  useEffect(() => {
    fetch('/api/analytics/funnel')
      .then(r => r.json())
      .then(d => { setFunnelData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  async function handleStepClick(stepKey) {
    if (activeStep === stepKey) { setActiveStep(null); return; }
    setActiveStep(stepKey);
    if (drillData[stepKey]) return; // already loaded

    setDrillLoading(prev => ({ ...prev, [stepKey]: true }));
    try {
      const res = await fetch(`/api/analytics/funnel/${stepKey}`);
      const json = await res.json();
      setDrillData(prev => ({ ...prev, [stepKey]: json.rows || [] }));
    } catch (e) {
      setDrillData(prev => ({ ...prev, [stepKey]: [] }));
    } finally {
      setDrillLoading(prev => ({ ...prev, [stepKey]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-zinc-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">데이터 불러오는 중...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-8 text-red-500 text-sm">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const steps = funnelData?.steps || [];
  const maxCount = Math.max(...steps.map(s => s.count), 1);
  const channelBreakdown = funnelData?.channel_breakdown || [];
  const deviceBreakdown = funnelData?.device_breakdown || [];
  const totalChannels = channelBreakdown.reduce((s, r) => s + r.count, 0) || 1;
  const totalDevices  = deviceBreakdown.reduce((s, r) => s + r.count, 0) || 1;

  const CHANNEL_COLORS = ['bg-zinc-800','bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-sky-500','bg-rose-500','bg-indigo-500'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <BarChart2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-zinc-900 tracking-tight">퍼널 분석</h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug">외부 방문자가 문의까지 도달하는 흐름을 단계별로 봅니다 · 각 단계를 클릭하면 세부 내역</p>
          </div>
        </div>
        <Link
          href="/admin/funnel/user"
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors flex-shrink-0"
        >
          <Users size={14} />
          방문자 여정
        </Link>
      </div>

      {/* 정제 정책 안내 */}
      <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-900">
        <HelpCircle size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          어드민 본인의 사이트 둘러보기와 <code className="font-mono">/admin/*</code> 페이지 방문은 분석에서 자동 제외됩니다. 화면의 모든 숫자는 외부 방문자 기준입니다.
        </span>
      </div>

      {/* Funnel Steps (clickable) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">전환 퍼널</h2>
        </div>

        <div className="divide-y divide-zinc-50">
          {steps.map((step, i) => {
            const cfg = STEP_CONFIG[step.key] || STEP_CONFIG.sessions;
            const Icon = cfg.icon;
            const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
            const isOpen = activeStep === step.key;
            const isLoading = drillLoading[step.key];
            const drill = drillData[step.key];

            return (
              <div key={step.key}>
                {/* Step row — clickable */}
                <button
                  onClick={() => handleStepClick(step.key)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 sm:py-5 hover:bg-zinc-50 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Step {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-zinc-900">
                        {step.label}
                      </span>
                      {cfg.sub && (
                        <span className="hidden sm:inline text-[11px] text-zinc-400 font-medium">— {cfg.sub}</span>
                      )}
                      <Tooltip text={cfg.tooltip} />
                    </div>
                    <div className="relative h-6 bg-zinc-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all duration-700 ${cfg.bar}`}
                        style={{ width: `${Math.max(barWidth, barWidth > 0 ? 2 : 0)}%` }}
                      />
                      {step.count > 0 && (
                        <span className="absolute inset-0 flex items-center px-3 text-[11px] font-black text-white">
                          {step.count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right w-12 sm:w-16">
                    <p className="text-xs sm:text-sm font-black text-zinc-900">{step.count.toLocaleString()}</p>
                    {i > 0 && (
                      <p className={`text-[10px] font-bold ${step.conversion_rate >= 10 ? 'text-emerald-600' : step.conversion_rate >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                        {step.conversion_rate}%
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-zinc-300 group-hover:text-zinc-600 transition-colors">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Drill-down panel */}
                {isOpen && (
                  <div className="border-t border-zinc-100 bg-zinc-50/60">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-100">
                      <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        {cfg.label} 세부 내역
                      </span>
                      {drill && (
                        <span className="text-[10px] text-zinc-400 font-bold">{drill.length}건</span>
                      )}
                    </div>
                    {isLoading ? (
                      <DrillLoading />
                    ) : step.key === 'sessions' ? (
                      <SessionsTable rows={drill} />
                    ) : step.key === 'content' ? (
                      <ContentTable rows={drill} />
                    ) : step.key === 'cta' ? (
                      <CtaTable rows={drill} />
                    ) : (
                      <LeadsTable rows={drill} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {steps.map(step => (
              <div key={step.key} className="text-center">
                <p className="text-xl font-black text-zinc-900">{step.count.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500 font-bold">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} className="text-zinc-400" />
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">채널별 리드</h3>
          </div>
          {channelBreakdown.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6">데이터 없음</p>
          ) : (
            <div className="space-y-2.5">
              {channelBreakdown.map((row, i) => {
                const pct = Math.round((row.count / totalChannels) * 100);
                return (
                  <div key={row.channel}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-700">{CHANNEL_LABELS[row.channel] || row.channel}</span>
                      <span className="text-zinc-500 font-bold">{row.count} <span className="text-zinc-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${CHANNEL_COLORS[i % CHANNEL_COLORS.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={14} className="text-zinc-400" />
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">디바이스별 리드</h3>
          </div>
          {deviceBreakdown.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-6">데이터 없음</p>
          ) : (
            <div className="space-y-3">
              {deviceBreakdown.map((row, i) => {
                const pct = Math.round((row.count / totalDevices) * 100);
                const DevIcon = row.device === 'mobile' ? Smartphone : Monitor;
                return (
                  <div key={row.device} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <DevIcon size={14} className="text-zinc-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-zinc-700 capitalize">{row.device}</span>
                        <span className="text-zinc-500 font-bold">{row.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${CHANNEL_COLORS[i % CHANNEL_COLORS.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
