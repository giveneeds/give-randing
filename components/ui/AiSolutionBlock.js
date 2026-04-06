'use client';
import { useRouter } from 'next/navigation';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * AiSolutionBlock — 리뉴얼 버전
 * 텍스트는 상단 외부에 배치, 블록은 애니메이션 전용으로 클릭하여 /chat 이동
 */
export default function AiSolutionBlock({ className = '' }) {
  return (
    <div className={`w-full max-w-5xl mx-auto ${className}`}>
      
      {/* ── 상단 텍스트 영역 (Outside) ── */}
      <div className="mb-10 space-y-4 px-4 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 text-violet-500 mb-2">
          <Sparkles size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">
            Marketing Intelligence Agent
          </span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white leading-tight tracking-tighter break-keep">
          내 비즈니스를 위한 전략,<br className="md:hidden" /> AI를 통해 알아보기
        </h2>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep max-w-2xl">
          기브니즈의 마케팅 AI 에이전트와 즉시 상담을 시작하세요. 
          다양한 업계의 인사이트와 아카이브를 바탕으로 최적의 솔루션을 제안합니다.
        </p>
      </div>

      {/* ── 클릭 가능한 애니메이션 블록 ── */}
      <Link href="/chat" className="block group">
        <div className="
          relative w-full h-[280px] md:h-[340px] 
          overflow-hidden rounded-[2.5rem]
          bg-[#020617]
          border border-white/5
          shadow-2xl shadow-blue-900/20
          transition-all duration-700
          group-hover:scale-[1.015]
          group-hover:shadow-blue-500/20
          group-active:scale-[0.99]
        ">
          {/* 심해 네이비 그라디언트 레이어 */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0a0f1d] to-[#020617]" />
          
          {/* ⚡ CPU Architecture 애니메이션 (메인) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity duration-700">
            <CpuArchitecture
              width="100%"
              height="100%"
              text="AI STRATEGY"
              className="text-blue-400/30 w-full h-full scale-[1.3] md:scale-110"
              animateLines
              animateMarkers
              animateText
            />
          </div>

          {/* 중앙 오버레이 마스크 (시각적 깊이감) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/40 via-transparent to-[#020617]/40 pointer-events-none" />
          
          {/* 블록 내부 안내 텍스트 (우측 하단 작게) */}
          <div className="absolute bottom-8 right-10 flex items-center gap-3">
             <div className="flex flex-col items-end text-right">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Interactive Console</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-tighter opacity-60">Click to Initialize AI Agent</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center group-hover:bg-blue-400 group-hover:scale-110 transition-all duration-300">
                <ArrowRight size={20} className="text-[#020617] group-hover:text-white transition-colors" />
             </div>
          </div>

          {/* 좌측 하단 상태바 */}
          <div className="absolute bottom-8 left-10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            <span className="text-[9px] font-bold text-blue-300/60 uppercase tracking-widest">
              Giveneeds Intelligence Core Online
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
