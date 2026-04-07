'use client';
import { motion } from 'framer-motion';
import { MessageSquareText, Sparkles, ArrowRight } from 'lucide-react';

export default function ChatbotBlock() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="my-12 sm:my-16 p-6 sm:p-8 md:p-12 bg-zinc-900 text-white overflow-hidden relative group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={120} />
      </div>
      
      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
            <MessageSquareText size={20} className="text-zinc-400" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">Interactive AI Helper</span>
        </div>
        
        <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter mb-5 sm:mb-6 leading-tight">
          이 아티클의 내용을<br/>
          당신의 브랜드에 <span className="text-zinc-500">직접 적용</span>해볼까요?
        </h3>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-10">
          기브니즈 AI가 현재 읽고 계신 전략을 바탕으로 당신의 브랜드 상황을 진단하고, 
          즉각적인 개선안을 제안해 드립니다. 1대1 맞춤형 가이드를 지금 바로 시작하세요.
        </p>
        
        <a 
          href="/chat" 
          className="inline-flex items-center gap-3 bg-white text-zinc-900 px-6 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-widest hover:gap-6 transition-all"
        >
          AI 진단 시작하기 <ArrowRight size={14} />
        </a>
      </div>
    </motion.div>
  );
}
