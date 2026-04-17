'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Globe, Smartphone, Monitor, Clock,
  MousePointer2, Eye, FileText, CheckCircle2, Loader2, CornerUpLeft,
} from 'lucide-react';

const EVENT_LABELS = {
  page_view: { label: '페이지 조회', color: 'bg-zinc-100 text-zinc-600', icon: Eye },
  magazine_view: { label: '매거진 조회', color: 'bg-blue-50 text-blue-600', icon: FileText },
  service_view: { label: '서비스 조회', color: 'bg-purple-50 text-purple-600', icon: FileText },
  cta_click: { label: 'CTA 클릭', color: 'bg-amber-50 text-amber-600', icon: MousePointer2 },
  lead_submit: { label: '리드 전환', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
};

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDwell(secs) {
  if (secs === null || secs === undefined) return null;
  if (secs < 60) return `${secs}초`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

export default function VisitorDetailPage() {
  const { anonymousId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSession, setActiveSession] = useState('all');

  useEffect(() => {
    if (!anonymousId) return;
    setLoading(true);
    fetch(`/api/analytics/visitor/${encodeURIComponent(anonymousId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [anonymousId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        <span className="text-sm">불러오는 중…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-rose-500 text-sm">오류: {error || '데이터 없음'}</div>
    );
  }

  const { identity, sessions, events } = data;

  const rawFiltered = activeSession === 'all'
    ? events
    : events.filter(e => e.session_id === activeSession);

  // 뒤로가기 감지: page_view인데 이미 방문한 URL이면 isBack = true
  const visitedUrls = [];
  const filteredEvents = rawFiltered.map(e => {
    const isBack = e.event_type === 'page_view' && visitedUrls.includes(e.page_url);
    if (e.event_type === 'page_view' && e.page_url) visitedUrls.push(e.page_url);
    return { ...e, isBack };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-black text-zinc-900 tracking-tight">방문자 여정</h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{anonymousId}</p>
        </div>
      </div>

      {/* 신원 카드 */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${identity.is_identified ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${identity.is_identified ? 'bg-emerald-100' : 'bg-zinc-200'}`}>
          <User size={18} className={identity.is_identified ? 'text-emerald-600' : 'text-zinc-500'} />
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-sm">{identity.display_name}</p>
          {identity.display_phone && (
            <p className="text-xs text-zinc-500">{identity.display_phone}</p>
          )}
          <p className="text-xs text-zinc-400 mt-0.5">
            {sessions.length}개 세션 · {events.length}개 이벤트
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 세션 목록 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">세션</h2>

          <button
            onClick={() => setActiveSession('all')}
            className={`w-full text-left p-3 rounded-xl border text-xs transition ${activeSession === 'all' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'}`}
          >
            <span className="font-bold">전체 세션</span>
            <span className="ml-2 opacity-70">{events.length}개 이벤트</span>
          </button>

          {sessions.map((s, i) => {
            const sessEvents = events.filter(e => e.session_id === s.id);
            const isActive = activeSession === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${isActive ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-300'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {s.device_type === 'mobile' ? (
                    <Smartphone size={11} className={isActive ? 'text-zinc-400' : 'text-zinc-400'} />
                  ) : (
                    <Monitor size={11} className="text-zinc-400" />
                  )}
                  <span className={`font-bold ${isActive ? 'text-white' : 'text-zinc-700'}`}>
                    세션 {sessions.length - i}
                  </span>
                  <span className={`ml-auto ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                    {sessEvents.length}이벤트
                  </span>
                </div>
                <p className={`${isActive ? 'text-zinc-400' : 'text-zinc-400'} truncate`}>
                  {formatTime(s.session_start)}
                </p>
                <p className={`mt-0.5 truncate ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {s.channel_group || 'direct'} · {s.landing_url || '/'}
                </p>
              </button>
            );
          })}
        </div>

        {/* 이벤트 타임라인 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">
            이벤트 타임라인
            <span className="ml-2 text-zinc-400 font-normal normal-case">{filteredEvents.length}개</span>
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">이벤트 없음</div>
          ) : (
            <div className="relative">
              {/* 타임라인 선 */}
              <div className="absolute left-4 top-4 bottom-4 w-px bg-zinc-100" />

              <div className="space-y-2">
                {filteredEvents.map((e, i) => {
                  const meta = EVENT_LABELS[e.event_type] || { label: e.event_type, color: 'bg-zinc-100 text-zinc-500', icon: Globe };
                  const Icon = meta.icon;
                  return (
                    <div key={e.id || i} className="flex gap-3 relative">
                      {/* 아이콘 dot */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${meta.color} ${e.isBack ? 'ring-2 ring-offset-1 ring-zinc-300' : ''}`}>
                        {e.isBack ? <CornerUpLeft size={13} /> : <Icon size={13} />}
                      </div>

                      {/* 내용 */}
                      <div className={`flex-1 bg-white border rounded-xl p-3 min-w-0 ${e.isBack ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${meta.color}`}>
                            {meta.label}
                          </span>
                          {e.isBack && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
                              <CornerUpLeft size={9} /> 뒤로가기
                            </span>
                          )}
                          <span className="text-xs text-zinc-400 ml-auto flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(e.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 truncate font-mono">
                          {e.page_url || '-'}
                        </p>

                        {e.event_type === 'cta_click' && e.event_data && (
                          <p className="text-xs text-zinc-400 mt-1">
                            CTA: {e.event_data.cta_id || e.event_data.label || '-'}
                          </p>
                        )}

                        {e.dwell_seconds !== null && e.dwell_seconds !== undefined && e.dwell_seconds > 0 && (
                          <p className="text-[10px] text-zinc-300 mt-1 flex items-center gap-1">
                            <Clock size={9} />
                            다음 이동까지 {formatDwell(e.dwell_seconds)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
