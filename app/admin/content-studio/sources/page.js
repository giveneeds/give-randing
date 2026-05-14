'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Trash2, Rss, ToggleLeft, ToggleRight, Play } from 'lucide-react';

const SOURCE_TYPES = [
  { value: 'naver_news',  label: '네이버 뉴스',  placeholder: 'B2B 마케팅 (검색어)',  hint: '한국어 뉴스 검색어' },
  { value: 'google_news', label: '구글 뉴스',    placeholder: 'AI marketing',         hint: '구글 뉴스 검색어 (한국어/영어 모두)' },
  { value: 'hackernews',  label: 'Hacker News',  placeholder: 'marketing, growth, b2b', hint: '콤마로 구분된 영어 키워드' },
  { value: 'youtube',     label: 'YouTube',      placeholder: 'UCfz8x0lVzJpb_dgWm9kPVrw', hint: '채널 ID (등록은 가능, 수집기는 Phase 2)' },
  { value: 'threads',     label: 'Threads',      placeholder: 'username',             hint: '계정 핸들 — 현재 수집 미지원 (Phase 2)' },
  { value: 'instagram',   label: 'Instagram',    placeholder: 'username',             hint: '현재 미지원' },
];

export default function ContentStudioSourcesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState('naver_news');
  const [identifier, setIdentifier] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content-studio/sources', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      alert('소스 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/content-studio/sources', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          source_type: sourceType,
          identifier: identifier.trim(),
          label: label.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('추가 실패: ' + (data.error || ''));
        return;
      }
      setRows((prev) => [data.row, ...prev]);
      setIdentifier('');
      setLabel('');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id, active) {
    const res = await fetch(`/api/admin/content-studio/sources/${id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ active }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert('업데이트 실패: ' + (data.error || ''));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.row } : r)));
  }

  async function collectNow() {
    if (collecting) return;
    if (!confirm('활성 소스 전체에 대해 지금 수집을 실행할까요?\n네이버/구글/HN 모두 호출 + LLM 요약·번역. 30초~수분 걸릴 수 있어요.')) return;
    setCollecting(true);
    try {
      const res = await fetch('/api/admin/content-studio/collect', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('수집 실패: ' + (data.error || ''));
        return;
      }
      const s = data.stats || {};
      const msg = [
        `Job ${data.jobId?.slice(0, 8)} 완료`,
        `수집 ${s.collected || 0}건 · 중복 ${s.skipped || 0}건 · 실패 ${s.failed || 0}건`,
        `enrich ${s.enriched || 0}건 (실패 ${s.enrich_failed || 0}건)`,
        s.by_source ? '\n소스별: ' + JSON.stringify(s.by_source) : '',
      ].filter(Boolean).join('\n');
      alert(msg);
      load();
    } finally {
      setCollecting(false);
    }
  }

  async function remove(id) {
    if (!confirm('이 소스를 삭제하시겠어요?')) return;
    const res = await fetch(`/api/admin/content-studio/sources/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('삭제 실패: ' + (data.error || ''));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const currentType = SOURCE_TYPES.find((t) => t.value === sourceType);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">
          활성 소스에 대해 즉시 수집·요약·번역을 실행합니다.
        </div>
        <button
          onClick={collectNow}
          disabled={collecting}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
        >
          {collecting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {collecting ? '수집 중...' : '지금 수집'}
        </button>
      </div>

      <form onSubmit={add} className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm p-5 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">새 소스 추가</div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="md:col-span-2 px-3 py-2.5 bg-white border border-[var(--admin-border)] rounded-md text-sm cursor-pointer"
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={currentType?.placeholder}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="md:col-span-5 px-3 py-2.5 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            type="text"
            placeholder="표시명 (선택)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="md:col-span-3 px-3 py-2.5 bg-white border border-[var(--admin-border)] rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            disabled={submitting}
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            추가
          </button>
        </div>
        {currentType?.hint && (
          <p className="text-[11px] text-zinc-500">💡 {currentType.hint}</p>
        )}
      </form>

      <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center text-zinc-400">
            <Rss size={32} strokeWidth={1} className="mx-auto mb-3" />
            <p className="text-sm">등록된 소스가 없습니다.</p>
            <p className="text-xs mt-1 text-zinc-300">위 양식에서 첫 소스를 추가하세요.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['종류', '식별자', '표시명', '활성', '최근 수집', '액션'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((r) => {
                const typeLabel = SOURCE_TYPES.find((t) => t.value === r.source_type)?.label || r.source_type;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">{typeLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-zinc-800 font-mono">{r.identifier}</td>
                    <td className="px-4 py-3 text-[12px] text-zinc-600">{r.label || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(r.id, !r.active)}
                        className={'inline-flex items-center gap-1 text-[11px] font-bold ' + (r.active ? 'text-emerald-600' : 'text-zinc-400')}
                      >
                        {r.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {r.active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500">
                      {r.last_collected_at
                        ? new Date(r.last_collected_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => remove(r.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
