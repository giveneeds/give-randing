'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MessageSquare, Eye, MousePointer2, CheckCircle2,
  BookOpen, Rocket, Phone, Mail, Building2, Globe, Calendar,
  Tag, StickyNote, PhoneCall, Users, Send, Clock, ChevronRight,
  AlertCircle, Loader2
} from 'lucide-react';

const PIPELINE_CONFIG = {
  new:       { label: '신규',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  contacted: { label: '컨택',  color: 'bg-sky-50 text-sky-700 border-sky-200' },
  qualified: { label: '적격',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
  proposal:  { label: '제안',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
  won:       { label: '계약',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lost:      { label: '이탈',  color: 'bg-red-50 text-red-600 border-red-200' },
};

const LEAD_TYPE_CONFIG = {
  consultation: { label: '문의하기', color: 'bg-violet-50 text-violet-600' },
  campaign:     { label: '캠페인 LP', color: 'bg-blue-50 text-blue-600' },
  magazine:     { label: '매거진', color: 'bg-emerald-50 text-emerald-600' },
  organic:      { label: '기타 유입', color: 'bg-zinc-50 text-zinc-500' },
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
    if (id) loadData();
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
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold whitespace-nowrap flex-shrink-0">
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
              {lead?.utm_source && (
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-zinc-400 flex-shrink-0" />
                  <span className="text-zinc-400">UTM:</span>
                  <span className="font-mono text-[11px]">{lead.utm_source}{lead.utm_medium ? ` / ${lead.utm_medium}` : ''}</span>
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
