'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { Send, Clock, User, Sparkles, LogIn, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase, isDummyMode } from '@/lib/supabase';
import Link from 'next/link';

export default function EditorialChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 기브니즈 마케팅 에이전트입니다. 어떤 마케팅 고민을 가지고 계신가요? 전략 수립부터 실행까지 상세히 제안해 드립니다.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const scrollRef = useRef(null);

  // Load User & Session
  useEffect(() => {
    async function init() {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      setUser(supabaseUser);
      
      const savedCount = parseInt(localStorage.getItem('chat_message_count') || '0');
      setSessionCount(savedCount);
    }
    init();
  }, []);

  // Scroll to Bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Login Threshold Check (3 messages)
    if (!user && sessionCount >= 3) {
      setShowLoginModal(true);
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Next.js API call (Phase 7 modernized chat API)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages })
      });
      const data = await res.json();
      
      const assistantMessage = { role: 'assistant', content: data.content };
      setMessages(prev => [...prev, assistantMessage]);

      // 2. Incremental Count
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      localStorage.setItem('chat_message_count', newCount.toString());

      // 3. Persistence if logged in
      if (user) {
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: input },
          { user_id: user.id, role: 'assistant', content: data.content }
        ]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    // Redirect to Kakao via Supabase
    supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/chat` }
    });
  };

  return (
    <>
      <LandingNavbar />
      
      <main className="bg-white min-h-screen pt-40 pb-20 px-6 font-mono">
        {/* Editorial Header */}
        <div className="max-w-screen-md mx-auto mb-16 space-y-6">
           <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors group mb-4">
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-all" />
             <span className="text-[10px] font-black tracking-widest uppercase">Archive</span>
           </Link>
           <h1 className="text-[clamp(2rem,6vw,4rem)] font-black leading-[1.05] tracking-tighter text-zinc-900 uppercase">
             Marketing<br/>Agent-Consult
           </h1>
           <div className="flex items-center gap-6 pt-6 border-t border-zinc-100">
             <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">AI Strategy Interface</span>
             <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-sm">Live Connection</span>
           </div>
        </div>

        {/* Chat Message Area */}
        <div className="max-w-screen-md mx-auto min-h-[500px] flex flex-col space-y-12 mb-20 scroll-smooth" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={clsx(
              "flex group",
              msg.role === 'assistant' ? "items-start gap-6" : "flex-row-reverse items-start gap-6 text-right"
            )}>
              <div className="w-10 h-10 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center shrink-0 mt-1">
                {msg.role === 'assistant' ? <Sparkles size={16} className="text-zinc-400" /> : <User size={16} className="text-zinc-900" />}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-baseline gap-3">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                     {msg.role === 'assistant' ? 'GIVENEEDS AGENT' : 'CLIENT'}
                   </span>
                   <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-tighter">
                     {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
                <div className={clsx(
                  "text-lg leading-relaxed text-zinc-600 font-medium tracking-tight",
                  msg.role === 'assistant' ? "max-w-[85%]" : "max-w-[85%] ml-auto"
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-6 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100" />
              <div className="space-y-2">
                 <div className="h-2 w-12 bg-zinc-100 rounded" />
                 <div className="h-4 w-48 bg-zinc-50 rounded" />
              </div>
            </div>
          )}
        </div>

        {/* Input Sticky */}
        <div className="max-w-screen-md mx-auto sticky bottom-12 bg-white/90 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden group">
          <form onSubmit={handleSendMessage} className="flex items-end p-2 gap-2">
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none text-zinc-900 placeholder:text-zinc-300 font-bold text-sm resize-none custom-scrollbar min-h-[60px]"
              placeholder="전략에 대해 물어보세요..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 bg-zinc-900 text-white flex items-center justify-center rounded-xl hover:bg-black transition-all hover:scale-105 active:scale-95 disabled:bg-zinc-100 disabled:text-zinc-300"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>

      {/* Login Protection Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowLoginModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-10 text-center shadow-2xl animate-in zoom-in duration-300">
             <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                <LogIn size={24} className="text-zinc-900" />
             </div>
             <h3 className="text-2xl font-black tracking-tighter text-zinc-900 mb-4 uppercase">Archive Secured</h3>
             <p className="text-sm text-zinc-500 leading-relaxed mb-10 break-keep">
               실시간 전략 상담 아카이브를 활성화하려면<br/>로그인이 필요합니다.<br/>
               (무료 상담 3회 초과)
             </p>
             <button 
               onClick={handleLogin}
               className="w-full bg-[#FEE500] hover:bg-[#FADA0A] text-zinc-900 flex items-center justify-center gap-3 py-4 rounded-xl font-black text-sm transition-all hover:scale-[1.02] shadow-xl"
             >
               <div className="w-5 h-5 bg-zinc-900 rounded-md flex items-center justify-center">
                  <span className="text-[10px] text-white">K</span>
               </div>
               카카오로 1초 로그인
             </button>
             <p className="mt-8 text-[10px] font-bold text-zinc-300 uppercase tracking-widest cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => setShowLoginModal(false)}>
               Later
             </p>
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
