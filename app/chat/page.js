'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import useRequireAuth from '@/components/auth/useRequireAuth';
import PremiumGateModal from '@/components/ui/PremiumGateModal';
import { Send, Bot, User, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getTrail, setLastPath } from '@/lib/userTrail';
import {
  STEPS,
  MAIN_CONCERN_CHOICES,
  SUB_DETAIL_CHOICES,
  STEP_PROMPTS,
  INITIAL_GREETING,
  nextLocalStep,
} from '@/lib/chatWorkflow';

export default function ChatPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [messages, setMessages] = useState([
    { role: 'assistant', content: INITIAL_GREETING, choices: MAIN_CONCERN_CHOICES, step: STEPS.MAIN_CONCERN },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(STEPS.MAIN_CONCERN);
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [currentChoices, setCurrentChoices] = useState(MAIN_CONCERN_CHOICES);
  const [guestMsgCount, setGuestMsgCount] = useState(0);
  const [showGateModal, setShowGateModal] = useState(false);
  const [awaitingLoginConfirm, setAwaitingLoginConfirm] = useState(false);
  const scrollRef = useRef(null);
  const sessionInitRef = useRef(false);

  useEffect(() => {
    setLastPath('/chat');
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // 첫 로그인 시 세션 생성
  const ensureSession = useCallback(async () => {
    if (sessionInitRef.current || !user || !supabase) return sessionId;
    sessionInitRef.current = true;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return null;
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trail: getTrail(),
          current_step: STEPS.MAIN_CONCERN,
        }),
      });
      const data = await res.json();
      if (data?.session?.id) {
        setSessionId(data.session.id);
        return data.session.id;
      }
    } catch (e) {
      console.warn('ensureSession failed:', e?.message);
    }
    return null;
  }, [user, sessionId]);

  useEffect(() => {
    if (user) ensureSession();
  }, [user, ensureSession]);

  // 어시스턴트 메시지를 DB에 저장 (RLS — 본인 세션만)
  async function persistMessage({ role, content, choices = null, stepId = null, sid }) {
    if (!supabase || !sid) return;
    try {
      await supabase.from('chat_messages').insert({
        session_uuid: sid,
        session_id: sid, // 레거시 text 컬럼 호환
        role,
        content,
        choices: choices && choices.length ? choices : null,
        step: stepId,
      });
    } catch (e) {
      console.warn('persistMessage failed:', e?.message);
    }
  }

  async function updateSessionState({ sid, nextStep, nextAnswers }) {
    if (!supabase || !sid) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return;
      await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: sid,
          answers: nextAnswers,
          current_step: nextStep,
          trail: getTrail(),
        }),
      });
    } catch {}
  }

  // 로그인 질의 후 긍정/부정 판별용
  const LOGIN_PROMPT_CHOICES = [
    { label: '네, 로그인 할게요', value: '네' },
    { label: '아니요, 괜찮아요', value: '아니요' },
  ];
  const AFFIRMATIVE_RE = /(^|\s)(네|응|예|좋아|좋아요|좋아용|그래|그래요|yes|yeah|yep|yup|y|ok|okay|오케이|띄워|띄워줘|로그인|해줘|해|해주세요|응응|ㅇㅇ|ㅇㅋ|부탁|부탁해|부탁드려요)($|\s|\.|!|\?|~)/i;

  function pushAssistantLoginPrompt() {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content:
          '로그인을 시도하시면 저와 대화를 더 나눌 수 있어요.\n로그인 팝업을 띄워드릴까요? 😊',
        choices: LOGIN_PROMPT_CHOICES,
        step,
      },
    ]);
    setCurrentChoices(LOGIN_PROMPT_CHOICES);
    setAwaitingLoginConfirm(true);
  }

  // 선택지 버튼 클릭 또는 자유 입력 → 사용자 메시지 추가 + AI 호출
  async function handleSend({ text, selectedValue }) {
    const content = (text || '').trim();
    if (!content || isTyping) return;

    // 비로그인 + 로그인 확인 대기 중: 긍정/부정 판별
    if (!user && awaitingLoginConfirm) {
      const userMsg = { role: 'user', content, step };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setCurrentChoices([]);

      const affirmative =
        selectedValue === '네' || AFFIRMATIVE_RE.test(content);

      if (affirmative) {
        setAwaitingLoginConfirm(false);
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: '좋아요! 로그인 창을 띄워드릴게요 ✨',
              choices: [],
              step,
            },
          ]);
          setIsTyping(false);
          setShowGateModal(true);
        }, 500);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                '알겠어요! 마음이 바뀌시면 "네"라고 답해 주세요. 언제든 로그인 팝업을 띄워드릴게요 🙂',
              choices: LOGIN_PROMPT_CHOICES,
              step,
            },
          ]);
          setCurrentChoices(LOGIN_PROMPT_CHOICES);
          setIsTyping(false);
        }, 500);
      }
      return;
    }

    const userMsg = { role: 'user', content, step };
    const nextMessagesLocal = [...messages, userMsg];
    setMessages(nextMessagesLocal);
    setInput('');
    setCurrentChoices([]);
    setIsTyping(true);

    // 비로그인 사용자 메시지 카운트 증가
    let hitGuestLimit = false;
    if (!user) {
      const nextCount = guestMsgCount + 1;
      setGuestMsgCount(nextCount);
      if (nextCount >= 5) hitGuestLimit = true;
    }

    // answers 자동 업데이트
    let nextAnswers = { ...answers };
    if (step === STEPS.MAIN_CONCERN) nextAnswers.mainConcern = selectedValue || content;
    else if (step === STEPS.SUB_DETAIL) nextAnswers.subDetail = selectedValue || content;
    else if (step === STEPS.INDUSTRY) nextAnswers.industry = content;
    else if (step === STEPS.STRENGTH) nextAnswers.strength = content;
    setAnswers(nextAnswers);

    // 비로그인 사용자: 메시지 5회 도달 → AI 호출 대신 로그인 질의
    if (!user && hitGuestLimit) {
      setTimeout(() => {
        setIsTyping(false);
        pushAssistantLoginPrompt();
      }, 700);
      return;
    }

    // 세션 확보 (로그인 사용자만)
    const sid = user ? (sessionId || (await ensureSession())) : null;
    if (sid) persistMessage({ role: 'user', content, stepId: step, sid });

    // 다음 단계가 아직 "수집 단계"면 로컬 프롬프트로 진행 (AI 호출 X)
    const localNext = nextLocalStep(step, nextAnswers);
    const collectSteps = new Set([STEPS.SUB_DETAIL, STEPS.INDUSTRY, STEPS.STRENGTH]);

    if (collectSteps.has(localNext)) {
      // 로컬 프롬프트 메시지 생성
      let choices = [];
      if (localNext === STEPS.SUB_DETAIL) {
        choices = SUB_DETAIL_CHOICES[nextAnswers.mainConcern] || [];
      }
      const promptText = STEP_PROMPTS[localNext];
      const asMsg = { role: 'assistant', content: promptText, choices, step: localNext };

      setTimeout(() => {
        setMessages((prev) => [...prev, asMsg]);
        setIsTyping(false);
        setStep(localNext);
        setCurrentChoices(choices);
      }, 400);
      if (sid) {
        persistMessage({ role: 'assistant', content: promptText, choices, stepId: localNext, sid });
        updateSessionState({ sid, nextStep: localNext, nextAnswers });
      }
      return;
    }

    // 비로그인 사용자가 AI 단계(recommendation/freeChat)에 도달 → 로그인 질의
    if (!user) {
      setTimeout(() => {
        setIsTyping(false);
        pushAssistantLoginPrompt();
      }, 600);
      return;
    }

    // 이후 단계는 AI 호출 (recommendation / freeChat) — 로그인 사용자만
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: nextMessagesLocal.map(({ role, content }) => ({ role, content })),
          trail: getTrail(),
          answers: nextAnswers,
          step: localNext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'AI 응답 실패');

      const reply = data.reply || '죄송해요, 응답을 불러오지 못했어요.';
      const aiChoices = Array.isArray(data.choices) ? data.choices : [];
      const nextStepFromAi = data.nextStep || (localNext === STEPS.RECOMMENDATION ? STEPS.FREE_CHAT : localNext);

      const asMsg = { role: 'assistant', content: reply, choices: aiChoices, step: nextStepFromAi };
      setMessages((prev) => [...prev, asMsg]);
      setStep(nextStepFromAi);
      setCurrentChoices(aiChoices);
      persistMessage({ role: 'assistant', content: reply, choices: aiChoices, stepId: nextStepFromAi, sid });
      updateSessionState({ sid, nextStep: nextStepFromAi, nextAnswers });
    } catch (err) {
      console.error(err);
      // 401/네트워크 등 → 로그인 질의로 자연스럽게 유도
      setIsTyping(false);
      pushAssistantLoginPrompt();
      return;
    } finally {
      setIsTyping(false);
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSend({ text: input });
  };

  const handleChoiceClick = (choice) => {
    handleSend({ text: choice.label, selectedValue: choice.value });
  };

  if (authLoading) {
    return (
      <>
        <LandingNavbar />
        <main className="min-h-screen flex items-center justify-center pt-24">
          <Loader2 className="animate-spin text-zinc-400" size={28} />
        </main>
      </>
    );
  }

  return (
    <>
      <LandingNavbar />
      <main className="min-h-screen bg-zinc-50 flex flex-col pt-24">
        {/* Chat Header */}
        <div className="bg-white border-b border-zinc-100 py-4 md:py-6 px-4 md:px-12 flex items-center justify-between sticky top-24 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  if (window.history.length > 1) window.history.back();
                  else window.location.href = '/';
                }
              }}
              aria-label="뒤로가기"
              className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-zinc-900">GIVENEEDS AI CONSULTANT</h1>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                Real-time Strategy Diagnosis <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            {['Branding', 'Performance', 'Contents'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-zinc-100 text-zinc-400 text-[10px] font-bold rounded-full uppercase tracking-tighter"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12">
          <div className="max-w-screen-md mx-auto space-y-6 md:space-y-8">
            <AnimatePresence>
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' ? 'bg-zinc-200' : 'bg-zinc-900 text-white'
                      }`}
                    >
                      {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                    </div>
                    <div className="flex flex-col gap-3 max-w-[80%] sm:max-w-[85%]">
                      <div
                        className={`p-4 md:p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-zinc-900 text-white rounded-tr-none'
                            : 'bg-white border border-zinc-100 text-zinc-800 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* 선택지 버튼 — 마지막 어시스턴트 메시지에만 */}
                      {msg.role === 'assistant' && isLast && msg.choices && msg.choices.length > 0 && !isTyping && (
                        <div className="flex flex-wrap gap-2">
                          {msg.choices.map((c, idx) => (
                            <button
                              key={`${c.value}-${idx}`}
                              type="button"
                              onClick={() => handleChoiceClick(c)}
                              className="px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white text-xs font-bold text-zinc-800 rounded-full transition-all active:scale-[0.98]"
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <div className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex gap-1 p-4 bg-white border border-zinc-100 rounded-3xl rounded-tl-none">
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Input */}
        <div className="bg-zinc-50 border-t border-zinc-200 p-4 md:p-6 sticky bottom-0">
          <form onSubmit={handleFormSubmit} className="max-w-screen-md mx-auto relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder={
                currentChoices.length > 0
                  ? '위 선택지 중 하나를 고르거나 직접 입력하세요...'
                  : '기브니즈 AI에게 질문하세요...'
              }
              className="w-full pl-5 md:pl-8 pr-16 md:pr-20 py-5 md:py-6 bg-white border border-zinc-200 rounded-[28px] md:rounded-[32px] text-sm focus:ring-4 focus:ring-zinc-900/5 transition-all shadow-sm disabled:bg-zinc-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:bg-zinc-200"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-400 mt-4 font-bold uppercase tracking-widest">
            Powered by Giveneeds Marketing Intelligence
          </p>
        </div>
      </main>
      <LandingFooter />
      {showGateModal && <PremiumGateModal redirectPath="/chat" />}
    </>
  );
}
