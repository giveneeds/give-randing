'use client';
import { useState, useRef, useEffect } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import LeadForm from '@/components/ui/LeadForm';
import { Send, Bot, User, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '반갑습니다! 기브니즈 AI 전략 센터입니다. 현재 운영 중인 브랜드의 마케팅에서 가장 고민되는 지점은 무엇인가요?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, showGate]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || showGate) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // AI 로직 시뮬레이션
    setTimeout(() => {
      setIsTyping(false);
      const aiMsg = { 
        role: 'assistant', 
        content: `"${input}"에 대한 통찰입니다. 보통 이 단계에서는 타겟 페르소나의 재정의와 전환율(CVR) 최적화가 필요합니다. 구체적인 브랜드 진단을 위해 아래 양식을 작성해 주시면, 1대1 심화 리포트를 보내드릴 수 있습니다.` 
      };
      setMessages(prev => [...prev, aiMsg]);
      
      // 3번째 메시지 이후에 게이트 노출 (유저 메시지 기준)
      if (messages.filter(m => m.role === 'user').length >= 1) {
        setShowGate(true);
      }
    }, 1500);
  };

  return (
    <>
      <LandingNavbar />
      <main className="min-h-screen bg-zinc-50 flex flex-col pt-24">
        {/* Chat Header */}
        <div className="bg-white border-b border-zinc-100 py-6 px-6 md:px-12 flex items-center justify-between sticky top-24 z-10">
          <div className="flex items-center gap-4">
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
             {['Branding', 'Performance', 'Contents'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-zinc-100 text-zinc-400 text-[10px] font-bold rounded-full uppercase tracking-tighter">{tag}</span>
             ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-12 md:px-12">
          <div className="max-w-screen-md mx-auto space-y-8">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-200' : 'bg-zinc-900 text-white'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                  </div>
                  <div className={`max-w-[85%] p-6 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-zinc-900 text-white rounded-tr-none' : 'bg-white border border-zinc-100 text-zinc-800 rounded-tl-none shadow-sm'}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Sparkles size={16} /></div>
                  <div className="flex gap-1 p-4 bg-white border border-zinc-100 rounded-3xl rounded-tl-none">
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {showGate && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-8 max-w-screen-sm mx-auto">
                   <LeadForm 
                     title="심층 진단 리포트 신청" 
                     subtitle="입력하신 정보를 바탕으로 영업일 기준 24시간 이내에 분석본을 보내드립니다." 
                     ctaLabel="무료 진단 신청하기" 
                     category="chatbot"
                   />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Input */}
        <div className="bg-zinc-50 border-t border-zinc-200 p-6 sticky bottom-0">
          <form onSubmit={handleSend} className="max-w-screen-md mx-auto relative group">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={showGate}
              placeholder={showGate ? "위 양식을 먼저 작성해 주세요." : "기브니즈 AI에게 질문하세요..."}
              className="w-full pl-8 pr-20 py-6 bg-white border border-zinc-200 rounded-[32px] text-sm focus:ring-4 focus:ring-zinc-900/5 transition-all shadow-sm disabled:bg-zinc-100 disabled:cursor-not-allowed"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || showGate}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:bg-zinc-200"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-400 mt-4 font-bold uppercase tracking-widest">Powered by Giveneeds Marketing Intelligence</p>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
