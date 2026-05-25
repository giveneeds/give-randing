'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, Filter, ExternalLink, ChevronLeft, ChevronRight,
  Inbox, Check, X, Send, Tag, Clock, Languages, Play, Zap, MessageSquare,
} from 'lucide-react';

const PAGE_SIZE = 20;

const SOURCE_LABEL = {
  youtube: { label: 'YouTube', cls: 'bg-red-50 text-red-600 border-red-200' },
  threads: { label: 'Threads', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  instagram: { label: 'Instagram', cls: 'bg-pink-50 text-pink-600 border-pink-200' },
  hackernews: { label: 'Hacker News', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  reddit: { label: 'Reddit', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  google_news: { label: '구글뉴스', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  naver_news: { label: '네이버', cls: 'bg-green-50 text-green-600 border-green-200' },
  web: { label: 'Web', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const STATUS_LABEL = {
  collected: { label: '새 자료', cls: 'bg-zinc-100 text-zinc-600' },
  reviewed: { label: '검토 중', cls: 'bg-blue-50 text-blue-600' },
  approved: { label: '채택', cls: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: '폐기', cls: 'bg-red-50 text-red-600' },
  sent: { label: '매거진으로 보냄', cls: 'bg-violet-50 text-violet-600' },
};

const PERSONA_LABEL = {
  restaurant_owner: '요식업',
  clinic_owner: '병의원',
  brand_operator: '브랜드 운영자',
  marketer: '마케터',
  small_brand_owner: '작은 브랜드',
  general_reader: '일반 독자',
  general: '일반',
  unknown: '미상',
};

export default function ContentStudioReviewPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [themes, setThemes] = useState([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState({});
  const [collecting, setCollecting] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  useEffect(() => { setPage(1); }, [sourceFilter, statusFilter, themeFilter]);

  // 주제 목록 1회 로드 — 필터 드롭다운 + 카드 배지에서 사용.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/content-studio/themes', { headers: await authHeaders() });
        const data = await res.json();
        if (res.ok) setThemes(data.rows || []);
      } catch {
        // 주제 로드 실패는 무시 — 검토함 기본 기능은 동작.
      }
    })();
  }, [authHeaders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (themeFilter !== 'all') params.set('theme_id', themeFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));
      const res = await fetch(`/api/admin/content-studio/items?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e) {
      alert('자료 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, statusFilter, themeFilter, page, authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function patchItem(id, patch) {
    setBusy((b) => ({ ...b, [id]: 'patch' }));
    try {
      const res = await fetch(`/api/admin/content-studio/items/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('업데이트 실패: ' + (data.error || ''));
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.row } : r)));
    } finally {
      setBusy((b) => { const { [id]: _, ...rest } = b; return rest; });
    }
  }

  // 수집 트리거 — 자동 cron 과 동일하게 매체별 1건씩 + 채택 게이트(외부 알림)까지 한 번에.
  // mode='test'  : src당 1건 cap + 발송 (cron 시뮬레이션 / 빠른 검증)
  // mode='full'  : cap 없이 전 매체 + 발송 X (검수만 쌓아두기)
  async function runCollect(mode) {
    setCollecting(true);
    try {
      const res = await fetch('/api/admin/content-studio/collect', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(
          mode === 'test'
            ? { cronLikeCap: true, dispatch: true }
            : { cronLikeCap: false, dispatch: false }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('수집 실패: ' + (data.error || ''));
        return;
      }
      const collected = data.stats?.collected ?? 0;
      const skippedDup = data.stats?.skipped ?? 0;
      const planningSent = data.planning?.sent ?? 0;
      const candidateCount = data.planning?.candidates ?? 0;
      const planningSkip = data.planning?.skipped_reason;
      const dupNote = skippedDup > 0 ? ` (중복 ${skippedDup})` : '';
      const msg =
        mode === 'test'
          ? planningSkip
            ? `자료 ${collected}건 모음${dupNote} · 1차 보고 스킵 (${planningSkip})`
            : `자료 ${collected}건 모음${dupNote} · 1차 보고서 ${planningSent}명에게 발송 (후보 ${candidateCount}건)`
          : `자료 ${collected}건 모음${dupNote}. 보고는 텔레그램으로 도착합니다.`;
      alert(msg);
      load();
    } catch (e) {
      alert('네트워크 오류: ' + e.message);
    } finally {
      setCollecting(false);
    }
  }

  async function notifyTelegram(id) {
    setBusy((b) => ({ ...b, [id]: 'notify' }));
    try {
      const res = await fetch(`/api/admin/content-studio/items/${id}/notify`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('채택 알림 실패: ' + (data.error || ''));
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.row } : r)));
      alert(`채택 알림 보냄 (${data.delivered_count || 0}명)`);
    } finally {
      setBusy((b) => { const { [id]: _, ...rest } = b; return rest; });
    }
  }

  // 검토함 카드의 자료 1건을 스레드 드래프트로 변환. 변환 후 드래프트 편집 페이지로 이동 안내.
  async function makeThreadDraft(id) {
    setBusy((b) => ({ ...b, [id]: 'thread' }));
    try {
      const res = await fetch(`/api/admin/content-studio/items/${id}/to-thread`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ formatTypeHint: 'short_thread' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('스레드 드래프트 생성 실패: ' + (data.error || ''));
        return;
      }
      const goto = confirm(`스레드 드래프트 ${data.postCount}포스트 생성 완료. 편집 페이지로 이동할까요?`);
      if (goto) {
        window.location.href = `/admin/content-studio/thread-drafts/${data.draftId}`;
      }
    } catch (e) {
      alert('네트워크 오류: ' + e.message);
    } finally {
      setBusy((b) => { const { [id]: _, ...rest } = b; return rest; });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalLabel = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${total}건 중 ${start}–${end} 표시`;
  }, [page, total]);

  return (
    <div className="space-y-5">
      {/* 자료 모으기 트리거 — 자동 cron 시뮬레이션 / 전량 모으기 */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black text-zinc-900 uppercase tracking-widest">지금 자료 모으기</div>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
            [빠른 모음]은 매체별로 신선한 1건씩만 모으고 채택 알림까지 한 번에. 다음 자동 수집을 기다리지 않고 검증할 때 사용.
            [전체 모음]은 제한 없이 검토함에 쌓아두고 카드별로 채택 결정.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => runCollect('test')}
            disabled={collecting}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-md bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {collecting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            <span>빠른 모음 (매체별 1건 + 알림)</span>
          </button>
          <button
            onClick={() => runCollect('full')}
            disabled={collecting}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-md border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {collecting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>전체 모음 (알림 없이)</span>
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500 font-medium">{totalLabel}</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 주제</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 매체</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 상태</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-md border border-[var(--admin-border)] py-24 text-center text-zinc-400 shadow-sm">
          <Inbox size={32} strokeWidth={1} className="mx-auto mb-3" />
          <p className="text-sm">수집된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <ItemCard
              key={r.id}
              item={r}
              busy={busy[r.id]}
              onPatch={patchItem}
              onNotify={notifyTelegram}
              onMakeThread={makeThreadDraft}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[var(--admin-border)] rounded-md p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">{totalLabel}</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-zinc-600 px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, busy, onPatch, onNotify, onMakeThread }) {
  const sourceCfg = SOURCE_LABEL[item.source] || { label: item.source, cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  const statusCfg = STATUS_LABEL[item.status] || STATUS_LABEL.collected;
  const original = item.normalized?.extracted_text || '';
  const originalTitle = item.normalized?.title || item.post_url;
  const tr = item.translation || {};
  const summary = item.summary?.one_line_summary;
  const keyPoints = item.summary?.key_points || [];
  const why = item.summary?.why_it_matters;
  const persona = item.classification?.suggested_persona;
  const topic = item.classification?.suggested_topic_cluster;
  const confidence = item.classification?.classification_confidence;
  const isKorean = tr.source_lang === 'ko';

  return (
    <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
      <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-3 flex items-center gap-2 flex-wrap border-b border-zinc-50">
        <span className={`inline-block text-[10px] font-bold border px-2 py-1 rounded-full ${sourceCfg.cls}`}>
          {sourceCfg.label}
        </span>
        {item.theme?.name && (
          <span className="inline-block text-[10px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
            📌 {item.theme.name}
          </span>
        )}
        {item.source_account && (
          <span className="text-[10px] font-bold text-zinc-500">@{item.source_account}</span>
        )}
        <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        {item.approved_via && (
          <span className="text-[10px] font-bold text-zinc-400">
            외부 채택
          </span>
        )}
        {item.notified_at && (
          <span className="text-[10px] font-bold text-violet-500 inline-flex items-center gap-1">
            <Send size={10} /> 알림 {new Date(item.notified_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div className="ml-auto text-[10px] text-zinc-400">
          {item.posted_at && <span className="mr-2"><Clock size={10} className="inline mr-0.5" /> {new Date(item.posted_at).toLocaleDateString('ko-KR')}</span>}
          <span>모음 {new Date(item.collected_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* 원문 */}
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 inline-flex items-center gap-1">
            원문 {isKorean && <span className="text-zinc-300">(이미 한국어)</span>}
          </div>
          <h3 className="text-sm font-black text-zinc-900 leading-snug">{originalTitle}</h3>
          {original && (
            <p className="text-xs text-zinc-600 leading-relaxed">
              {original.length > 300 ? original.slice(0, 300) + '…' : original}
            </p>
          )}
        </div>

        {/* 한국어 번역 */}
        <div className="space-y-2 md:border-l md:border-zinc-100 md:pl-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 inline-flex items-center gap-1">
            <Languages size={10} /> 한국어 번역
          </div>
          {tr.translated_title || tr.translated_text ? (
            <>
              {tr.translated_title && (
                <h3 className="text-sm font-black text-zinc-900 leading-snug">{tr.translated_title}</h3>
              )}
              {tr.translated_text && (
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {tr.translated_text.length > 300 ? tr.translated_text.slice(0, 300) + '…' : tr.translated_text}
                </p>
              )}
            </>
          ) : isKorean ? (
            <p className="text-xs text-zinc-300 italic">한국어 원문이라 번역 불필요</p>
          ) : (
            <p className="text-xs text-zinc-300 italic">아직 번역 안 됨 — 채택 알림 시 자동 번역</p>
          )}
        </div>

        {/* AI 요약 + 분류 */}
        <div className="space-y-2 md:border-l md:border-zinc-100 md:pl-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI 요약</div>
          {summary ? (
            <p className="text-sm text-zinc-800 leading-relaxed font-medium">{summary}</p>
          ) : (
            <p className="text-xs text-zinc-300 italic">요약 미생성</p>
          )}
          {keyPoints.length > 0 && (
            <ul className="space-y-0.5">
              {keyPoints.map((kp, i) => (
                <li key={i} className="text-xs text-zinc-600 flex items-start gap-1.5">
                  <span className="text-zinc-300 mt-0.5">•</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          )}
          {why && (
            <div className="text-[11px] text-zinc-500 italic pt-1">왜 중요: {why}</div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1">
            <Tag size={10} className="text-zinc-300" />
            {persona && persona !== 'unknown' && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">{PERSONA_LABEL[persona] || persona}</span>
            )}
            {topic && topic !== 'unclassified' && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">{topic}</span>
            )}
            {typeof confidence === 'number' && (
              <span className="text-zinc-400">신뢰도 {(confidence * 100).toFixed(0)}%</span>
            )}
            {typeof item.classification?.fit_score === 'number' && (
              <span className="text-zinc-400">적합도 {(item.classification.fit_score * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
      </div>

      <BriefAndResearch item={item} />

      <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <a
            href={item.post_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-900"
          >
            원문 보기 <ExternalLink size={11} />
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onMakeThread(item.id)}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {busy === 'thread' ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            스레드 만들기
          </button>
          <button
            onClick={() => onNotify(item.id)}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {busy === 'notify' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            채택 알림 보내기
          </button>
          <button
            onClick={() => onPatch(item.id, { status: 'approved' })}
            disabled={!!busy || item.status === 'approved'}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Check size={12} /> 채택
          </button>
          <button
            onClick={() => onPatch(item.id, { status: 'rejected', send_flag: false })}
            disabled={!!busy || item.status === 'rejected'}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <X size={12} /> 폐기
          </button>
        </div>
      </div>
    </div>
  );
}

// 콘텐츠 기획 브리프 + 리서치 컨텍스트를 펼침/접힘으로 노출.
// 자료가 어떤 주제 페인포인트·후킹 구조를 기반으로 가공됐는지 투명하게 보여준다.
function BriefAndResearch({ item }) {
  const [open, setOpen] = useState(false);
  const c = item.classification || {};
  const rc = item.research_context || {};
  const angles = Array.isArray(c.content_angles) ? c.content_angles : [];
  const angle = c.content_angle;
  const recommendedTitle = c.recommended_title;
  const readerProblem = c.reader_problem;
  const whyNow = c.why_now;
  const practical = c.practical_takeaway;
  const execSteps = Array.isArray(c.execution_steps) ? c.execution_steps : [];
  const leadMagnet = c.lead_magnet?.title || c.lead_magnet_idea;
  const painPoints = Array.isArray(rc.pain_points) ? rc.pain_points : [];
  const viralHooks = Array.isArray(rc.viral_hooks) ? rc.viral_hooks : [];
  const recAngles = Array.isArray(rc.recommended_angles) ? rc.recommended_angles : [];

  const hasBrief = recommendedTitle || angle || angles.length > 0 || practical || execSteps.length > 0;
  const hasResearch = painPoints.length > 0 || viralHooks.length > 0 || recAngles.length > 0;
  if (!hasBrief && !hasResearch) return null;

  return (
    <div className="px-5 py-3 border-t border-zinc-100 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition"
      >
        <span className="text-zinc-300">{open ? '▼' : '▶'}</span>
        콘텐츠 기획 브리프 {hasResearch && <span className="text-violet-400 normal-case font-bold">· 리서치 반영됨</span>}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-5">
          {hasBrief && (
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">브리프</div>
              {recommendedTitle && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">추천 제목</div>
                  <div className="text-sm font-black text-zinc-900">✍️ {recommendedTitle}</div>
                </div>
              )}
              {readerProblem && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">독자 문제</div>
                  <p className="text-xs text-zinc-700">{readerProblem}</p>
                </div>
              )}
              {whyNow && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">왜 지금</div>
                  <p className="text-xs text-zinc-700">{whyNow}</p>
                </div>
              )}
              {angle && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">핵심 앵글</div>
                  <p className="text-xs text-zinc-700 font-medium">📐 {angle}</p>
                </div>
              )}
              {angles.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">대안 앵글</div>
                  <ul className="space-y-0.5">
                    {angles.slice(0, 3).map((a, i) => (
                      <li key={i} className="text-xs text-zinc-600">· {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {practical && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">실용 takeaway</div>
                  <p className="text-xs text-zinc-700">💡 {practical}</p>
                </div>
              )}
              {execSteps.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">실행 단계</div>
                  <ol className="space-y-0.5 list-decimal list-inside">
                    {execSteps.slice(0, 4).map((s, i) => (
                      <li key={i} className="text-xs text-zinc-600">{s}</li>
                    ))}
                  </ol>
                </div>
              )}
              {leadMagnet && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-0.5">리드마그넷 후보</div>
                  <p className="text-xs text-zinc-700">📎 {leadMagnet}</p>
                </div>
              )}
            </div>
          )}
          {hasResearch && (
            <div className="space-y-3 md:border-l md:border-zinc-100 md:pl-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-400">참고한 리서치 인사이트</div>
              {painPoints.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">사장님 페인포인트</div>
                  <ul className="space-y-0.5">
                    {painPoints.slice(0, 4).map((p, i) => (
                      <li key={i} className="text-xs text-zinc-700">⚠️ {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {viralHooks.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">자주 쓰이는 후킹</div>
                  <ul className="space-y-0.5">
                    {viralHooks.slice(0, 3).map((h, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-bold text-zinc-900">{h.pattern}</span>
                        {h.example && <span className="text-zinc-500"> — &ldquo;{h.example}&rdquo;</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {recAngles.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">리서치 기반 추천 앵글</div>
                  <ul className="space-y-0.5">
                    {recAngles.slice(0, 3).map((a, i) => (
                      <li key={i} className="text-xs text-zinc-700">→ {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
