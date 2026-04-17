'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Smartphone, Monitor,
  MousePointer2, Eye, FileText, CheckCircle2, Loader2,
  LogIn, LogOut, Clock,
} from 'lucide-react';

// ── 이벤트 메타 ───────────────────────────────────
const EVENT_META = {
  page_view:     { label: '페이지',   icon: Eye,           bg: '#f4f4f5', border: '#d4d4d8', text: '#52525b', dot: '#a1a1aa' },
  magazine_view: { label: '매거진',   icon: FileText,      bg: '#f5f3ff', border: '#c4b5fd', text: '#7c3aed', dot: '#8b5cf6' },
  service_view:  { label: '서비스',   icon: FileText,      bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#f59e0b' },
  cta_click:     { label: 'CTA 클릭', icon: MousePointer2, bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6' },
  form_submit:   { label: '리드전환', icon: CheckCircle2,  bg: '#f0fdf4', border: '#86efac', text: '#15803d', dot: '#22c55e' },
};

const CHANNEL_KO = {
  direct: '직접 방문', organic: '검색 유입', paid_search: '광고 검색',
  paid_social: '유료 SNS', email: '이메일', referral: '외부 링크',
  kakao: '카카오', organic_social: 'SNS', other: '기타',
};

function shortUrl(url) {
  if (!url) return '?';
  const clean = url.replace(/^\//, '').split('?')[0];
  if (!clean) return '/';
  const parts = clean.split('/');
  if (parts.length > 2) return `…/${parts[parts.length - 1]}`;
  return `/${clean}`;
}

function fmtDwell(secs) {
  if (!secs || secs <= 0) return null;
  if (secs < 60) return `${secs}초`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
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

// ── 재방문 합산 노드 빌드 ─────────────────────────
function buildNodes(events) {
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view', 'cta_click', 'form_submit'].includes(e.event_type)
  );
  const withDwell = relevant.map((e, i) => {
    const next = relevant[i + 1];
    const dwell = next
      ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
      : 0;
    return { ...e, dwell_seconds: dwell };
  });

  // 같은 URL+type은 합산 (첫 등장 순서 유지)
  const seen = new Map();
  const merged = [];
  for (const e of withDwell) {
    const key = `${e.event_type}::${e.page_url || ''}`;
    if (seen.has(key)) {
      const idx = seen.get(key);
      merged[idx].visit_count = (merged[idx].visit_count || 1) + 1;
      merged[idx].total_dwell = (merged[idx].total_dwell || 0) + e.dwell_seconds;
    } else {
      seen.set(key, merged.length);
      merged.push({ ...e, visit_count: 1, total_dwell: e.dwell_seconds });
    }
  }
  return merged;
}

// ── 체류 상위 페이지 ──────────────────────────────
function topDwellPages(events, limit = 3) {
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view'].includes(e.event_type)
  );
  const withDwell = relevant.map((e, i) => {
    const next = relevant[i + 1];
    return { url: e.page_url, dwell: next ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000) : 0 };
  });
  const map = {};
  for (const { url, dwell } of withDwell) {
    if (!url) continue;
    map[url] = (map[url] || 0) + dwell;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([url, secs], i) => ({ rank: i + 1, url, secs }));
}

// ── 진입 노드 ─────────────────────────────────────
function StartNode({ session }) {
  const channel = CHANNEL_KO[session.channel_group] || session.channel_group || '직접 방문';
  const ref = session.referrer && session.referrer !== '' ? session.referrer : null;
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="relative">
        {/* 글로우 */}
        <div className="absolute inset-0 rounded-2xl bg-emerald-400 blur-sm opacity-30" />
        <div className="relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 w-[130px]">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow">
            <LogIn size={15} className="text-white" />
          </div>
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">진입</span>
          <span className="text-[11px] font-bold text-emerald-800 text-center leading-tight">{channel}</span>
          {ref && (
            <span className="text-[9px] text-emerald-600 truncate max-w-full opacity-70" title={ref}>
              from {ref.replace(/https?:\/\//, '').split('/')[0]}
            </span>
          )}
          <span className="text-[9px] text-emerald-500 font-mono truncate max-w-full">{session.landing_url || '/'}</span>
        </div>
      </div>
      <span className="text-[9px] text-zinc-400 mt-1.5">{fmtAgo(session.session_start)}</span>
    </div>
  );
}

// ── 이벤트 노드 ───────────────────────────────────
function EventNode({ node }) {
  const meta = EVENT_META[node.event_type] || EVENT_META.page_view;
  const Icon = meta.icon;
  const dwell = node.total_dwell;

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div
        className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border-2 w-[120px] transition-shadow hover:shadow-md"
        style={{ background: meta.bg, borderColor: meta.border }}
      >
        {/* 아이콘 + 방문횟수 */}
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: meta.dot }}>
            <Icon size={13} className="text-white" />
          </div>
          {node.visit_count > 1 && (
            <span className="text-[8px] font-black bg-zinc-700 text-white px-1.5 py-0.5 rounded-full">×{node.visit_count}</span>
          )}
        </div>
        {/* URL — 클릭 시 실제 페이지 열기 */}
        {node.page_url ? (
          <a
            href={node.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-center leading-tight truncate max-w-full px-1 hover:underline"
            style={{ color: meta.text }}
            title={node.page_url}
          >
            {shortUrl(node.page_url)}
          </a>
        ) : (
          <span className="text-[10px] font-bold text-center leading-tight truncate max-w-full px-1" style={{ color: meta.text }}>
            {node.event_type}
          </span>
        )}
        {/* 타입 라벨 */}
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: meta.border + '60', color: meta.text }}>
          {meta.label}
        </span>
        {/* 체류시간 — 노드 안에 */}
        {dwell > 0 && (
          <div className="flex items-center gap-0.5" style={{ color: meta.text }}>
            <Clock size={8} style={{ opacity: 0.5 }} />
            <span className="text-[9px] font-bold opacity-70">{fmtDwell(dwell)}</span>
          </div>
        )}
        {node.event_type === 'cta_click' && node.event_data?.label && (
          <span className="text-[8px] text-blue-500 truncate max-w-full px-1 text-center">
            &ldquo;{node.event_data.label}&rdquo;
          </span>
        )}
      </div>
      <span className="text-[9px] text-zinc-300 mt-1.5">{fmtTime(node.created_at)}</span>
    </div>
  );
}

// ── 종료 노드 ─────────────────────────────────────
function EndNode({ lastEventTime }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-zinc-400 blur-sm opacity-20" />
        <div className="relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-zinc-300 bg-zinc-50 w-[120px]">
          <div className="w-8 h-8 rounded-xl bg-zinc-400 flex items-center justify-center shadow">
            <LogOut size={15} className="text-white" />
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">종료</span>
          <span className="text-[9px] text-zinc-400 text-center leading-snug">30분 무활동<br/>세션 종료</span>
        </div>
      </div>
      {lastEventTime && (
        <span className="text-[9px] text-zinc-300 mt-1.5">{fmtTime(lastEventTime)}</span>
      )}
    </div>
  );
}

// ── 화살표 연결 ───────────────────────────────────
function Arrow() {
  return (
    <div className="flex items-center flex-shrink-0 mx-1 self-center mt-[-10px]">
      <div className="h-0.5 w-5 bg-zinc-800" />
      <div
        className="border-t-[4px] border-b-[4px] border-l-[6px]"
        style={{ borderColor: 'transparent transparent transparent #18181b' }}
      />
    </div>
  );
}

// ── 세션 행 ───────────────────────────────────────
function SessionRow({ session, events, index, total }) {
  const nodes = buildNodes(events);
  const top = topDwellPages(events, 3);
  const lastEvent = events[events.length - 1];

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
      {/* 세션 헤더 바 */}
      <div className="flex items-center gap-3 px-5 py-3 bg-zinc-900 flex-wrap">
        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
          {total - index}
        </div>
        <span className="text-sm font-black text-white tracking-tight">세션 {total - index}</span>
        <span className="text-[10px] text-zinc-400">{fmtAgo(session.session_start)}</span>
        <div className="flex items-center gap-2">
          {session.device_type === 'mobile'
            ? <Smartphone size={11} className="text-zinc-500" />
            : <Monitor size={11} className="text-zinc-500" />}
          <span className="text-[10px] text-zinc-500">{CHANNEL_KO[session.channel_group] || '직접'}</span>
        </div>
        {/* 체류 순위 */}
        {top.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">체류 순위</span>
            {top.map(p => (
              <div key={p.url} className="flex items-center gap-1 border border-white/10 rounded-lg px-2 py-0.5 bg-white/5">
                <span className="text-[9px] font-black text-zinc-400">{p.rank}위</span>
                <span className="text-[9px] font-mono text-zinc-300 truncate max-w-[90px]">{shortUrl(p.url)}</span>
                <span className="text-[9px] text-zinc-500">{fmtDwell(p.secs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 게임판 경로 */}
      <div className="p-5 bg-zinc-50 overflow-x-auto">
        {nodes.length === 0 ? (
          <p className="text-xs text-zinc-300 italic py-4 text-center">기록된 이벤트 없음</p>
        ) : (
          <div className="flex items-end min-w-max gap-0">
            {/* 진입 */}
            <StartNode session={session} />
            <Arrow />

            {/* 이벤트 노드들 */}
            {nodes.map((node, i) => (
              <div key={node.id || i} className="flex items-end">
                <EventNode node={node} />
                <Arrow />
              </div>
            ))}

            {/* 종료 */}
            <EndNode lastEventTime={lastEvent?.created_at} />
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
  const hasCta = events.some(e => e.event_type === 'cta_click');
  const hasLead = events.some(e => e.event_type === 'form_submit');
  const uniquePages = [...new Set(events.filter(e => e.event_type === 'page_view').map(e => e.page_url))].length;

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">

      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-zinc-900 tracking-tight">방문자 여정 상세</h1>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{anonymousId}</p>
        </div>
      </div>

      {/* 신원 + 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`col-span-2 rounded-2xl border p-4 flex items-center gap-3 ${identity.is_identified ? 'bg-violet-50 border-violet-200' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${identity.is_identified ? 'bg-violet-100 text-violet-700' : 'bg-zinc-200 text-zinc-400'}`}>
            {identity.is_identified ? (identity.display_name[0] || '?') : <User size={16} />}
          </div>
          <div>
            <p className={`font-black text-sm ${identity.is_identified ? 'text-violet-900' : 'text-zinc-600'}`}>{identity.display_name}</p>
            {identity.display_phone && <p className="text-xs text-zinc-500">{identity.display_phone}</p>}
            {identity.is_identified && <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">카카오 인증</span>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">세션</p>
          <p className="text-3xl font-black text-zinc-900 mt-1 leading-none">{sessions.length}</p>
          <p className="text-[10px] text-zinc-300 mt-1.5">{uniquePages}개 페이지 방문</p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">전환</p>
          <div className="flex flex-col gap-1.5 mt-2">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${hasCta ? 'bg-blue-50 text-blue-600' : 'bg-zinc-50 text-zinc-300'}`}>
              {hasCta ? '✓' : '✗'} CTA 클릭
            </span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${hasLead ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-300'}`}>
              {hasLead ? '✓' : '✗'} 리드 전환
            </span>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        {Object.entries(EVENT_META).map(([k, v]) => (
          <span
            key={k}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border font-bold"
            style={{ background: v.bg, borderColor: v.border, color: v.text }}
          >
            <v.icon size={9} />{v.label}
          </span>
        ))}
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 font-bold">
          <CornerUpLeft size={9} />뒤로가기
        </span>
        <span className="text-zinc-300 ml-1">· 화살표 위 = 체류시간 · 종료 = 30분 무활동</span>
      </div>

      {/* 세션 경로들 */}
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
