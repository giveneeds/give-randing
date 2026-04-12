'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MarketingHookSection({ title, subtitle, content }) {
  const container = useRef(null);
  const bigTextRef = useRef(null);
  const subtitleRef = useRef(null);

  useGSAP(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: 'top top',
        end: isMobile ? '+=100%' : '+=150%',
        scrub: isMobile ? 1 : 1.5,
        pin: true,
      }
    });

    // 🎨 1. '마케팅' 글자가 거대하게 시작해서 안착 (0 ~ 1.0)
    tl.fromTo(bigTextRef.current, 
      {
        scale: 10,
        opacity: 0,
        y: 200,
        filter: 'blur(30px)',
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        color: '#3B82F6', // 브랜드 블루
        duration: 2,
        ease: 'power3.out'
      }
    );

    // 🎨 2. '이 아닙니다.' 자막은 마케팅 글자가 어느 정도 작아졌을 때 서서히 등장
    tl.fromTo(subtitleRef.current,
      { opacity: 0, x: 20, filter: 'blur(10px)' },
      { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1 },
      "-=1.5"
    );


  }, { scope: container });

  return (
    <section ref={container} className="min-h-screen md:h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative py-20 md:py-0">
      <div className="relative z-10 text-center px-4 max-w-7xl w-full md:translate-y-[-5%]">
        {/* 1단: 상단 훅 타이틀 */}
        <div className="mb-8 md:mb-14 overflow-hidden">
          <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-[0.08em] sm:tracking-[0.1em] leading-tight opacity-40 uppercase">
            {title}
          </h2>
        </div>

        {/* 2단: 핵심 애니메이션 구간 (마케팅 + 이 아닙니다.) */}
        <div className="flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-6 text-3xl sm:text-5xl md:text-8xl font-black tracking-tighter leading-tight">
            {/* 마케팅 (슬롯 시스템) */}
            <div className="relative inline-flex items-center justify-center">
              {/* 애니메이션 되는 실제 텍스트 */}
              <span 
                ref={bigTextRef}
                className="text-blue-500 absolute z-20 origin-center whitespace-nowrap select-none"
              >
                {content.highlight}
              </span>
              {/* 자리를 차지하는 기준 텍스트 (투명) */}
              <span className="opacity-0 select-none pointer-events-none whitespace-nowrap">
                {content.highlight}
              </span>
            </div>

            {/* 강조 단어 뒤에 오는 접미 문구 (어드민에서 편집 가능) */}
            <span
              ref={subtitleRef}
              className="text-zinc-900 dark:text-white"
            >
              {content?.suffix || '이 아닙니다.'}
            </span>
          </div>

          {/* 3단: 하단 보조 푸터 */}
          <div className="mt-14 md:mt-28">
            <p className="text-sm sm:text-xl md:text-3xl font-bold text-zinc-400 dark:text-zinc-700 tracking-[0.15em] sm:tracking-[0.2em] uppercase italic border-t border-zinc-100 dark:border-white/5 pt-6 md:pt-10 px-4 sm:px-10 inline-block">
              {content.footer}
            </p>
          </div>

        </div>
      </div>

      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.012] dark:opacity-[0.022] flex items-center justify-center select-none overflow-hidden">
        <span className="text-[45vw] font-black leading-none transform -rotate-12 translate-x-32 skew-x-12">MARKETING</span>
      </div>
    </section>
  );
}
