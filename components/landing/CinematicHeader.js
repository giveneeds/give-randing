'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const MARKETING_PRODUCTS = [
  { id: 'seo', title: 'SEO Strategy', subtitle: 'Search Engine Optimization', category: 'Growth' },
  { id: 'global', title: 'Global Campaign', subtitle: 'Worldwide Expansion', category: 'Marketing' },
  { id: 'ai', title: 'AI Automation', subtitle: 'Smart Workflow Solutions', category: 'Efficiency' },
  { id: 'social', title: 'Viral Growth', subtitle: 'Social Media Strategy', category: 'Social' },
  { id: 'advisor', title: 'Search Advisor', subtitle: 'Professional Search Insight', category: 'Search' },
];

export default function CinematicHeader() {
  const container = useRef(null);
  const heroTextRef = useRef(null);
  const searchBarRef = useRef(null);
  const listItemsRef = useRef([]);

  useGSAP(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

    // 📏 해상도 기반 높이 계산 (모바일은 짧게)
    const getScrollDist = () => window.innerHeight * (isMobile ? 2.4 : 8);

    // 🧱 마스터 타임라인 - 고정과 애니메이션을 단 하나로 병합
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: "top top",
        end: () => `+=${getScrollDist()}`,
        pin: true,
        pinSpacing: true, // 다음 섹션을 강제로 아래로 밀어냄
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    });

    // 🕒 전체 타임라인 Duration: 24 (각 단위는 약 50vh 스크롤에 해당)
    
    // 1. 로고 소멸 (0 ~ 4)
    masterTl.to(heroTextRef.current, {
      scale: 0.05,
      opacity: 0,
      duration: 4,
      ease: "power2.inOut"
    });

    // 2. 검색창 등장 (3 ~ 7)
    masterTl.fromTo(searchBarRef.current, 
      { scale: 0.4, opacity: 0, y: 150, autoAlpha: 0 },
      { scale: 1, opacity: 1, y: 0, autoAlpha: 1, duration: 4, ease: "back.out(1.2)" },
      3
    );

    // 3. 상품 순차 노출 (7 ~ 17) - 총 10단위 사용 (아이템당 2단위 = 넉넉한 호흡)
    MARKETING_PRODUCTS.forEach((_, index) => {
      masterTl.fromTo(listItemsRef.current[index],
        { opacity: 0, x: -40 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 2, // 나타나는 시간 증가
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          ease: "power2.out"
        },
        7 + index * 2
      );
    });

    // 4. Hold Phase (17 ~ 21) - 모든 것이 노출된 상태 유지
    masterTl.to({}, { duration: 4 }, 17);

    // 5. 최종 퇴장 (21 ~ 24)
    masterTl.to(searchBarRef.current, {
      scale: 0.6,
      opacity: 0,
      y: -100,
      duration: 3,
      ease: "power4.in"
    });

  }, { scope: container });

  return (
    <div
      ref={container}
      className="w-full h-screen relative flex items-center justify-center overflow-hidden bg-white dark:bg-zinc-950 z-40"
    >
      <div className="relative w-full h-full pointer-events-none px-4 sm:px-8">
        {/* 브랜드 로고(장식) — 페이지 H1 은 히어로 아래 한국어 헤드라인이 담당하므로 div 로 둔다 */}
        <div
          ref={heroTextRef}
          className="absolute top-[50%] md:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12vw] md:text-[16vw] font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-2xl select-none uppercase z-10 text-center leading-none whitespace-nowrap will-change-transform"
        >
          GIVENEEDS
        </div>

        {/* 시네마틱 검색 팔레트 — 모바일도 절대배치 중앙 약간 위 */}
        <div className="absolute inset-0 flex items-center justify-center px-4 z-20 pointer-events-none" style={{ paddingBottom: '5vh' }}>
        <div
          ref={searchBarRef}
          className="max-h-[88vh] overflow-y-auto w-full max-w-[92vw] sm:max-w-[560px] bg-white/95 dark:bg-zinc-900/85 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-3xl md:rounded-[2.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.15)] md:shadow-[0_120px_300px_rgba(0,0,0,0.3)] dark:shadow-[0_120px_300px_rgba(0,0,0,1)] p-5 sm:p-6 pointer-events-auto opacity-0 invisible will-change-transform"
        >
          <div className="flex items-center gap-3 sm:gap-5 pb-5 sm:pb-8 border-b border-zinc-100 dark:border-white/5 mb-5 sm:mb-6 min-w-0">
            <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                className="bg-transparent border-none outline-none text-zinc-900 dark:text-white/95 w-full text-xl sm:text-3xl font-light tracking-tight truncate"
                readOnly
                value="Marketing Solutions"
              />
              <div className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mt-1">Intelligence System v3</div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-[11px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-4 py-2 tracking-[0.4em] flex justify-between items-center">
              <span>Ready for Analysis</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>
            
            {MARKETING_PRODUCTS.map((product, i) => (
              <div 
                key={product.id}
                ref={(el) => {
                  listItemsRef.current[i] = el;
                }}
                className="group flex items-center justify-between gap-3 px-4 sm:px-7 py-3.5 sm:py-5 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-white/5 bg-transparent transition-all duration-500 min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                  <div className="shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-all duration-500 rotate-0 group-hover:rotate-6">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-[18px] font-bold text-zinc-900 dark:text-white/95 tracking-tight mb-0.5 truncate">{product.title}</div>
                    <div className="text-[11px] sm:text-[12px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wide truncate">{product.subtitle}</div>
                  </div>
                </div>
                <div className="shrink-0 text-[9px] sm:text-[10px] font-mono font-black text-zinc-400 bg-zinc-100 dark:bg-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-zinc-200 dark:border-white/10 uppercase tracking-[0.15em] sm:tracking-[0.2em] opacity-80">
                  {product.category}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-7 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center text-[12px] text-zinc-400 px-4 font-bold">
            <div className="flex items-center space-x-3">
              <kbd className="bg-zinc-100 dark:bg-white/10 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white/70 shadow-sm">⌘ K</kbd>
              <span className="opacity-70 tracking-tight">to search insights</span>
            </div>
            <div className="flex items-center space-x-3 text-blue-500/90 group cursor-pointer">
              <span className="tracking-tighter">EXPLORE FURTHER</span>
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
