'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, ChevronDown, ChevronRight, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';

export default function ResearchPage() {
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState({});

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  const loadThemes = useCallback(async () => {
    setLoadingThemes(true);
    try {
      const res = await fetch('/api/admin/content-studio/themes', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '주제 조회 실패');
      setThemes(data.rows || []);
      if ((data.rows || []).length > 0 && !selectedThemeId) {
        setSelectedThemeId(data.rows[0].id);
      }
    } catch (e) {
      alert('주제 조회 실패: ' + e.message);
    } finally {
      setLoadingThemes(false);
    }
  }, [authHeaders, selectedThemeId]);

  const loadSnaps = useCallback(async (themeId) => {
    if (!themeId) return;
    setLoadingSnaps(true);
    try {
      const res = await fetch(`/api/admin/content-studio/themes/${themeId}/snapshots`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '스냅샷 조회 실패');
      setSnapshots(data.rows || []);
    } catch (e) {
      alert('스냅샷 조회 실패: ' + e.message);
    } finally {
      setLoadingSnaps(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadThemes(); }, [loadThemes]);
  useEffect(() => { if (selectedThemeId) loadSnaps(selectedThemeId); }, [selectedThemeId, loadSnaps]);

  async function runResearchNow() {
    if (!selectedThemeId) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/admin/content-studio/themes/${selectedThemeId}/run-research`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '리서치 실패');
      alert(`리서치 완료 — 결과 ${data.resultCount}건`);
      loadSnaps(selectedThemeId);
    } catch (e) {
      alert('리서치 실패: ' + e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">
        주제별 키워드로 SNS·뉴스를 검색해 현재 사장님들의 페인포인트와 바이럴 후킹 패턴을 정리합니다. 이 결과는 콘텐츠 생성 시 자동으로 참조됩니다.
      </p>

      <div className="bg-white border border-[var(--admin-border)] rounded-md p-4 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">주제 선택</span>
        {loadingThemes ? (
          <Loader2 size={14} className="animate-spin text-zinc-400" />
        ) : (
          <select
            value={selectedThemeId}
            onChange={(e) => setSelectedThemeId(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-md text-sm outline-none"
          >
            {themes.length === 0 && <option value="">먼저 &quot;주제&quot; 탭에서 주제를 만들어 주세요</option>}
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={runResearchNow}
          disabled={running || !selectedThemeId}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-md bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          지금 리서치 실행
        </button>
      </div>

      {loadingSnaps ? (
        <div className="flex items-center justify-center py-16 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : snapshots.length === 0 ? (
        <div className="bg-white border border-[var(--admin-border)] rounded-md py-16 text-center text-zinc-400 text-sm">
          이 주제는 아직 리서치 기록이 없습니다. &quot;지금 리서치 실행&quot;으로 시작해 보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snap) => (
            <SnapshotCard key={snap.id} snap={snap} expanded={expanded[snap.id]} onToggle={() => setExpanded((p) => ({ ...p, [snap.id]: !p[snap.id] }))} />
          ))}
        </div>
      )}
    </div>
  );
}

function SnapshotCard({ snap, expanded, onToggle }) {
  const insights = snap.insights || {};
  const pp = insights.pain_points || [];
  const hooks = insights.viral_hooks || [];
  const angles = insights.recommended_angles || [];
  const results = snap.results || [];

  return (
    <div className="bg-white border border-[var(--admin-border)] rounded-md shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-zinc-50 transition">
        {expanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-900 truncate">{snap.query}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            결과 {snap.result_count}건 · 페인포인트 {pp.length}개 · 후킹 {hooks.length}개 · 앵글 {angles.length}개
          </div>
        </div>
        <div className="text-[11px] text-zinc-400 shrink-0">
          {new Date(snap.snapshotted_at).toLocaleString('ko-KR')}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 border-t border-zinc-100 space-y-4">
          {pp.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} className="text-amber-500" /> 사장님 페인포인트
              </div>
              <ul className="space-y-1">
                {pp.map((p, i) => <li key={i} className="text-xs text-zinc-700">• {p}</li>)}
              </ul>
            </div>
          )}
          {hooks.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Sparkles size={11} className="text-violet-500" /> 자주 쓰이는 후킹 구조
              </div>
              <ul className="space-y-2">
                {hooks.map((h, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-bold text-zinc-900">{h.pattern}</span>
                    {h.example && <span className="text-zinc-500"> — &ldquo;{h.example}&rdquo;</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {angles.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">추천 앵글</div>
              <ul className="space-y-1">
                {angles.map((a, i) => <li key={i} className="text-xs text-zinc-700">→ {a}</li>)}
              </ul>
            </div>
          )}
          {results.length > 0 && (
            <details className="pt-2 border-t border-zinc-100">
              <summary className="text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-pointer hover:text-zinc-600">
                원본 검색 결과 {results.length}건 보기
              </summary>
              <ul className="space-y-1.5 mt-2">
                {results.slice(0, 20).map((r, i) => (
                  <li key={i} className="text-[11px]">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1">
                      <span className="text-zinc-400">[{r.source_domain || '?'}]</span>
                      <span className="font-bold truncate">{r.title || r.url}</span>
                      <ExternalLink size={9} />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
