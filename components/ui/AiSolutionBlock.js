'use client';
import { useRouter } from 'next/navigation';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';
import { ArrowUpRight } from 'lucide-react';

/**
 * AiSolutionBlock — 매거진, 랜딩페이지 하단에 공통으로 붙는 AI 솔루션 CTA 블록
 * 에디터에서 show_ai_block 플래그로 켜고 끕니다.
 */
export default function AiSolutionBlock({ className = '' }) {
  const router = useRouter();

  return (
    <div className={`w-full ${className}`}>
      <div
        onClick={() => router.push('/chat')}
        className="
          relative w-full overflow-hidden rounded-3xl
          bg-zinc-950 dark:bg-zinc-900
          border border-zinc-800
          cursor-pointer
          group
          shadow-2xl
          transition-all duration-500
          hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]
          active:scale-[0.99]
        "
      >
        {/* ── 모션 그래픽: CPU Architecture (배경 레이어) ── */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none select-none overflow-hidden">
          <CpuArchitecture
            width="100%"
            height="100%"
            text="AI SOLUTION"
            className="text-zinc-300 w-full h-full scale-150"
            animateLines
            animateMarkers
            animateText
          />
        </div>

        {/* ── 그라디언트 오버레이 (좌측 텍스트 가독성 확보) ── */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-zinc-950/30 pointer-events-none" />

        {/* ── 콘텐츠 영역 ── */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-10 p-10 md:p-14">

          {/* 좌측: 텍스트 영역 */}
          <div className="flex-1 space-y-6 max-w-xl">
            {/* 상단 레이블 */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-px bg-zinc-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                Marketing Intelligence Agent
              </span>
            </div>

            {/* 메인 헤드카피 */}
            <h2 className="text-3xl md:text-[2.6rem] font-black text-white leading-[1.1] tracking-tighter break-keep">
              내 비즈니스를 위한<br />
              전략, AI를 통해<br />
              알아보기
            </h2>

            {/* 하단 서브카피 */}
            <p className="text-sm text-zinc-400 leading-relaxed break-keep">
              기브니즈의 마케팅 AI 에이전트와 즉시 상담을 시작하세요.<br className="hidden md:block" />
              다양한 업계의 인사이트와 아카이브를 바탕으로 최적의<br className="hidden md:block" />
              솔루션을 제안합니다.
            </p>
          </div>

          {/* 우측: CTA 버튼 */}
          <div className="shrink-0 flex flex-col items-center gap-4">
            {/* 원형 버튼 */}
            <div className="
              relative w-20 h-20 md:w-24 md:h-24
              rounded-full bg-white
              flex items-center justify-center
              shadow-xl
              group-hover:scale-110 group-hover:shadow-white/20 group-hover:shadow-2xl
              transition-all duration-500
            ">
              {/* 링 펄스 애니메이션 */}
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-30 group-hover:opacity-60" />
              <ArrowUpRight
                size={32}
                className="text-zinc-900 relative z-10 group-hover:rotate-12 transition-transform duration-300"
              />
            </div>

            {/* 버튼 하단 레이블 */}
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                Start Conversation
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Free Consultation
              </span>
            </div>
          </div>
        </div>

        {/* ── 하단 상태 인디케이터 ── */}
        <div className="relative z-10 flex items-center gap-2 px-10 md:px-14 pb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            AI Agent Online — 24/7 Available
          </span>
        </div>
      </div>
    </div>
  );
}
