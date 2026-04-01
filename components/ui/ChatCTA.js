'use client';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function ChatCTA() {
  return (
    <section className="py-20 px-6 border-t border-zinc-100 bg-zinc-50/50">
      <div className="max-w-screen-md mx-auto bg-white border border-zinc-200 rounded-3xl p-10 md:p-16 text-center shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
        <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner animate-pulse">
          <Sparkles size={28} />
        </div>
        
        <label className="text-[10px] font-black tracking-[0.4em] text-zinc-400 uppercase mb-4 block">
          Marketing Intelligence Agent
        </label>
        
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-[1.1] mb-8 break-keep">
          데이터로 증명하는<br/>
          성장 전략이 필요하신가요?
        </h2>
        
        <p className="text-sm md:text-base text-zinc-500 leading-relaxed max-w-sm mx-auto mb-12 break-keep">
          기브니즈의 AI 에이전트와 실시간으로 상담하며,<br/>
          귀사의 브랜드에 최적화된 마케팅 아카이브를 구축해 보세요.
        </p>
        
        <Link 
          href="/chat" 
          className="group inline-flex items-center gap-3 bg-zinc-900 hover:bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          에이전트 상담 시작 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
        
        <div className="mt-12 flex items-center justify-center gap-8 pt-8 border-t border-zinc-50">
          <div className="flex flex-col items-center">
             <span className="text-xs font-black text-zinc-900">24/7</span>
             <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest mt-1">Available</span>
          </div>
          <div className="w-px h-6 bg-zinc-100" />
          <div className="flex flex-col items-center">
             <span className="text-xs font-black text-zinc-900">AI AGENT</span>
             <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest mt-1">Powered</span>
          </div>
        </div>
      </div>
    </section>
  );
}
