'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MarketingHookSection({ title, subtitle, content }) {
  const container = useRef(null);
  const bigTextRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: 'top top',
        end: '+=150%',
        scrub: 1,
        pin: true,
      }
    });

    // 🎨 텍스트 필인 애니메이션: 배경의 거대 텍스트가 작아지며 문구 사이로 삽입됨
    tl.fromTo(bigTextRef.current, 
      {
        scale: 6,
        opacity: 0,
        y: 100,
        filter: 'blur(20px)',
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        color: '#3B82F6', // 브랜드 블루
        duration: 1,
        ease: 'power2.out'
      }
    );
  }, { scope: container });

  return (
    <section ref={container} className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative">
      <div className="relative z-10 text-center px-4 max-w-5xl">
        {/* 상단 메인 타이틀 */}
        <h2 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter mb-12 leading-tight">
          {title}
        </h2>

        {/* 🎬 애니메이션 문구 구간 */}
        <div className="flex flex-col items-center space-y-12">
          <div className="flex flex-wrap items-center justify-center gap-x-4 text-3xl md:text-6xl font-black tracking-tighter leading-none">
            {/* "누구나 해결할 수 있는 건" */}
            <span className="text-zinc-900 dark:text-white">
              {title.split(' ').slice(0, -1).join(' ')} {title.split(' ').slice(-1)}
            </span>

            {/* 마케팅 (슬롯 시스템) */}
            <div className="relative inline-flex items-center justify-center pt-1">
              {/* 애니메이션 되는 실제 텍스트 */}
              <span 
                ref={bigTextRef}
                className="text-blue-500 absolute z-20 origin-center whitespace-nowrap select-none"
              >
                {content.highlight}
              </span>
              {/* 자리를 차지하는 기준 텍스트 (투명) - 겹침 방지의 핵심 */}
              <span className="opacity-0 select-none pointer-events-none whitespace-nowrap">
                {content.highlight}
              </span>
            </div>

            {/* "이 아닙니다." */}
            <span className="text-zinc-900 dark:text-white">
              {subtitle}
            </span>
          </div>

          {/* 하단 보조 문구 */}
          <p className="text-2xl md:text-4xl font-bold text-zinc-400 dark:text-zinc-600 tracking-tight transition-opacity duration-700">
            {content.footer}
          </p>
        </div>
      </div>

      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.04] flex items-center justify-center select-none overflow-hidden">
        <span className="text-[40vw] font-black leading-none">MARKETING</span>
      </div>
    </section>
  );
}
