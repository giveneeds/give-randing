'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, User, Smartphone, Monitor, Clock,
  Eye, FileText, MousePointer2, CheckCircle2, CornerUpLeft,
  ChevronRight, ArrowLeft,
} from 'lucide-react';

// ── 이벤트 타입 메타 ──────────────────────────────
const EVENT_META = {
  page_view:     { icon: Eye,           color: 'bg-zinc-100 text-zinc-500 border-zinc-200',         short: 'PV' },
  magazine_view: { icon: FileText,      color: 'bg-violet-50 text-violet-600 border-violet-200',     short: '📖' },
  service_view:  { icon: FileText,      color: 'bg-amber-50 text-amber-600 border-amber-200',        short: '⚙️' },
  cta_click:     { icon: MousePointer2, color: 'bg-blue-50 text-blue-600 border-blue-200',           short: '🖱' },
  form_submit:   { icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200',  short: '✓' },
};

// ── 시간 포맷 ──────────────────────────────────────
function fmtDwell(secs) {
  if (!secs || secs <= 0) return null;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s > 0 ? `${m}m${s}s` : `${m}m`;
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

function shortUrl(url) {
  if (!url) return '?';
  // /magazine/slug → magazine/slug, /admin/funnel → admin/funnel
  return url.replace(/^\//, '').split('?')[0] || '/';
}

// ── 뒤로가기 감지 + 여정 노드 빌드 ───────────────
function buildJourneyNodes(events) {
  // page_view + magazine_view + service_view + cta_click + form_submit만 표시
  const relevant = events.filter(e =>
    ['page_view', 'magazine_view', 'service_view', 'cta_click', 'form_submit'].includes(e.event_type)
  );

  const visitHistory = []; // 방문한 URL 순서 스택
  const nodes = [];

  for (let i = 0; i < relevant.length; i++) {
    const e = relevant[i];
    const next = relevant[i + 1];
    const dwell = next
      ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
      : null;

    // 뒤로가기 감지: page_view인데 이전에 방문한 URL이면 back
    const isBack = e.event_type === 'page_view' && visitHistory.includes(e.page_url);

    if (e.event_type === 'page_view') {
      visitHistory.push(e.page_url);
    }

    nodes.push({ ...e, dwell_seconds: dwell, isBack });
  }
  return nodes;
}

// ── 여정 흐름 컴포넌트 ──────────────────────────
function JourneyFlow({ nodes, compact = false }) {
  if (!nodes.length) {
    return <span className="text-xs text-zinc-300 italic">이벤트 없음</span>;
  }

  return (
    <div className="flex items-start flex-wrap gap-0">
      {nodes.map((node, i) => {
        const meta = EVENT_META[node.event_type] || EVENT_META.page_view;
        const Icon = meta.icon;

        return (
          <div key={i} className="flex items-center">
            {/* 뒤로가기 화살표 */}
            {node.isBack && (
              <div className="flex items-center text-zinc-300 mx-0.5" title="뒤로가기">
                <CornerUpLeft size={10} className="text-zinc-400" />
              </div>
            )}

            {/* 노드 */}
            <div className={`relative flex flex-col items-center ${compact ? '' : 'group'}`}>
              <div
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold
                  whitespace-nowrap max-w-[120px] overflow-hidden
                  ${meta.color}
                  ${node.isBack ? 'opacity-60 ring-1 ring-zinc-300' : ''}
                  ${compact ? '' : 'cursor-default'}
                `}
                title={`${node.event_type} · ${node.page_url || ''}`}
              >
                <Icon size={9} className="flex-shrink-0" />
                <span className="truncate">{shortUrl(node.page_url || node.event_type)}</span>
                {node.isBack && <CornerUpLeft size={8} className="ml-0.5 flex-shrink-0 opacity-60" />}
              </div>

              {/* 체류시간 */}
              {node.dwell_seconds !== null && node.dwell_seconds !== undefined && node.dwell_seconds > 0 && (
                <span className="text-[9px] text-zinc-300 mt-0.5 flex items-center gap-0.5">
                  <Clock size={7} />
                  {fmtDwell(node.dwell_seconds)}
                </span>
              )}
            </div>

            {/* 화살표 (마지막 제외) */}
            {i < nodes.length - 1 && (
              <ChevronRight size={11} className="text-zinc-200 mx-0.5 flex-shrink-0 mt-[-8px]" />
            )}
          </div>
        );
      })}
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

  // 세션별 노드 그룹핑
  const sessionGroups = detail
    ? (detail.sessions || []).map(s => ({
        session: s,
        nodes: buildJourneyNodes((detail.events || []).filter(e => e.session_id === s.id)),
      }))
    : [];

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-zinc-300 shadow-md' : 'border-zinc-100 hover:border-zinc-200'}`}>
      {/* 헤더 행 */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-zinc-50 transition-colors"
      >
        {/* 아바타 */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${visitor.is_identified ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-400'}`}>
          {visitor.is_identified ? (visitor.display_name[0] || '?') : <User size={14} />}
        </div>

        {/* 이름 + 서브정보 */}
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
            <span>{visitor.channel_group || 'direct'}</span>
            <span>·</span>
            <span>{visitor.session_count}세션</span>
            <span>·</span>
            <span>{visitor.event_count || 0}이벤트</span>
          </div>
        </div>

        {/* 미니 여정 미리보기 (접혀 있을 때) */}
        {!expanded && visitor.recent_pages && (
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0 max-w-[260px] overflow-hidden">
            {(visitor.recent_pages || []).slice(0, 4).map((p, i) => (
              <span key={i} className="text-[9px] text-zinc-400 font-mono bg-zinc-50 px-1.5 py-0.5 rounded truncate max-w-[60px]">
                {shortUrl(p)}
              </span>
            ))}
            {(visitor.recent_pages || []).length > 4 && (
              <span className="text-[9px] text-zinc-300">+{visitor.recent_pages.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-zinc-300">{fmtAgo(visitor.last_seen)}</span>
          <ChevronRight size={14} className={`text-zinc-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* 펼쳐진 여정 */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-zinc-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">여정 불러오는 중…</span>
            </div>
          ) : sessionGroups.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-300">이벤트 없음</div>
          ) : (
            <div className="p-4 space-y-4">
              {sessionGroups.map((sg, si) => (
                <div key={sg.session.id || si}>
                  {/* 세션 헤더 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      세션 {sessionGroups.length - si}
                    </span>
                    <span className="text-[10px] text-zinc-300">
                      {new Date(sg.session.session_start).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-zinc-300">·</span>
                    <span className="text-[10px] text-zinc-300">{sg.session.channel_group || 'direct'}</span>
                    {sg.session.device_type === 'mobile' ? <Smartphone size={9} className="text-zinc-300" /> : <Monitor size={9} className="text-zinc-300" />}
                  </div>

                  {/* 여정 흐름 */}
                  {sg.nodes.length > 0 ? (
                    <JourneyFlow nodes={sg.nodes} />
                  ) : (
                    <span className="text-[10px] text-zinc-300 italic">이벤트 없음</span>
                  )}
                </div>
              ))}

              {/* 상세 페이지 링크 */}
              <div className="pt-2 border-t border-zinc-100">
                <Link
                  href={`/admin/funnel/visitor/${encodeURIComponent(visitor.anonymous_id)}`}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  전체 여정 상세 보기 →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────
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

  const toggle = useCallback((id) => {
    setExpanded(prev => prev === id ? null : id);
  }, []);

  const filtered = visitors.filter(v =>
    !search ||
    v.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.anonymous_id?.includes(search)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/admin/funnel" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">방문자 여정</h1>
          <p className="text-xs text-zinc-400 mt-0.5">각 방문자가 어떤 페이지를 어떤 순서로 이동했는지 확인합니다. ↩ 는 뒤로가기입니다.</p>
        </div>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="이름 또는 ID로 검색…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />

      {/* 범례 */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-zinc-400">
        <span className="font-bold">범례:</span>
        {Object.entries(EVENT_META).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${v.color}`}>
            <v.icon size={9} />
            {k === 'page_view' ? '페이지' : k === 'magazine_view' ? '매거진' : k === 'service_view' ? '서비스' : k === 'cta_click' ? 'CTA' : '리드'}
          </span>
        ))}
        <span className="flex items-center gap-1 text-zinc-400">
          <CornerUpLeft size={9} />
          뒤로가기
        </span>
        <span className="text-zinc-300">· 노드 사이 숫자 = 체류시간</span>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">불러오는 중…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">
          {search ? '검색 결과 없음' : '아직 방문자 데이터가 없습니다'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            {filtered.length}명
          </p>
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
