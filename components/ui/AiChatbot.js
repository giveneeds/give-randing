'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, User } from 'lucide-react';

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 기브니즈 AI 전략 센터입니다. 우리 브랜드에 맞는 마케팅 전략이 궁금하신가요?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // AI Response Simulation (OpenAI/Gemini 연동 지점)
    setTimeout(() => {
      const aiResponse = { 
        role: 'assistant', 
        content: `"${input}"에 대한 기브니즈의 분석 결과입니다. 해당 카테고리에서는 데이터 기반의 퍼포먼스 마케팅과 감각적인 콘텐츠가 필수적입니다. 더 자세한 사례는 저희 '매거진'의 [스타트업 성장기] 섹션을 참고해보세요!` 
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] font-sans">
      {/* Chat Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-zinc-900 border-zinc-700' : 'bg-primary border-transparent'} border text-white hover:scale-110 active:scale-95`}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] h-[550px] bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-6 bg-zinc-900 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm leading-none mb-1 flex items-center gap-2">
                GIVENEEDS AI <Sparkles size={12} className="text-yellow-400 fill-current" />
              </h4>
              <p className="text-[10px] text-zinc-400 font-medium">실시간 마케팅 전략 진단 중</p>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-none shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 border-t dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="마케팅 고민을 입력하세요..."
                className="w-full p-4 pr-12 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors"
                disabled={!input.trim() || isTyping}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
