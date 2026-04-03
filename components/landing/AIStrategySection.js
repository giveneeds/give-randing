'use client';

import { motion } from 'framer-motion';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function AIStrategySection() {
  const handleStartAI = () => {
    window.location.href = '/chatbot'; // 기존 AI 챗봇 서비스 페이지로 이동
  };

  return (
    <section className="py-24 px-4 bg-black overflow-hidden relative selection:bg-purple-500">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-[-10%] right-[-5%] w-1/2 h-full bg-purple-900/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-1/2 h-full bg-blue-900/20 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
        {/* Left Content */}
        <div className="flex-1 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black text-xs tracking-widest uppercase mb-8"
          >
            <Zap size={14} className="fill-purple-400" />
            <span>AI Powered Growth</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-10 leading-none"
          >
            기브니즈 AI로<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-blue-400">
              5분만에 맞춤 전략
            </span><br />
            알아보기
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-zinc-400 mb-12 max-w-xl font-medium leading-relaxed"
          >
            복잡한 데이터 분석과 시장 조사, 이제 AI가 대신합니다. 
            당신의 비즈니스 상황에 딱 맞는 초격차 성장의 로드맵을 지금 바로 확인하세요.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            onClick={handleStartAI}
            className="group relative inline-flex items-center space-x-4 bg-white text-black px-12 py-5 rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <span>전략 알아보기</span>
            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </div>

        {/* Right Visual (CPU Animation) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          className="flex-1 w-full max-w-[600px] aspect-square relative"
          onClick={handleStartAI}
          style={{ cursor: 'pointer' }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-[100px] animate-pulse" />
          <CpuArchitecture 
            className="relative z-10 w-full h-full drop-shadow-[0_0_50px_rgba(139,92,246,0.3)]" 
            text="AI SOLUTION"
          />
          
          {/* Floating HUD Elements for Aesthetic */}
          <div className="absolute top-0 right-0 p-6 border border-white/5 bg-white/5 backdrop-blur-md rounded-2xl animate-bounce delay-700">
             <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Analysis Rate</div>
             <div className="text-xl font-black text-purple-400 tracking-tighter">99.8%</div>
          </div>
          <div className="absolute bottom-10 left-0 p-6 border border-white/5 bg-white/5 backdrop-blur-md rounded-2xl animate-bounce">
             <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Strategy Gen</div>
             <div className="text-xl font-black text-blue-400 tracking-tighter">Completed</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
