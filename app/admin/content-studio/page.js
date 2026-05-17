'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Loader2, Filter, ExternalLink, ChevronLeft, ChevronRight,
  Inbox, Check, X, Send, Tag, Clock, Languages, Play, Zap,
} from 'lucide-react';

const PAGE_SIZE = 20;

const SOURCE_LABEL = {
  youtube: { label: 'YouTube', cls: 'bg-red-50 text-red-600 border-red-200' },
  threads: { label: 'Threads', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  instagram: { label: 'Instagram', cls: 'bg-pink-50 text-pink-600 border-pink-200' },
  hackernews: { label: 'Hacker News', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  web: { label: 'Web', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const STATUS_LABEL = {
  collected: { label: '수집됨', cls: 'bg-zinc-100 text-zinc-600' },
  reviewed: { label: '검수됨', cls: 'bg-blue-50 text-blue-600' },
  approved: { label: '승인', cls: 'bg-emerald-50 text-emerald-600' },
  rejected: { label: '반려', cls: 'bg-red-50 text-red-600' },
  sent: { label: '발송됨', cls: 'bg-violet-50 text-violet-600' },
};

export default function ContentStudioReviewPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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

  useEffect(() => { setPage(1); }, [sourceFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
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
      alert('수집 결과 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, statusFilter, page, authHeaders]);

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

  // 수집 트리거 — cron 흐름과 동일하게 매체별 1건씩 + 텔레그램 발송까지 한 번에.
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
      const sent = data.dispatch?.sent_items ?? 0;
      const skippedFit = data.dispatch?.skipped_low_fit ?? 0;
      const dupNote = skippedDup > 0 ? ` (중복 ${skippedDup})` : '';
      const msg =
        mode === 'test'
          ? `수집 ${collected}건${dupNote} · 텔레그램 발송 ${sent}건 · 낮은 적합도 스킵 ${skippedFit}건`
          : `수집 ${collected}건${dupNote} (발송 X). 카드별 [텔레그램 보내기]로 개별 발송 가능.`;
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
        alert('텔레그램 발송 실패: ' + (data.error || ''));
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.row } : r)));
      alert(`텔레그램 발송 완료 (${data.delivered_count || 0}명)`);
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
      {/* 수집 트리거 — cron 시뮬레이션(매체 1건씩 + 발송) / 전량(검수만) */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black text-zinc-900 uppercase tracking-widest">수집 실행</div>
          <p className="text-[11px] text-zinc-500 mt-1">
            [빠른 검증]은 cron과 동일하게 매체별 1건씩 수집 + 즉시 텔레그램 발송.
            [전체 수집]은 cap 없이 검수함에만 쌓고 발송은 카드별로 수동.
          </p>
        </div>
        <button
          onClick={() => runCollect('test')}
          disabled={collecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {collecting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          빠른 검증 (1건씩 + 발송)
        </button>
        <button
          onClick={() => runCollect('full')}
          disabled={collecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {collecting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          전체 수집 (발송 없음)
        </button>
      </div>

      <div className="text-xs text-zinc-500 font-medium">{totalLabel}</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="all">모든 소스</option>
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

function ItemCard({ item, busy, onPatch, onNotify }) {
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
      <div className="px-5 pt-5 pb-3 flex items-center gap-2 flex-wrap border-b border-zinc-50">
        <span className={`inline-block text-[10px] font-bold border px-2 py-1 rounded-full ${sourceCfg.cls}`}>
          {sourceCfg.label}
        </span>
        {item.source_account && (
          <span className="text-[10px] font-bold text-zinc-500">@{item.source_account}</span>
        )}
        <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        {item.approved_via && (
          <span className="text-[10px] font-bold text-zinc-400">
            via {item.approved_via}
          </span>
        )}
        {item.notified_at && (
          <span className="text-[10px] font-bold text-violet-500 inline-flex items-center gap-1">
            <Send size={10} /> 발송 {new Date(item.notified_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div className="ml-auto text-[10px] text-zinc-400">
          {item.posted_at && <span className="mr-2"><Clock size={10} className="inline mr-0.5" /> {new Date(item.posted_at).toLocaleDateString('ko-KR')}</span>}
          <span>수집 {new Date(item.collected_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
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
            <p className="text-xs text-zinc-300 italic">아직 번역 안 됨 — 텔레그램 발송 시 자동 번역</p>
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
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">{persona}</span>
            )}
            {topic && topic !== 'unclassified' && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">{topic}</span>
            )}
            {typeof confidence === 'number' && (
              <span className="text-zinc-400">신뢰도 {(confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
      </div>

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
            onClick={() => onNotify(item.id)}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {busy === 'notify' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            텔레그램 보내기
          </button>
          <button
            onClick={() => onPatch(item.id, { status: 'approved' })}
            disabled={!!busy || item.status === 'approved'}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Check size={12} /> 승인
          </button>
          <button
            onClick={() => onPatch(item.id, { status: 'rejected', send_flag: false })}
            disabled={!!busy || item.status === 'rejected'}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <X size={12} /> 반려
          </button>
        </div>
      </div>
    </div>
  );
}
