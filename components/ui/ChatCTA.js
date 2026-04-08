'use client';
import { useRouter } from 'next/navigation';
import { MessageSquare, Sparkles, ArrowUpRight, Zap } from 'lucide-react';
import { appendCTA } from '@/lib/userTrail';

export default function ChatCTA() {
  const router = useRouter();

  const handleGo = () => {
    appendCTA({ label: 'ChatCTA — Start Conversation', page: typeof window !== 'undefined' ? window.location.pathname : '' });
    router.push('/chat');
  };

  return (
    <div className="my-24 px-8 max-w-screen-md mx-auto group animate-in slide-in-from-bottom-8 duration-700">
      <div className="bg-zinc-900 rounded-3xl p-10 md:p-14 relative overflow-hidden shadow-2xl transition-all active:scale-[0.99]" onClick={handleGo}>
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full translate-x-24 -translate-y-24 opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-zinc-800 rounded-full -translate-x-12 translate-y-12 opacity-10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="flex-1 space-y-6">
             <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-zinc-700" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Marketing Intelligence Agent</span>
             </div>
             
             <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] tracking-tighter break-keep">
               당신의 비즈니스를 위한<br/>에디토리얼 전략이 필요하신가요?
             </h2>
             
             <p className="text-sm text-zinc-400 leading-relaxed max-w-md break-keep">
                기브니즈의 마케팅 AI 에이전트와 즉시 상담을 시작하세요.<br className="hidden md:block" />
                다양한 업계의 인사이트와 아카이브를 바탕으로 최적의 솔루션을 제안합니다.
             </p>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-5">
             <button className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-zinc-900 group-hover:scale-110 transition-all shadow-xl">
                <ArrowUpRight size={32} />
             </button>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Start Conversation</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Free Consultation</span>
             </div>
          </div>
        </div>

        {/* Floating Icons */}
        <div className="absolute top-10 right-10 text-zinc-800 group-hover:text-zinc-700 transition-colors">
           <Zap size={80} strokeWidth={4} />
        </div>
      </div>
    </div>
  );
}
