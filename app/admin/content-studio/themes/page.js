'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Search as SearchIcon, Trash2, Edit3, CheckCircle2, X, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

const PERSONA_LABEL = {
  restaurant_owner: '요식업',
  clinic_owner: '병의원',
  general: '일반',
};

export default function ThemesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode:'create'|'edit', data:{} }
  const [busy, setBusy] = useState({});

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
      const res = await fetch('/api/admin/content-studio/themes', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setRows(data.rows || []);
    } catch (e) {
      alert('주제 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function runResearch(id) {
    setBusy((b) => ({ ...b, [id]: 'research' }));
    try {
      const res = await fetch(`/api/admin/content-studio/themes/${id}/run-research`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '리서치 실패');
      alert(`리서치 완료 — 결과 ${data.resultCount}건 / 페인포인트 ${data.insights?.pain_points?.length || 0}개`);
      load();
    } catch (e) {
      alert('리서치 실패: ' + e.message);
    } finally {
      setBusy((b) => { const { [id]: _, ...rest } = b; return rest; });
    }
  }

  async function deleteTheme(id) {
    if (!confirm('이 주제를 삭제할까요? 연결된 리서치 기록도 함께 삭제됩니다.')) return;
    setBusy((b) => ({ ...b, [id]: 'delete' }));
    try {
      const res = await fetch(`/api/admin/content-studio/themes/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      load();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    } finally {
      setBusy((b) => { const { [id]: _, ...rest } = b; return rest; });
    }
  }

  async function saveTheme(payload, id) {
    const res = await fetch(
      id ? `/api/admin/content-studio/themes/${id}` : '/api/admin/content-studio/themes',
      {
        method: id ? 'PATCH' : 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '저장 실패');
    setModal(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          여기서 정한 주제가 자료 수집·리서치·콘텐츠 생성의 방향이 됩니다. 주제별로 키워드를 묶어 SNS·뉴스를 자동 조사합니다.
        </p>
        <button
          onClick={() => setModal({ mode: 'create', data: { research_keywords: [], target_persona: 'general', cadence_days: 7, active: true } })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
        >
          <Plus size={14} /> 주제 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[var(--admin-border)] rounded-md py-24 text-center text-zinc-400">
          아직 주제가 없습니다. 위의 &quot;주제 추가&quot;로 시작해 보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((t) => (
            <div key={t.id} className="bg-white border border-[var(--admin-border)] rounded-md p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm text-zinc-900 truncate">{t.name}</h3>
                  {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={clsx(
                    'inline-block text-[10px] font-bold px-2 py-1 rounded-full border',
                    t.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  )}>{t.active ? '활성' : '비활성'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="inline-block bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">
                  {PERSONA_LABEL[t.target_persona] || t.target_persona}
                </span>
                {t.target_topic_cluster && (
                  <span className="inline-block bg-zinc-100 text-zinc-600 border border-zinc-200 font-bold px-2 py-0.5 rounded-full">
                    #{t.target_topic_cluster}
                  </span>
                )}
                <span className="inline-block text-zinc-500 px-1">키워드 {t.research_keywords?.length || 0}개</span>
                {t.pending_items > 0 && (
                  <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                    검토함 {t.pending_items}건
                  </span>
                )}
              </div>

              <div className="text-[11px] text-zinc-400">
                {t.latest_snapshot_at
                  ? <>최근 리서치: {new Date(t.latest_snapshot_at).toLocaleString('ko-KR')} · 결과 {t.latest_snapshot_results}건</>
                  : '아직 리서치 안 됨'}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => runResearch(t.id)}
                  disabled={busy[t.id] === 'research'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-50 disabled:opacity-40"
                >
                  {busy[t.id] === 'research' ? <Loader2 size={12} className="animate-spin" /> : <SearchIcon size={12} />}
                  리서치 실행
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', data: t })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
                >
                  <Edit3 size={12} /> 수정
                </button>
                <button
                  onClick={() => deleteTheme(t.id)}
                  disabled={busy[t.id] === 'delete'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-40 ml-auto"
                >
                  <Trash2 size={12} /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ThemeModal
          mode={modal.mode}
          initial={modal.data}
          onSave={saveTheme}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ThemeModal({ mode, initial, onSave, onClose }) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [persona, setPersona] = useState(initial.target_persona || 'general');
  const [topicCluster, setTopicCluster] = useState(initial.target_topic_cluster || '');
  const [keywordsText, setKeywordsText] = useState((initial.research_keywords || []).join('\n'));
  const [cadence, setCadence] = useState(initial.cadence_days || 7);
  const [active, setActive] = useState(initial.active !== false);
  const [saving, setSaving] = useState(false);

  // 활성 수집 소스 + 이 주제에 묶인 소스 id 집합.
  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [selectedSourceIds, setSelectedSourceIds] = useState(
    new Set(Array.isArray(initial.collection_source_ids) ? initial.collection_source_ids : [])
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const res = await fetch('/api/admin/content-studio/sources?active=true', { headers });
        const data = await res.json();
        if (res.ok) setSources(data.rows || []);
      } catch {
        // 소스 로드 실패는 무시 — 키워드만으로도 동작.
      } finally {
        setSourcesLoading(false);
      }
    })();
  }, []);

  function toggleSource(id) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        target_persona: persona,
        target_topic_cluster: topicCluster.trim() || null,
        research_keywords: keywordsText.split('\n').map((s) => s.trim()).filter(Boolean),
        collection_source_ids: [...selectedSourceIds],
        cadence_days: parseInt(cadence, 10) || 7,
        active,
      };
      await onSave(payload, mode === 'edit' ? initial.id : null);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-widest text-zinc-900">
            {mode === 'edit' ? '주제 수정' : '주제 추가'}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">이름</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none"
              placeholder="예: 플레이스 마케팅 핵심"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none resize-none"
              placeholder="이 주제로 어떤 글을 만들지 한 줄로"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">타겟</label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none"
              >
                <option value="general">일반 (둘 다)</option>
                <option value="restaurant_owner">요식업</option>
                <option value="clinic_owner">병의원</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">주기 (일)</label>
              <input
                type="number"
                min={1}
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">토픽 클러스터 (선택)</label>
            <input
              value={topicCluster}
              onChange={(e) => setTopicCluster(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none"
              placeholder="예: place_visibility / review_trust"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">리서치 키워드 (한 줄 한 개)</label>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={5}
              className="mt-1 w-full px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none font-mono"
              placeholder={'예:\n네이버 플레이스 노출\n플레이스 알고리즘\n지도 검색 상위'}
            />
            <p className="text-[10px] text-zinc-400 mt-1">상위 3개까지 SNS·뉴스 리서치에 사용됩니다.</p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">자료 수집 소스 (선택)</label>
            <p className="text-[10px] text-zinc-400 mt-0.5 mb-2">
              이 주제로 묶을 키워드 소스. 선택한 소스에서 모인 자료에 이 주제의 리서치 컨텍스트가 자동 주입됩니다.
            </p>
            {sourcesLoading ? (
              <div className="text-xs text-zinc-400 py-2">불러오는 중…</div>
            ) : sources.length === 0 ? (
              <div className="text-xs text-zinc-400 py-2 border border-dashed border-zinc-200 rounded-md px-3">
                등록된 소스가 없습니다.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-zinc-200 rounded-md p-2 space-y-1">
                {sources.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.has(s.id)}
                      onChange={() => toggleSource(s.id)}
                    />
                    <span className="text-zinc-500 font-mono text-[10px] uppercase">{s.source_type}</span>
                    <span className="text-zinc-700 truncate">{s.label || s.identifier}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-400 mt-1">{selectedSourceIds.size}개 선택됨</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>활성 (비활성으로 두면 자동 수집/리서치 대상에서 제외)</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
