'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Smartphone, Monitor, Clock,
  MousePointer2, Eye, FileText, CheckCircle2, Loader2,
  CornerUpLeft, ChevronRight,
} from 'lucide-react';

// ── 이벤트 메타 ──────────────────────────────────
const EVENT_META = {
  page_view:     { label: '페이지',   icon: Eye,           bg: 'bg-zinc-100',     text: 'text-zinc-600',   border: 'border-zinc-200' },
  magazine_view: { label: '매거진',   icon: FileText,      bg: 'bg-violet-50',    text: 'text-violet-600', border: 'border-violet-200' },
  service_view:  { label: '서비스',   icon: FileText,      bg: 'bg-amber-50',     text: 'text-amber-600',  border: 'border-amber-200' },
  cta_click:     { label: 'CTA',      icon: MousePointer2, bg: 'bg-blue-50',      text: 'text-blue-600',   border: 'border-blue-200' },
  form_submit:   { label: '리드전환', icon: CheckCircle2,  bg: 'bg-emerald-50',   text: 'text-emerald-700',border: 'border-emerald-200' },
};

function shortUrl(url) {
  if (!url) return '?';
  const clean = url.replace(/^\//, '').split('?')[0];
  if (!clean) return '/';
  // 슬러그 마지막 부분만 표시 (너무 길면)
  const parts = clean.split('/');
  if (parts.length > 2) return `…/${parts[parts.length - 1]}`;
  return clean;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDwell(secs) {
  if (!secs || secs <= 0) return null;
  if (secs < 60) return `${secs}초`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function fmtAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ── 뒤로가기 감지 + 이벤트 노드 빌드 ──────────────
function buildNodes(events) {
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view', 'cta_click', 'form_submit'].includes(e.event_type)
  );
  const visited = [];
  return relevant.map((e, i) => {
    const next = relevant[i + 1];
    const dwell = next
      ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
      : null;
    const isBack = e.event_type === 'page_view' && visited.includes(e.page_url);
    if (e.event_type === 'page_view' && e.page_url) visited.push(e.page_url);
    return { ...e, dwell_seconds: dwell, isBack };
  });
}

// ── 노드 컴포넌트 ──────────────────────────────────
function FlowNode({ node, isLast }) {
  const meta = EVENT_META[node.event_type] || EVENT_META.page_view;
  const Icon = node.isBack ? CornerUpLeft : meta.icon;

  return (
    <div className="flex items-start flex-shrink-0">
      {/* 노드 */}
      <div className="flex flex-col items-center">
        <div
          title={node.page_url || node.event_type}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold
            whitespace-nowrap max-w-[140px]
            ${meta.bg} ${meta.text} ${meta.border}
            ${node.isBack ? 'opacity-70 ring-2 ring-offset-1 ring-zinc-200' : ''}
          `}
        >
          <Icon size={11} className="flex-shrink-0" />
          <span className="truncate">{shortUrl(node.page_url || node.event_type)}</span>
        </div>

        {/* 라벨 행 */}
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[9px] font-bold ${meta.text} opacity-70`}>{meta.label}</span>
          {node.isBack && (
            <span className="text-[9px] text-zinc-400 font-bold">↩ 뒤로</span>
          )}
        </div>

        {/* 시각 */}
        <span className="text-[9px] text-zinc-300 mt-0.5">{fmtTime(node.created_at)}</span>

        {/* CTA 레이블 */}
        {node.event_type === 'cta_click' && node.event_data?.label && (
          <span className="text-[9px] text-blue-400 mt-0.5 max-w-[120px] truncate text-center">
            &ldquo;{node.event_data.label}&rdquo;
          </span>
        )}
      </div>

      {/* 화살표 + 체류시간 */}
      {!isLast && (
        <div className="flex flex-col items-center mx-2 pt-2 flex-shrink-0">
          {node.dwell_seconds !== null && node.dwell_seconds !== undefined && node.dwell_seconds > 0 && (
            <span className="text-[9px] text-zinc-300 mb-0.5 flex items-center gap-0.5">
              <Clock size={7} />{fmtDwell(node.dwell_seconds)}
            </span>
          )}
          <ChevronRight size={14} className="text-zinc-200" />
        </div>
      )}
    </div>
  );
}

// ── 세션 행 ────────────────────────────────────────
function SessionRow({ session, events, index, total }) {
  const nodes = buildNodes(events);

  const channelBadge = {
    direct: 'Direct', organic: 'Organic', paid_search: 'Paid Search',
    paid_social: 'Paid Social', email: 'Email', referral: 'Referral',
    kakao: 'Kakao', organic_social: 'Social',
  }[session.channel_group] || session.channel_group || 'Direct';

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {/* 세션 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50 bg-zinc-50/60">
        <div className="w-6 h-6 rounded-lg bg-zinc-800 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
          {total - index}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-xs font-black text-zinc-700">세션 {total - index}</span>
          <span className="text-[10px] text-zinc-400">{fmtAgo(session.session_start)}</span>
          <span className="text-[10px] text-zinc-300">·</span>
          <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{channelBadge}</span>
          {session.device_type === 'mobile'
            ? <Smartphone size={10} className="text-zinc-300" />
            : <Monitor size={10} className="text-zinc-300" />}
          {session.landing_url && (
            <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[120px]">시작: {session.landing_url}</span>
          )}
        </div>
        <span className="text-[10px] text-zinc-300 flex-shrink-0">{nodes.length}개 이벤트</span>
      </div>

      {/* 흐름도 */}
      <div className="p-4 overflow-x-auto">
        {nodes.length === 0 ? (
          <p className="text-xs text-zinc-300 italic py-2">이벤트 없음</p>
        ) : (
          <div className="flex items-start min-w-max">
            {nodes.map((node, i) => (
              <FlowNode key={node.id || i} node={node} isLast={i === nodes.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────
export default function VisitorDetailPage() {
  const { anonymousId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!anonymousId) return;
    fetch(`/api/analytics/visitor/${encodeURIComponent(anonymousId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [anonymousId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-zinc-400 gap-2">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm">불러오는 중…</span>
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-rose-500 text-sm">오류: {error || '데이터 없음'}</div>
  );

  const { identity, sessions, events } = data;
  const totalEvents = events.length;
  const uniquePages = [...new Set(events.filter(e => e.event_type === 'page_view').map(e => e.page_url))].length;
  const hasCta = events.some(e => e.event_type === 'cta_click');
  const hasLead = events.some(e => e.event_type === 'form_submit');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-zinc-900 tracking-tight">방문자 상세 여정</h1>
          <p className="text-[11px] text-zinc-400 font-mono">{anonymousId}</p>
        </div>
      </div>

      {/* 신원 + 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 신원 */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 col-span-1 sm:col-span-2 ${identity.is_identified ? 'bg-violet-50 border-violet-200' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${identity.is_identified ? 'bg-violet-100 text-violet-700' : 'bg-zinc-200 text-zinc-400'}`}>
            {identity.is_identified ? (identity.display_name[0] || '?') : <User size={16} />}
          </div>
          <div>
            <p className={`font-black text-sm ${identity.is_identified ? 'text-violet-900' : 'text-zinc-500'}`}>{identity.display_name}</p>
            {identity.display_phone && <p className="text-xs text-zinc-500 mt-0.5">{identity.display_phone}</p>}
            {identity.is_identified && <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">카카오 인증</span>}
          </div>
        </div>

        {/* 세션 수 */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 flex flex-col justify-between">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">총 세션</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{sessions.length}</p>
          <p className="text-[10px] text-zinc-300 mt-1">방문 횟수</p>
        </div>

        {/* 이벤트 수 */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 flex flex-col justify-between">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">총 이벤트</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{totalEvents}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[9px] text-zinc-400">{uniquePages}개 페이지</span>
            {hasCta && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">CTA 클릭</span>}
            {hasLead && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">리드 전환</span>}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-400">
        <span className="font-bold text-zinc-500">범례</span>
        {Object.entries(EVENT_META).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${v.bg} ${v.text} ${v.border}`}>
            <v.icon size={9} />{v.label}
          </span>
        ))}
        <span className="flex items-center gap-1 text-zinc-400 border border-zinc-200 bg-zinc-50 px-2 py-0.5 rounded-lg">
          <CornerUpLeft size={9} />뒤로가기
        </span>
        <span className="text-zinc-300">· 화살표 위 = 체류시간</span>
      </div>

      {/* 세션별 흐름도 */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">세션별 이동 경로</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-zinc-300 text-sm">세션 데이터 없음</div>
        ) : (
          sessions.map((s, i) => (
            <SessionRow
              key={s.id || i}
              session={s}
              events={events.filter(e => e.session_id === s.id)}
              index={i}
              total={sessions.length}
            />
          ))
        )}
      </div>
    </div>
  );
}
