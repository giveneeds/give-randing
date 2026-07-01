'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MessageSquare, Eye, MousePointer2, CheckCircle2,
  BookOpen, Rocket, Phone, Mail, Building2, Globe, Calendar,
  Tag, StickyNote, PhoneCall, Users, Send, Clock, ChevronRight,
  AlertCircle, Loader2, Monitor, Smartphone, Tablet, ExternalLink, Compass,
} from 'lucide-react';
import { prettyReferrer } from '@/lib/leadInflow';
import { getServicePath } from '@/lib/serviceRoutes';

const PIPELINE_CONFIG = {
  new:       { label: '신규',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  contacted: { label: '컨택',  color: 'bg-sky-50 text-sky-700 border-sky-200' },
  qualified: { label: '적격',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
  proposal:  { label: '제안',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
  won:       { label: '계약',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lost:      { label: '이탈',  color: 'bg-red-50 text-red-600 border-red-200' },
};

const LEAD_TYPE_CONFIG = {
  // 일반 문의 (메인 사이트 /contact)
  consultation:           { label: '메인 문의', color: 'bg-violet-50 text-violet-600' },
  contact_form:           { label: '메인 문의', color: 'bg-violet-50 text-violet-600' },
  // 캠페인 LP
  campaign:               { label: '캠페인 LP', color: 'bg-blue-50 text-blue-600' },
  campaign_basic_form:    { label: '캠페인 · 기본폼', color: 'bg-blue-50 text-blue-600' },
  campaign_kakao_oauth:   { label: '캠페인 · 카카오', color: 'bg-yellow-50 text-yellow-700' },
  service_basic_form:     { label: '서비스 문의', color: 'bg-indigo-50 text-indigo-600' },
  // 매거진
  magazine:               { label: '매거진', color: 'bg-emerald-50 text-emerald-600' },
  magazine_kakao_oauth:   { label: '매거진 · 카카오', color: 'bg-emerald-50 text-emerald-700' },
  // 기타
  organic:                { label: '기타 유입', color: 'bg-zinc-50 text-zinc-500' },
};

const CHANNEL_LABELS = {
  direct: 'Direct', organic: 'Organic', paid_search: 'Paid Search',
  paid_social: 'Paid Social', email: 'Email', referral: 'Referral',
  kakao: 'Kakao', organic_social: 'Social', other: 'Other',
};

const EVENT_ICONS = {
  page_view:    { icon: Eye, label: '페이지 뷰', color: 'bg-zinc-100 text-zinc-500' },
  cta_click:    { icon: MousePointer2, label: 'CTA 클릭', color: 'bg-blue-50 text-blue-600' },
  form_submit:  { icon: CheckCircle2, label: '폼 제출', color: 'bg-emerald-50 text-emerald-600' },
  magazine_view:{ icon: BookOpen, label: '매거진 조회', color: 'bg-violet-50 text-violet-600' },
  service_view: { icon: Rocket, label: '서비스 조회', color: 'bg-amber-50 text-amber-600' },
};

const NOTE_TYPE_CONFIG = {
  note:    { icon: StickyNote, label: '메모', color: 'text-zinc-500' },
  call:    { icon: PhoneCall,  label: '통화', color: 'text-sky-600' },
  meeting: { icon: Users,      label: '미팅', color: 'text-violet-600' },
  email:   { icon: Send,       label: '이메일', color: 'text-emerald-600' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function DeviceIcon({ type, size = 13 }) {
  if (type === 'mobile') return <Smartphone size={size} />;
  if (type === 'tablet') return <Tablet size={size} />;
  return <Monitor size={size} />;
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pipeline edit state
  const [pipelineStage, setPipelineStage] = useState('new');
  const [pipelineSaving, setPipelineSaving] = useState(false);

  // Note form state
  const [noteType, setNoteType] = useState('note');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadRes, eventsRes, notesRes] = await Promise.all([
        fetch(`/api/leads/${id}`),
        fetch(`/api/events?lead_id=${id}`),
        fetch(`/api/leads/${id}/notes`),
      ]);

      const leadData = await leadRes.json();
      const eventsData = await eventsRes.json();
      const notesData = await notesRes.json();

      if (!leadRes.ok) throw new Error(leadData.error || '리드를 불러올 수 없습니다.');

      setLead(leadData.lead);
      setPipelineStage(leadData.lead?.pipeline_stage || 'new');
      setEvents(eventsData.events || []);
      setNotes(notesData.notes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [id, loadData]);

  async function handlePipelineChange(stage) {
    setPipelineStage(stage);
    setPipelineSaving(true);
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: stage }),
      });
    } catch (e) {
      console.error('Pipeline update failed:', e);
    } finally {
      setPipelineSaving(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_type: noteType, content: noteContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => [data.note, ...prev]);
      setNoteContent('');
    } catch (e) {
      alert(e.message || '노트 저장 실패');
    } finally {
      setNoteSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-zinc-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-8 text-red-500 text-sm">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const pipeline = PIPELINE_CONFIG[pipelineStage] || PIPELINE_CONFIG.new;
  const leadType = LEAD_TYPE_CONFIG[lead?.lead_type] || LEAD_TYPE_CONFIG.organic;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Link href="/admin/leads" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
            <ArrowLeft size={13} /> 리드 목록
          </Link>
          <ChevronRight size={12} />
          <span className="text-zinc-900">{lead?.name || '(이름 없음)'}</span>
        </div>
        <Link
          href={`/admin/leads/${id}/chat`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
        >
          <MessageSquare size={12} /> 챗봇 대화 보기
        </Link>
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* LEFT — Event Timeline */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">방문 여정 타임라인</h2>
            <span className="text-[11px] text-zinc-400 font-bold">{events.length}개 이벤트</span>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Clock size={32} strokeWidth={1.5} className="mb-3" />
              <p className="text-sm">아직 수집된 이벤트가 없습니다.</p>
              <p className="text-xs mt-1 text-zinc-300">폼 제출 후 이벤트가 연결되면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {events.map((ev, i) => {
                const cfg = EVENT_ICONS[ev.event_type] || { icon: Eye, label: ev.event_type, color: 'bg-zinc-100 text-zinc-500' };
                const Icon = cfg.icon;
                const evData = ev.event_data || {};
                const subtitle = evData.title || evData.label || evData.cta_id || null;
                const urlShort = ev.page_url?.replace(/^https?:\/\/[^/]+/, '') || '';
                const refInfo = prettyReferrer(evData.referrer);

                return (
                  <div key={ev.id || i} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {subtitle && (
                          <span className="text-xs text-zinc-500 font-medium truncate">{subtitle}</span>
                        )}
                      </div>
                      {urlShort && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate">{urlShort}</p>
                      )}
                      {refInfo && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          ← <span className="font-medium">{refInfo.label}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] text-zinc-400 font-bold whitespace-nowrap flex-shrink-0"
                      title={fmtDateTime(ev.created_at)}
                    >
                      {timeAgo(ev.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — CRM Panel */}
        <div className="space-y-4">

          {/* Lead Info Card */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                {(lead?.name || '?')[0]}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-zinc-900 tracking-tight truncate">{lead?.name || '(이름 없음)'}</h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${leadType.color}`}>
                    {leadType.label}
                  </span>
                  {lead?.channel_group && (
                    <span className="text-[10px] text-zinc-400 font-bold">
                      {CHANNEL_LABELS[lead.channel_group] || lead.channel_group}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-600">
              {lead?.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead?.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-zinc-400 flex-shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead?.company_name && (
                <div className="flex items-center gap-2">
                  <Building2 size={12} className="text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{lead.company_name}</span>
                </div>
              )}
              {lead?.website_url && (
                <div className="flex items-center gap-2">
                  <Globe size={12} className="text-zinc-400 flex-shrink-0" />
                  <span className="truncate text-blue-600">{lead.website_url}</span>
                </div>
              )}
              {lead?.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-zinc-400 flex-shrink-0" />
                  <span>{new Date(lead.created_at).toLocaleString('ko-KR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* 출처 — 어느 폼에서 왔는지 한눈에 */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3">
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
              <Compass size={12} /> 출처
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${leadType.color}`}>
                {leadType.label}
              </span>
              {lead?.lead_type && lead.lead_type !== leadType.label && (
                <span className="text-[10px] font-mono text-zinc-400">{lead.lead_type}</span>
              )}
            </div>

            {/* 캠페인 LP 에서 온 경우 */}
            {lead?.campaign?.title && (
              <InflowRow label="캠페인">
                <a
                  href={`/landing/${lead.campaign.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate"
                  title={lead.campaign.title}
                >
                  <span className="truncate font-bold">{lead.campaign.title}</span>
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
              </InflowRow>
            )}

            {/* 매거진에서 온 경우 */}
            {lead?.magazine?.title && (
              <InflowRow label="매거진">
                <a
                  href={`/magazine/${lead.magazine.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline truncate"
                  title={lead.magazine.title}
                >
                  <span className="truncate font-bold">{lead.magazine.title}</span>
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
              </InflowRow>
            )}

            {/* 서비스 상품에서 온 경우 */}
            {(lead?.service?.title || lead?.service_slug) && (
              <InflowRow label="서비스">
                <a
                  href={getServicePath(lead.service?.slug || lead.service_slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline truncate"
                  title={lead.service?.title || lead.service_slug}
                >
                  <span className="truncate font-bold">{lead.service?.title || lead.service_slug}</span>
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
                <div className="mt-1 font-mono text-[10px] text-zinc-400">
                  {getServicePath(lead.service?.slug || lead.service_slug)}
                </div>
              </InflowRow>
            )}

            {/* 제출 페이지 — 캠페인/매거진 어디에도 안 잡히면 fallback */}
            {!lead?.campaign?.title && !lead?.magazine?.title && !lead?.service?.title && !lead?.service_slug && lead?.source_page && (
              <InflowRow label="제출 페이지">
                <span className="font-mono text-[11px] text-zinc-700 truncate" title={lead.source_page}>
                  {lead.source_page}
                </span>
              </InflowRow>
            )}

            {lead?.inquiry_type && lead.inquiry_type !== 'general' && (
              <InflowRow label="문의 유형">{lead.inquiry_type}</InflowRow>
            )}

            {lead?.budget && (
              <InflowRow label="예산">{lead.budget}</InflowRow>
            )}

            {lead?.category && (
              <InflowRow label="카테고리">{lead.category}</InflowRow>
            )}
          </div>

          {/* 문의 내용 (상세 메시지 + 사용자 정의 동적 필드) */}
          {(lead?.message || (lead?.lead_data && Object.keys(lead.lead_data).length > 0)) && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3">
              <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare size={12} /> 문의 내용
              </h3>

              {lead?.message && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">상세 메시지</p>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap break-words bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    {lead.message}
                  </p>
                </div>
              )}

              {lead?.lead_data && typeof lead.lead_data === 'object' && Object.keys(lead.lead_data).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">추가 입력 필드</p>
                  <dl className="grid grid-cols-1 gap-1.5 text-xs">
                    {Object.entries(lead.lead_data).map(([k, v]) => (
                      <div key={k} className="flex gap-3 py-1.5 border-b border-zinc-100 last:border-0">
                        <dt className="font-bold text-zinc-500 min-w-[110px] truncate">{k}</dt>
                        <dd className="flex-1 text-zinc-800 break-words whitespace-pre-wrap">
                          {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}

          {/* 유입 정보 (J1) */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
                <Compass size={12} /> 유입 정보
              </h3>
              {lead?.channel_group && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {CHANNEL_LABELS[lead.channel_group] || lead.channel_group}
                </span>
              )}
            </div>

            <InflowRow label="첫 유입">
              {(() => {
                const r = prettyReferrer(lead?.source_referrer);
                if (!r) return <span className="text-zinc-400">직접 입력 / 알 수 없음</span>;
                return (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate"
                    title={r.url}
                  >
                    <span className="truncate">{r.label}</span>
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </a>
                );
              })()}
            </InflowRow>

            <InflowRow label="첫 페이지">
              <span className="font-mono text-[11px] text-zinc-700 truncate">
                {lead?.first_visit_url || lead?.source_page || '—'}
              </span>
            </InflowRow>

            <InflowRow label="UTM Source">{lead?.utm_source || '—'}</InflowRow>
            <InflowRow label="UTM Medium">{lead?.utm_medium || '—'}</InflowRow>
            {lead?.utm_campaign && (
              <InflowRow label="UTM Campaign">{lead.utm_campaign}</InflowRow>
            )}

            <InflowRow label="환경">
              <span className="inline-flex items-center gap-1.5 text-zinc-700">
                <DeviceIcon type={lead?.device_type} size={12} />
                <span className="capitalize">{lead?.device_type || '—'}</span>
                {lead?.browser && (
                  <span className="text-zinc-400">· {lead.browser}</span>
                )}
              </span>
            </InflowRow>

            {lead?.click_element && (
              <InflowRow label="제출 위치">
                <span className="font-mono text-[11px] text-zinc-700">{lead.click_element}</span>
              </InflowRow>
            )}
          </div>

          {/* Pipeline Stage */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">파이프라인</h3>
              {pipelineSaving && <Loader2 size={12} className="animate-spin text-zinc-400" />}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PIPELINE_CONFIG).map(([stage, cfg]) => (
                <button
                  key={stage}
                  onClick={() => handlePipelineChange(stage)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                    pipelineStage === stage
                      ? cfg.color + ' shadow-sm scale-105'
                      : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Panel */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-widest mb-3">활동 노트</h3>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 mb-4">
              <div className="flex gap-1.5">
                {Object.entries(NOTE_TYPE_CONFIG).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNoteType(type)}
                      title={cfg.label}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        noteType === type
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'text-zinc-500 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <Icon size={11} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="활동 내용을 기록하세요..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300 text-zinc-800"
              />
              <button
                type="submit"
                disabled={!noteContent.trim() || noteSaving}
                className="w-full py-2 bg-zinc-900 text-white rounded-lg text-xs font-black hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {noteSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                {noteSaving ? '저장 중...' : '노트 저장'}
              </button>
            </form>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-[11px] text-zinc-400 text-center py-4">저장된 노트가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const cfg = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.note;
                  const Icon = cfg.icon;
                  return (
                    <div key={note.id} className="flex gap-2.5 group">
                      <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {cfg.label} · {timeAgo(note.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InflowRow({ label, children }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] w-20 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0 text-zinc-700">{children}</div>
    </div>
  );
}
