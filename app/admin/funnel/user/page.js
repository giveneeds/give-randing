'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, User, Smartphone, Monitor, Clock,
  Eye, FileText, MousePointer2, CheckCircle2,
  ChevronDown, ArrowLeft, LogIn, LogOut, Maximize2,
} from 'lucide-react';

// ── 이벤트 메타 ───────────────────────────────────
const EVENT_META = {
  page_view:     { icon: Eye,           bg: '#f4f4f5', border: '#d4d4d8', text: '#52525b', dot: '#71717a', label: '페이지' },
  magazine_view: { icon: FileText,      bg: '#f5f3ff', border: '#c4b5fd', text: '#7c3aed', dot: '#8b5cf6', label: '매거진' },
  service_view:  { icon: FileText,      bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#f59e0b', label: '서비스' },
  cta_click:     { icon: MousePointer2, bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6', label: 'CTA' },
  form_submit:   { icon: CheckCircle2,  bg: '#f0fdf4', border: '#86efac', text: '#15803d', dot: '#22c55e', label: '리드' },
};

const CHANNEL_KO = {
  direct: '직접', organic: '검색', paid_search: '광고검색',
  paid_social: '유료SNS', email: '이메일', referral: '외부링크',
  kakao: '카카오', organic_social: 'SNS',
};

// ── 유틸 ─────────────────────────────────────────
function fmtDwell(secs) {
  if (!secs || secs <= 0) return null;
  if (secs < 60) return `${secs}초`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s > 0 ? `${m}분${s}초` : `${m}분`;
}

function fmtAgo(iso) {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shortUrl(url) {
  if (!url) return '/';
  const clean = url.replace(/^\//, '').split('?')[0];
  if (!clean) return '/';
  const parts = clean.split('/');
  if (parts.length > 2) return `…/${parts[parts.length - 1]}`;
  return `/${clean}`;
}

// ── 노드 병합 (뒤로가기/재방문 = 같은 URL 합산) ──
function buildMergedNodes(events) {
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view', 'cta_click', 'form_submit'].includes(e.event_type)
  );

  // dwell 계산
  const withDwell = relevant.map((e, i) => {
    const next = relevant[i + 1];
    const dwell = next
      ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
      : null;
    return { ...e, dwell_seconds: dwell };
  });

  // URL + event_type 기준으로 합산 (순서 유지, 첫 등장 기준)
  const seen = new Map(); // key → index in result
  const merged = [];

  for (const e of withDwell) {
    const key = `${e.event_type}::${e.page_url || ''}`;
    if (seen.has(key)) {
      const idx = seen.get(key);
      merged[idx].visit_count = (merged[idx].visit_count || 1) + 1;
      merged[idx].total_dwell = (merged[idx].total_dwell || 0) + (e.dwell_seconds || 0);
    } else {
      seen.set(key, merged.length);
      merged.push({ ...e, visit_count: 1, total_dwell: e.dwell_seconds || 0 });
    }
  }
  return merged;
}

// ── 체류 상위 페이지 (세션 헤더용) ───────────────
function topDwellPages(events, limit = 3) {
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view'].includes(e.event_type)
  );
  const withDwell = relevant.map((e, i) => {
    const next = relevant[i + 1];
    const dwell = next
      ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
      : 0;
    return { url: e.page_url, dwell };
  });

  const map = {};
  for (const { url, dwell } of withDwell) {
    if (!url) continue;
    map[url] = (map[url] || 0) + dwell;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url, secs], i) => ({ rank: i + 1, url, secs }));
}

// ── 흐름 노드 컴포넌트 ───────────────────────────
function FlowNode({ node, isLast }) {
  const meta = EVENT_META[node.event_type] || EVENT_META.page_view;
  const Icon = meta.icon;
  const dwell = node.total_dwell;

  return (
    <div className="flex items-center flex-shrink-0">
      {/* 노드 카드 */}
      <div
        className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 w-[110px] select-none"
        style={{ background: meta.bg, borderColor: meta.border }}
      >
        {/* 아이콘 + 라벨 */}
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: meta.dot }}>
            <Icon size={10} className="text-white" />
          </div>
          <span className="text-[9px] font-bold" style={{ color: meta.text }}>{meta.label}</span>
          {node.visit_count > 1 && (
            <span className="text-[8px] font-black bg-zinc-700 text-white px-1 rounded-full leading-tight">×{node.visit_count}</span>
          )}
        </div>
        {/* URL — 클릭 시 실제 페이지 열기 */}
        {node.page_url ? (
          <a
            href={node.page_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-bold text-center leading-tight w-full truncate px-0.5 hover:underline"
            style={{ color: meta.text }}
            title={node.page_url}
          >
            {shortUrl(node.page_url)}
          </a>
        ) : (
          <span className="text-[10px] font-bold text-center leading-tight w-full truncate px-0.5" style={{ color: meta.text }}>
            {node.event_type}
          </span>
        )}
        {/* 체류시간 — 노드 안에 */}
        {dwell > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Clock size={8} style={{ color: meta.text, opacity: 0.5 }} />
            <span className="text-[9px] font-bold" style={{ color: meta.text, opacity: 0.7 }}>
              {fmtDwell(dwell)}
            </span>
          </div>
        )}
      </div>

      {/* 화살표 */}
      {!isLast && (
        <div className="flex items-center mx-1 flex-shrink-0">
          <div className="h-0.5 w-4 bg-zinc-800" />
          <div
            className="border-t-[4px] border-b-[4px] border-l-[6px]"
            style={{ borderColor: 'transparent transparent transparent #18181b' }}
          />
        </div>
      )}
    </div>
  );
}

// ── 세션 흐름 카드 ───────────────────────────────
function SessionFlow({ session, events, index, total }) {
  const nodes = buildMergedNodes(events);
  const top = topDwellPages(events, 3);
  const channel = CHANNEL_KO[session.channel_group] || '직접';

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-zinc-900 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-black text-white">{total - index}</div>
          <span className="text-xs font-black text-white">세션 {total - index}</span>
          <span className="text-[10px] text-zinc-400">{fmtTime(session.session_start)}</span>
          <span className="text-[10px] text-zinc-500">·</span>
          <span className="text-[10px] text-zinc-400">{channel}</span>
          {session.device_type === 'mobile' ? <Smartphone size={10} className="text-zinc-500" /> : <Monitor size={10} className="text-zinc-500" />}
        </div>

        {/* 체류 순위 */}
        {top.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">체류 순위</span>
            {top.map(p => (
              <div key={p.url} className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-lg px-2 py-0.5">
                <span className="text-[9px] font-black text-zinc-400">{p.rank}위</span>
                <span className="text-[9px] font-mono text-zinc-300 truncate max-w-[80px]">{shortUrl(p.url)}</span>
                <span className="text-[9px] text-zinc-500">{fmtDwell(p.secs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 경로 */}
      <div className="p-4 bg-zinc-50 overflow-x-auto">
        {nodes.length === 0 ? (
          <p className="text-xs text-zinc-300 italic text-center py-2">이벤트 없음</p>
        ) : (
          <div className="flex items-center min-w-max gap-0">
            {/* 진입 */}
            <div className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 w-[90px]">
                <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
                  <LogIn size={10} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-emerald-700">진입</span>
                <span className="text-[9px] font-mono text-emerald-600 truncate w-full text-center">{shortUrl(session.landing_url || '/')}</span>
              </div>
              <div className="flex items-center mx-1">
                <div className="h-0.5 w-4 bg-zinc-800" />
                <div className="border-t-[4px] border-b-[4px] border-l-[6px]" style={{ borderColor: 'transparent transparent transparent #18181b' }} />
              </div>
            </div>

            {/* 이벤트 노드들 */}
            {nodes.map((node, i) => (
              <FlowNode key={node.id || i} node={node} isLast={i === nodes.length - 1} />
            ))}

            {/* 종료 */}
            <div className="flex items-center flex-shrink-0">
              <div className="flex items-center mx-1">
                <div className="h-0.5 w-4 bg-zinc-300" />
                <div className="border-t-[4px] border-b-[4px] border-l-[6px]" style={{ borderColor: 'transparent transparent transparent #d4d4d8' }} />
              </div>
              <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 border-zinc-300 bg-white w-[80px]">
                <div className="w-5 h-5 rounded-md bg-zinc-400 flex items-center justify-center">
                  <LogOut size={10} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-zinc-400">종료</span>
                <span className="text-[9px] text-zinc-300 text-center leading-tight">30분<br/>무활동</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 방문자 카드 ──────────────────────────────────
function VisitorCard({ visitor, expanded, onToggle }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || detail) return;
    setLoading(true);
    fetch(`/api/analytics/visitor/${encodeURIComponent(visitor.anonymous_id)}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expanded, visitor.anonymous_id, detail]);

  const sessionGroups = detail
    ? (detail.sessions || []).map(s => ({
        session: s,
        events: (detail.events || []).filter(e => e.session_id === s.id),
      }))
    : [];

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-zinc-300 shadow-md' : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'}`}>
      {/* 방문자 행 */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* 토글 영역 (아바타 + 이름) */}
        <button onClick={onToggle} className="flex items-center gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${visitor.is_identified ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-400'}`}>
            {visitor.is_identified ? (visitor.display_name?.[0] || '?') : <User size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black truncate ${visitor.is_identified ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {visitor.display_name}
              </span>
              {visitor.is_identified && (
                <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full flex-shrink-0">식별됨</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
              {visitor.device_type === 'mobile' ? <Smartphone size={9} /> : <Monitor size={9} />}
              <span>{CHANNEL_KO[visitor.channel_group] || '직접'}</span>
              <span className="text-zinc-200">·</span>
              <span>{visitor.session_count}세션</span>
              <span className="text-zinc-200">·</span>
              <span>{visitor.event_count || 0}이벤트</span>
            </div>
          </div>
        </button>

        {/* 우측: 마지막 방문 + 넓게 보기 + 접기 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-zinc-300">{fmtAgo(visitor.last_seen)}</span>
          <Link
            href={`/admin/funnel/visitor/${encodeURIComponent(visitor.anonymous_id)}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-[10px] font-bold hover:bg-zinc-700 transition-colors"
            title="넓게 보기"
          >
            <Maximize2 size={11} />
            넓게
          </Link>
          <button onClick={onToggle}>
            <ChevronDown size={14} className={`text-zinc-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 펼친 세션들 */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/30 p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-zinc-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">여정 불러오는 중…</span>
            </div>
          ) : sessionGroups.length === 0 ? (
            <p className="text-center text-xs text-zinc-300 py-4">이벤트 없음</p>
          ) : (
            <>
              {sessionGroups.map((sg, si) => (
                <SessionFlow
                  key={sg.session.id || si}
                  session={sg.session}
                  events={sg.events}
                  index={si}
                  total={sessionGroups.length}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────
export default function FunnelUserPage() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/analytics/visitors')
      .then(r => r.json())
      .then(d => setVisitors(d.visitors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((id) => setExpanded(prev => prev === id ? null : id), []);

  const filtered = visitors.filter(v =>
    !search ||
    v.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.anonymous_id?.includes(search)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/admin/funnel" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">방문자 여정</h1>
          <p className="text-xs text-zinc-400 mt-0.5">재방문 페이지는 합산 표시 · 화살표 색 = 검정</p>
        </div>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="이름 또는 ID 검색…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 bg-white"
      />

      {/* 범례 */}
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        {Object.entries(EVENT_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 px-2 py-1 rounded-lg border font-bold"
            style={{ background: v.bg, borderColor: v.border, color: v.text }}>
            <v.icon size={9} />{v.label}
          </span>
        ))}
        <span className="text-zinc-300 ml-1">· 노드 안 숫자 = 체류시간 · ×2 = 재방문 횟수</span>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">불러오는 중…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">
          {search ? '검색 결과 없음' : '방문자 데이터가 없습니다'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{filtered.length}명</p>
          {filtered.map(v => (
            <VisitorCard
              key={v.anonymous_id}
              visitor={v}
              expanded={expanded === v.anonymous_id}
              onToggle={() => toggle(v.anonymous_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
