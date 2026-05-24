'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Loader2, ArrowLeft, Copy, Save, Send, Trash2, ExternalLink, Plus, X, AlertTriangle,
  ChevronDown, ChevronRight, Sparkles, Shield, FileText, Search,
} from 'lucide-react';

const THREAD_POST_MAX_CHARS = 1000;
const THREAD_POST_WARNING_CHARS = 850;

export default function ThreadDraftEditorPage({ params }) {
  const { id } = use(params);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

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
      const res = await fetch(`/api/admin/content-studio/thread-drafts/${id}`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '조회 실패');
      setDraft(data.row);
      setPublishedUrl(data.row?.published_url || '');
    } catch (e) {
      alert('드래프트 조회 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => { load(); }, [load]);

  async function patchDraft(patch) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/content-studio/thread-drafts/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setDraft(data.row);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updatePost(idx, body) {
    if (!draft) return;
    const posts = [...(draft.posts || [])];
    posts[idx] = { ...posts[idx], body, char_count: body.length };
    setDraft({ ...draft, posts });
  }

  function addPost() {
    if (!draft) return;
    const posts = [...(draft.posts || [])];
    posts.push({ index: posts.length + 1, body: '', char_count: 0 });
    setDraft({ ...draft, posts });
  }

  function removePost(idx) {
    if (!draft) return;
    const posts = (draft.posts || []).filter((_, i) => i !== idx).map((p, i) => ({ ...p, index: i + 1 }));
    setDraft({ ...draft, posts });
  }

  async function saveAll() {
    if (!draft) return;
    await patchDraft({
      title: draft.title,
      posts: draft.posts,
      cta: draft.cta,
      hashtags: draft.hashtags,
      internal_notes: draft.internal_notes,
    });
  }

  async function markPublished() {
    if (!confirm('이 스레드를 발행 완료로 표시할까요? 발행 후에는 수정해도 어드민에만 반영됩니다.')) return;
    await patchDraft({ status: 'published', published_url: publishedUrl || null });
  }

  function copyAll() {
    if (!draft) return;
    const text = (draft.posts || []).map((p, i) => `[${i + 1}/${(draft.posts || []).length}]\n${p.body}`).join('\n\n---\n\n')
      + (draft.cta ? `\n\n${draft.cta}` : '')
      + (draft.hashtags?.length ? `\n\n${draft.hashtags.join(' ')}` : '');
    navigator.clipboard.writeText(text);
    alert('전체 스레드 복사 완료. Threads/X 앱에 붙여넣어 발행하세요.');
  }

  function copyPost(idx) {
    const body = (draft?.posts || [])[idx]?.body || '';
    navigator.clipboard.writeText(body);
    alert(`포스트 ${idx + 1} 복사됨`);
  }

  if (loading || !draft) {
    return <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 size={18} className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/content-studio/published" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
          <ArrowLeft size={14} /> 발행 목록으로
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">상태</span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            draft.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
            draft.status === 'approved' ? 'bg-blue-50 text-blue-700' :
            draft.status === 'rejected' ? 'bg-red-50 text-red-600' :
            'bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-200'
          }`}>{draft.status}</span>
        </div>
      </div>

      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <input
            value={draft.title || ''}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="내부 식별용 라벨"
            className="flex-1 bg-transparent text-base font-black text-[var(--admin-text-main)] outline-none border-b border-transparent focus:border-[var(--admin-border)] transition placeholder:text-[var(--admin-text-muted)]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--admin-text-muted)]">
          {draft.theme?.name && <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">📌 {draft.theme.name}</span>}
          <span className="bg-zinc-100 text-zinc-600 dark:bg-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded-full">{draft.format_type}</span>
          {draft.auto_generated && (
            <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 font-bold px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> 자동 생성
            </span>
          )}
          {draft.hook_pattern && <span className="text-zinc-400">hook: {draft.hook_pattern}</span>}
          {draft.tone_pattern && <span className="text-zinc-400">· tone: {draft.tone_pattern}</span>}
        </div>
        {draft.risk_flags?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
              <div className="font-bold mb-0.5">주의</div>
              <ul className="space-y-0.5">{draft.risk_flags.map((r, i) => <li key={i}>· {r}</li>)}</ul>
            </div>
          </div>
        )}
        {draft.agent_item?.post_url && (
          <a href={draft.agent_item.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]">
            원본 자료 보기 <ExternalLink size={11} />
          </a>
        )}
      </div>

      <DecisionMetaSection draft={draft} />

      <div className="space-y-3">
        {(draft.posts || []).map((p, i) => (
          <div key={i} className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-muted)]">포스트 {i + 1} / {draft.posts.length}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${(p.body || '').length > THREAD_POST_MAX_CHARS ? 'text-red-500 font-bold' : (p.body || '').length > THREAD_POST_WARNING_CHARS ? 'text-amber-600 font-bold' : 'text-[var(--admin-text-muted)]'}`}>
                  {(p.body || '').length} / {THREAD_POST_MAX_CHARS}
                </span>
                <button onClick={() => copyPost(i)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-main)]" title="이 포스트 복사">
                  <Copy size={12} />
                </button>
                <button onClick={() => removePost(i)} className="text-zinc-300 hover:text-red-500" title="삭제">
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              value={p.body || ''}
              onChange={(e) => updatePost(i, e.target.value)}
              rows={6}
              className="w-full bg-[var(--admin-bg)] text-sm leading-relaxed text-[var(--admin-text-main)] outline-none border border-transparent focus:border-[var(--admin-border)] rounded-md p-2 resize-none whitespace-pre-wrap placeholder:text-[var(--admin-text-muted)]"
            />
          </div>
        ))}
        <button onClick={addPost} className="w-full py-3 rounded-md border-2 border-dashed border-[var(--admin-border)] text-[var(--admin-text-muted)] text-xs font-bold hover:text-[var(--admin-text-main)] inline-flex items-center justify-center gap-2">
          <Plus size={14} /> 포스트 추가
        </button>
      </div>

      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">CTA (마지막 포스트 끝)</label>
          <input
            value={draft.cta || ''}
            onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
            placeholder="예: 매장 상황 봐드려요 → DM"
            className="mt-1 w-full bg-[var(--admin-bg)] text-[var(--admin-text-main)] px-3 py-2 border border-[var(--admin-border)] rounded-md text-sm outline-none placeholder:text-[var(--admin-text-muted)]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">해시태그 (스페이스로 구분)</label>
          <input
            value={(draft.hashtags || []).join(' ')}
            onChange={(e) => setDraft({ ...draft, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
            placeholder="#사장님마케팅 #플레이스"
            className="mt-1 w-full bg-[var(--admin-bg)] text-[var(--admin-text-main)] px-3 py-2 border border-[var(--admin-border)] rounded-md text-sm outline-none font-mono placeholder:text-[var(--admin-text-muted)]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">내부 메모</label>
          <textarea
            value={draft.internal_notes || ''}
            onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}
            rows={2}
            className="mt-1 w-full bg-[var(--admin-bg)] text-[var(--admin-text-main)] px-3 py-2 border border-[var(--admin-border)] rounded-md text-sm outline-none resize-none placeholder:text-[var(--admin-text-muted)]"
          />
        </div>
      </div>

      <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md p-5 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">발행</div>
        <p className="text-[11px] text-[var(--admin-text-muted)]">Threads/X 는 공개 발행 API 가 제한적이라 수동 복붙으로 발행하고 여기에 URL을 남기세요.</p>
        <input
          value={publishedUrl}
          onChange={(e) => setPublishedUrl(e.target.value)}
          placeholder="https://www.threads.com/@..."
          className="w-full bg-[var(--admin-bg)] text-[var(--admin-text-main)] px-3 py-2 border border-[var(--admin-border)] rounded-md text-sm outline-none font-mono placeholder:text-[var(--admin-text-muted)]"
        />
        <div className="flex items-center gap-2">
          <button onClick={copyAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--admin-border)] text-[var(--admin-text-main)] text-xs font-bold hover:bg-[var(--admin-bg)]">
            <Copy size={14} /> 전체 복사
          </button>
          <button onClick={markPublished} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            발행 완료 표시
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-[var(--admin-card-bg)]/80 backdrop-blur border border-[var(--admin-border)] rounded-full px-4 py-2 shadow-lg ml-auto w-fit">
        <button
          onClick={saveAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          저장
        </button>
      </div>
    </div>
  );
}

const LOGIC_LABELS = {
  content_pillar: {
    cost_before_spend: '광고비 쓰기 전에 먼저 봐야 할 것',
    do_today: '오늘 바로 해볼 수 있는 마케팅',
    current_observation: '요즘 되는 방식에 대한 관찰',
    trend_plain: '요즘 마케팅 흐름 쉽게 풀기',
    content_showcase: '우리 업체를 더 잘 보여주는 콘텐츠 만들기',
  },
  content_treatment: {
    news_commentary: '뉴스 코멘터리',
    practical_tip: '실행 팁',
    checklist: '체크리스트',
    explainer: '쉽게 풀기',
    case_note: '사례 메모',
    opinion: '관점/의견',
    fomo_reframe: 'FOMO 재구성',
  },
  fomo_mechanism: {
    quiet_gap: '조용한 격차',
    delayed_regret: '나중 후회',
    rule_changed: '룰 변경',
    insider_move: '잘하는 쪽의 움직임',
    cost_leak: '비용 누수',
    authority_signal: '권위 신호',
    missed_timing: '타이밍 상실',
    wrong_problem: '문제 오인',
    comparison_gap: '비교 격차',
    none: '미사용',
  },
  format_type: {
    single_post: '단일 포스트',
    short_thread: '짧은 스레드',
    resource_thread: '자료형 스레드',
  },
  explanation_style: {
    scene: '장면형',
    qa: '문답형(이전)',
    dialogue: '대화형',
    conversational_explainer: '대화형 설명',
    checklist: '체크리스트형',
    case_breakdown: '사례 분해형',
    resource_list: '자료 모음형',
    opinion_note: '관점 메모',
    comparison: '비교형',
  },
};

function logicLabel(type, value) {
  if (!value) return '미기록';
  return LOGIC_LABELS[type]?.[value] || value;
}

function LogicPill({ label, value, tone = 'zinc' }) {
  const toneClass = tone === 'violet'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-main)]';

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</div>
      <div className="text-xs font-bold mt-1">{value}</div>
    </div>
  );
}

// 의사결정 메타 펼침 — 자동 워크플로우가 채운 selection_reason / rejected_candidates /
// governance_applied / research_context_used 를 한 카드에서 펼치게.
// 사용자가 "왜 이거고 왜 다른 건 폐기됐는지" 5초 안에 판단할 수 있게.
function DecisionMetaSection({ draft }) {
  const [open, setOpen] = useState(true);
  const selectionReason = draft.selection_reason;
  const rejected = Array.isArray(draft.rejected_candidates) ? draft.rejected_candidates : [];
  const governance = draft.governance_applied || {};
  const research = draft.research_context_used || {};
  const generationDensity = research.generation_density_check || {};
  const generationDecision = research.generation_decision || {};
  const variantReview = research.variant_review || {};
  const variants = Array.isArray(variantReview.variants) ? variantReview.variants : [];
  const activeVariantId = variantReview.saved_variant_id || variantReview.recommended_variant_id || variantReview.selected_variant_id;
  const selectedVariant = variants.find((v) => v.variant_id === activeVariantId) || {};
  const manualExpansion = research.manual_cmts_qa_expansion || {};
  const logicSnapshot = {
    content_pillar: selectedVariant.content_pillar || generationDecision.content_pillar || manualExpansion.content_pillar,
    content_treatment: selectedVariant.content_treatment || generationDecision.content_treatment || manualExpansion.content_treatment,
    fomo_mechanism: selectedVariant.fomo_mechanism || generationDecision.fomo_mechanism || manualExpansion.fomo_mechanism || 'none',
    format_type: selectedVariant.format_type || generationDecision.format_type || manualExpansion.format_type || draft.format_type,
    explanation_style: selectedVariant.explanation_style || generationDecision.explanation_style || manualExpansion.explanation_style,
    recommended_length: selectedVariant.recommended_length || generationDecision.recommended_length || manualExpansion.recommended_length,
  };
  const formatDecision = selectedVariant.format_decision || generationDecision.format_decision || manualExpansion.format_decision || {};
  const hasFormatDecision = Boolean(formatDecision.post_count_reason || formatDecision.split_roles || formatDecision.why_not_shorter || formatDecision.why_not_longer);
  const hasLogicSnapshot = Object.values(logicSnapshot).some(Boolean) || hasFormatDecision;

  const hasAny = selectionReason || rejected.length > 0 || governance.applied_docs?.length > 0
    || research.phase1 || research.phase2_deep || generationDensity.source_signal || generationDecision.research_sufficiency
    || variants.length > 0 || hasLogicSnapshot;
  if (!hasAny) return null;

  const phase1 = research.phase1 || {};
  const phase2 = research.phase2_deep || {};

  return (
    <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center gap-2 text-left hover:bg-[var(--admin-bg)] transition border-b border-[var(--admin-border)]"
      >
        {open ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-main)]">의사결정 근거</span>
        <span className="text-[10px] text-[var(--admin-text-muted)] ml-auto">
          {selectionReason && '· 선정 사유'}
          {rejected.length > 0 && ` · 폐기 ${rejected.length}건`}
          {governance.applied_docs?.length > 0 && ` · 거버넌스 ${governance.applied_docs.length}건`}
          {(phase1.pain_points?.length || phase2.hook_patterns?.length) && ' · 리서치 반영'}
          {generationDecision.research_sufficiency && ` · 밀도 ${generationDecision.research_sufficiency}`}
        </span>
      </button>
      {open && (
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {selectionReason && (
            <div className="md:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 inline-flex items-center gap-1">
                <Sparkles size={11} className="text-violet-500" /> 왜 이 자료를 골랐는가
              </div>
              <p className="text-xs text-[var(--admin-text-main)] leading-relaxed">{selectionReason}</p>
            </div>
          )}

          {hasLogicSnapshot && (
            <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 inline-flex items-center gap-1">
                <Sparkles size={11} /> 글 로직 회로
              </div>
              <p className="text-[11px] text-[var(--admin-text-muted)] leading-relaxed mb-3">
                FOMO는 감정 압력, 설명 방식은 이해 방식, 단일/스레드/자료형은 분할 구조입니다. 서로 배타 선택이 아니라 같은 글 안에서 함께 켜질 수 있습니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <LogicPill label="기둥" value={logicLabel('content_pillar', logicSnapshot.content_pillar)} />
                <LogicPill label="처리 방식" value={logicLabel('content_treatment', logicSnapshot.content_treatment)} tone="violet" />
                <LogicPill label="FOMO 장치" value={logicLabel('fomo_mechanism', logicSnapshot.fomo_mechanism)} tone={logicSnapshot.fomo_mechanism && logicSnapshot.fomo_mechanism !== 'none' ? 'amber' : 'zinc'} />
                <LogicPill label="글 구조" value={logicLabel('format_type', logicSnapshot.format_type)} />
                <LogicPill label="설명 방식" value={logicLabel('explanation_style', logicSnapshot.explanation_style)} tone={['dialogue', 'conversational_explainer'].includes(logicSnapshot.explanation_style) ? 'emerald' : 'zinc'} />
                <LogicPill label="권장 포스트 수" value={logicSnapshot.recommended_length ? `${logicSnapshot.recommended_length}개` : '미기록'} />
              </div>
              {hasFormatDecision && (
                <div className="mt-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">분량/분할 판단</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                    {formatDecision.post_count_reason && (
                      <div><span className="font-bold text-[var(--admin-text-main)]">포스트 수:</span> <span className="text-[var(--admin-text-muted)]">{formatDecision.post_count_reason}</span></div>
                    )}
                    {formatDecision.split_roles && (
                      <div><span className="font-bold text-[var(--admin-text-main)]">각 글 역할:</span> <span className="text-[var(--admin-text-muted)]">{formatDecision.split_roles}</span></div>
                    )}
                    {formatDecision.why_not_shorter && (
                      <div><span className="font-bold text-[var(--admin-text-main)]">짧게 안 쓴 이유:</span> <span className="text-[var(--admin-text-muted)]">{formatDecision.why_not_shorter}</span></div>
                    )}
                    {formatDecision.why_not_longer && (
                      <div><span className="font-bold text-[var(--admin-text-main)]">더 늘리지 않은 이유:</span> <span className="text-[var(--admin-text-muted)]">{formatDecision.why_not_longer}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {variants.length > 0 && (
            <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 inline-flex items-center gap-1">
                <Sparkles size={11} /> 7개 후보 자동 심사
              </div>
              {(variantReview.recommendation_reason || variantReview.selection_reason) && (
                <p className="text-xs text-[var(--admin-text-main)] leading-relaxed mb-3">
                  {variantReview.recommendation_reason || variantReview.selection_reason}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {variants.map((v) => {
                  const isCurrentDraft = v.variant_id === variantReview.saved_variant_id;
                  const recommended = v.variant_id === (variantReview.recommended_variant_id || variantReview.selected_variant_id);
                  return (
                    <div
                      key={v.variant_id}
                      className={`rounded-md border p-3 ${isCurrentDraft ? 'border-emerald-300 bg-emerald-50/60' : recommended ? 'border-violet-300 bg-violet-50/60' : 'border-[var(--admin-border)] bg-[var(--admin-bg)]'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black ${isCurrentDraft ? 'text-emerald-700' : recommended ? 'text-violet-700' : 'text-zinc-400'}`}>
                          후보 {v.variant_id}{isCurrentDraft ? ' · 현재 드래프트' : recommended ? ' · 추천' : ''}
                        </span>
                        {typeof v.scores?.overall === 'number' && (
                          <span className="ml-auto text-[10px] font-bold text-[var(--admin-text-main)]">
                            {v.scores.overall}/5
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[var(--admin-text-main)] truncate">
                        {v.title || v.angle || '(제목 없음)'}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {[v.content_pillar, v.content_treatment, v.fomo_mechanism, v.explanation_style, v.format_type].filter(Boolean).join(' · ')}
                      </div>
                      {v.score_reason && (
                        <div className="text-[11px] text-[var(--admin-text-muted)] mt-1.5 line-clamp-2">
                          {v.score_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {governance.applied_docs?.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 inline-flex items-center gap-1">
                <Shield size={11} className="text-emerald-500" /> 적용된 거버넌스·KB
              </div>
              <div className="space-y-1">
                {governance.topic_cluster && (
                  <div className="text-[11px] text-[var(--admin-text-muted)]">토픽 클러스터: <span className="text-[var(--admin-text-main)] font-bold">{governance.topic_cluster}</span></div>
                )}
                {governance.persona && (
                  <div className="text-[11px] text-[var(--admin-text-muted)]">페르소나: <span className="text-[var(--admin-text-main)] font-bold">{governance.persona}</span></div>
                )}
                <ul className="space-y-0.5 mt-1.5">
                  {governance.applied_docs.map((d, i) => (
                    <li key={i} className="text-[11px] text-[var(--admin-text-main)] font-mono">📄 {d}</li>
                  ))}
                </ul>
                {governance.risk_flags?.length > 0 && (
                  <div className="mt-2 text-[11px]">
                    <span className="text-amber-700 font-bold">리스크 표시:</span>{' '}
                    <span className="text-[var(--admin-text-main)]">{governance.risk_flags.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 inline-flex items-center gap-1">
                <X size={11} className="text-red-500" /> 같은 사이클에서 폐기된 후보
              </div>
              <ul className="space-y-2">
                {rejected.slice(0, 5).map((r, i) => (
                  <li key={i} className="text-[11px] text-[var(--admin-text-main)] border-l-2 border-[var(--admin-border)] pl-2">
                    <div className="font-bold text-[var(--admin-text-main)] truncate">{r.title || r.theme || '(제목 없음)'}</div>
                    <div className="text-zinc-400 mt-0.5">
                      {r.theme && <span>주제: {r.theme}</span>}
                      {typeof r.fit_score === 'number' && <span> · 적합도 {Math.round(r.fit_score * 100)}%</span>}
                    </div>
                    {r.reason && <div className="text-zinc-500 mt-0.5">{r.reason}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(generationDensity.source_signal || generationDecision.research_sufficiency) && (
            <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 inline-flex items-center gap-1">
                <Sparkles size={11} /> 생성 밀도 체크
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {generationDecision.research_sufficiency && (
                  <div className="text-[var(--admin-text-muted)]">
                    보강 판정:{' '}
                    <span className="font-bold text-[var(--admin-text-main)]">{generationDecision.research_sufficiency}</span>
                    {typeof generationDecision.grounded_example_count === 'number' && (
                      <span className="text-zinc-400"> · 근거 연결 예시 {generationDecision.grounded_example_count}개</span>
                    )}
                  </div>
                )}
                {generationDecision.content_goal && (
                  <div className="text-[var(--admin-text-muted)]">
                    목표/마무리:{' '}
                    <span className="font-bold text-[var(--admin-text-main)]">{generationDecision.content_goal}</span>
                    {generationDecision.ending_type && <span className="text-zinc-400"> · {generationDecision.ending_type}</span>}
                  </div>
                )}
                {generationDensity.source_signal && (
                  <div className="md:col-span-2 text-[var(--admin-text-muted)]">
                    수집 신호: <span className="text-[var(--admin-text-main)]">{generationDensity.source_signal}</span>
                  </div>
                )}
                {generationDensity.giveneeds_angle && (
                  <div className="md:col-span-2 text-[var(--admin-text-muted)]">
                    기브니즈 관점: <span className="text-[var(--admin-text-main)]">{generationDensity.giveneeds_angle}</span>
                  </div>
                )}
              </div>
              {generationDensity.practical_examples?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">실행 예시 근거</div>
                  <ul className="space-y-1">
                    {generationDensity.practical_examples.slice(0, 5).map((ex, i) => (
                      <li key={i} className="text-xs text-[var(--admin-text-main)]">
                        <span className="font-bold">{ex.action}</span>
                        {ex.evidence && <span className="text-zinc-500"> — 근거: {ex.evidence}</span>}
                        {ex.confidence && <span className="text-zinc-400"> ({ex.confidence})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generationDensity.missing_info?.length > 0 && (
                <div className="mt-3 text-[11px]">
                  <span className="text-amber-700 font-bold">부족한 정보:</span>{' '}
                  <span className="text-[var(--admin-text-main)]">{generationDensity.missing_info.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {(phase1.pain_points?.length > 0 || phase1.viral_hooks?.length > 0) && (
            <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 inline-flex items-center gap-1">
                <Search size={11} /> 1차 리서치 (주제 시장 페인포인트)
              </div>
              {phase1.pain_points?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">페인포인트</div>
                  <ul className="space-y-0.5">
                    {phase1.pain_points.slice(0, 4).map((p, i) => (
                      <li key={i} className="text-xs text-[var(--admin-text-main)]">⚠️ {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {phase1.viral_hooks?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">자주 쓰이는 후킹</div>
                  <ul className="space-y-0.5">
                    {phase1.viral_hooks.slice(0, 3).map((h, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-bold text-[var(--admin-text-main)]">{h.pattern}</span>
                        {h.example && <span className="text-zinc-500"> — &ldquo;{h.example}&rdquo;</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {(phase2.hook_patterns?.length > 0 || phase2.audience_reactions?.length > 0 || phase2.adapted_angles?.length > 0) && (
            <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 inline-flex items-center gap-1">
                <FileText size={11} /> 2차 깊이 리서치 (SNS 후킹 반응)
              </div>
              {phase2.hook_patterns?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">후킹 패턴</div>
                  <ul className="space-y-0.5">
                    {phase2.hook_patterns.map((h, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-bold text-[var(--admin-text-main)]">{h.pattern}</span>
                        {h.example && <span className="text-zinc-500"> — &ldquo;{h.example}&rdquo;</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {phase2.audience_reactions?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">독자 반응 패턴</div>
                  <ul className="space-y-0.5">
                    {phase2.audience_reactions.map((r, i) => (
                      <li key={i} className="text-xs text-[var(--admin-text-main)]">→ {r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {phase2.adapted_angles?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 mb-1">조정된 앵글</div>
                  <ul className="space-y-0.5">
                    {phase2.adapted_angles.map((a, i) => (
                      <li key={i} className="text-xs text-[var(--admin-text-main)]">📐 {a}</li>
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
