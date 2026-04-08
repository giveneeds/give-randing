'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, RefreshCw, MessageSquare, Sparkles, User, Bot } from 'lucide-react';

export default function AdminLeadChatPage() {
  const { id: leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: leadRow, error: lErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();
      if (lErr) throw lErr;
      setLead(leadRow);

      let { data: sess, error: sErr } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('lead_id', leadId)
        .order('started_at', { ascending: false });
      if (sErr) throw sErr;

      if ((!sess || sess.length === 0) && leadRow?.user_id) {
        const { data: sess2 } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', leadRow.user_id)
          .order('started_at', { ascending: false });
        sess = sess2 || [];
      }

      setSessions(sess || []);
      setActiveSessionId(sess?.[0]?.id || null);
    } catch (e) {
      console.error(e);
      setError(e.message || '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) loadAll();
  }, [leadId, loadAll]);

  useEffect(() => {
    async function loadMessages() {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      const { data, error: mErr } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_uuid', activeSessionId)
        .order('created_at', { ascending: true });
      if (mErr) {
        console.error(mErr);
        return;
      }
      setMessages(data || []);
    }
    loadMessages();
  }, [activeSessionId]);

  async function handleRegenerateSummary() {
    if (!activeSessionId) return;
    setSummarizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/chat/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '요약 실패');
      await loadAll();
    } catch (e) {
      alert(e.message);
    } finally {
      setSummarizing(false);
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (loading) {
    return <div className="p-12 text-sm text-zinc-400 animate-pulse">데이터 불러오는 중...</div>;
  }
  if (error) {
    return <div className="p-12 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft size={14} /> 리드 목록
        </Link>
      </div>

      {/* Lead 카드 */}
      {lead && (
        <div className="bg-white rounded-md border border-[var(--admin-border)] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-lg text-zinc-700">
              {(lead.name || '?')[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">{lead.name || '(이름 없음)'}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {lead.email || '-'} {lead.phone && ` · ${lead.phone}`} {lead.company_name && ` · ${lead.company_name}`}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">유입: {lead.lead_type || 'organic'} · 수집일 {new Date(lead.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI 요약 */}
      <div className="bg-white rounded-md border border-[var(--admin-border)] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">AI 고객 요약</h2>
            {activeSession?.ai_summary_updated_at && (
              <span className="text-[10px] text-zinc-400">
                · {new Date(activeSession.ai_summary_updated_at).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          <button
            onClick={handleRegenerateSummary}
            disabled={!activeSessionId || summarizing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 text-[11px] font-bold text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all disabled:opacity-40"
          >
            <RefreshCw size={11} className={summarizing ? 'animate-spin' : ''} />
            {summarizing ? '생성 중...' : '요약 재생성'}
          </button>
        </div>
        {activeSession?.ai_summary ? (
          <pre className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed font-sans">{activeSession.ai_summary}</pre>
        ) : (
          <p className="text-xs text-zinc-400">아직 요약이 없습니다. 위 버튼으로 생성하세요.</p>
        )}
      </div>

      {/* 세션 탭 */}
      {sessions.length > 0 ? (
        <div className="bg-white rounded-md border border-[var(--admin-border)] shadow-sm overflow-hidden">
          <div className="flex gap-1 p-3 border-b border-zinc-100 overflow-x-auto">
            {sessions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                  s.id === activeSessionId
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                세션 {sessions.length - i} · {new Date(s.started_at).toLocaleDateString('ko-KR')}
              </button>
            ))}
          </div>

          {/* 메시지 타임라인 */}
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">메시지가 없습니다.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-violet-100 text-violet-600'
                  }`}>
                    {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${m.role === 'user' ? 'items-end text-right' : ''}`}>
                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-800 border border-zinc-100'
                    }`}>
                      {m.content}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      {m.step && <span className="font-bold uppercase tracking-wider">{m.step}</span>}
                      <span>{new Date(m.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    {Array.isArray(m.choices) && m.choices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.choices.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-200 text-zinc-500">
                            {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-[var(--admin-border)] p-12 text-center shadow-sm">
          <MessageSquare size={32} className="mx-auto text-zinc-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-zinc-400">이 리드에 연결된 챗봇 대화 세션이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
