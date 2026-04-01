'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Sparkles, 
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Zap,
  Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

export default function EditorialChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    // 1. 세션 ID 생성 또는 로드
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sid);
    }
    setSessionId(sid);

    // 2. 유저 정보 체크
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      loadMessages(sid, user?.id);
    };
    checkUser();
  }, []);

  const loadMessages = async (sid, uid) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`session_id.eq.${sid}${uid ? `,user_id.eq.${uid}` : ''}`)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // 대화 횟수 체크 (로그인 유도)
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length >= 3 && !user) {
      setShowLoginPrompt(true);
      return;
    }

    const userMsg = { role: 'user', content: input, session_id: sessionId, user_id: user?.id };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // API 호출 (실제 연동 시 /api/chat 활용)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages })
      });
      const data = await res.json();
      
      const assistantMsg = { role: 'assistant', content: data.reply, session_id: sessionId, user_id: user?.id };
      setMessages(prev => [...prev, assistantMsg]);

      // DB 저장
      await supabase.from('chat_messages').insert([userMsg, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col animate-in fade-in duration-700">
      {/* Header */}
      <header className="h-20 border-b border-zinc-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 hover:bg-zinc-50 rounded-full transition-all group">
          <ArrowLeft size={20} className="text-zinc-400 group-hover:text-zinc-900 group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">Marketing Agent</span>
          <h1 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Giveneeds Editorial Chat</h1>
        </div>
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white scale-90 shadow-lg">
          <Sparkles size={16} />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-screen-md mx-auto w-full flex flex-col p-8 space-y-12 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
             <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center">
                <MessageSquare size={32} className="text-zinc-300" />
             </div>
             <div>
                <p className="text-sm font-bold text-zinc-900 mb-2 uppercase tracking-widest">Consulting Archive</p>
                <p className="text-xs text-zinc-400 leading-loose">기브니즈의 마케팅 에이전트와 대화를 시작하세요.<br/>당신의 비즈니스 고민을 에디토리얼 관점에서 해결해 드립니다.</p>
             </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={clsx(
              "flex flex-col animate-in slide-in-from-bottom-4 duration-500",
              m.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={clsx(
                "max-w-[85%] p-6 rounded-2xl text-[15px] leading-relaxed",
                m.role === 'user' 
                  ? "bg-zinc-900 text-white shadow-xl rounded-tr-none" 
                  : "bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-tl-none font-medium"
              )}>
                {m.content}
              </div>
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mt-3 px-1">
                {m.role === 'user' ? 'Client' : 'Agent Response'}
              </span>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </main>

      {/* Input Area */}
      <footer className="p-8 pb-12 max-w-screen-md mx-auto w-full bg-white">
        <div className="relative flex items-center bg-zinc-50 rounded-2xl border border-zinc-100 p-2 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all shadow-sm">
          <input 
            className="flex-1 bg-transparent px-4 py-3 outline-none text-[15px] font-medium"
            placeholder="상담 내용을 입력하세요..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all active:scale-95 disabled:bg-zinc-200"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-center text-zinc-300 mt-6 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
           <ShieldCheck size={12} /> Secure Business Consultation
        </p>
      </footer>

      {/* Login Gate Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
                 <Lock size={24} className="text-zinc-900" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter mb-4">Identity Verification</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-10">
                 기각된 익명 상담의 연속성을 보호하기 위해<br/>카카오 로그인이 필요합니다.<br/>
                 <span className="text-zinc-600 font-bold">이후 대화 내역이 안전하게 보존됩니다.</span>
              </p>
              <button 
                onClick={() => router.push('/api/auth/kakao')}
                className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-zinc-900 h-14 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
              >
                 Kakao Sync Start
              </button>
              <button 
                onClick={() => setShowLoginPrompt(false)}
                className="mt-6 text-[10px] font-black text-zinc-300 uppercase tracking-widest hover:text-zinc-900 transition-all"
              >
                 Maybe Later
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
