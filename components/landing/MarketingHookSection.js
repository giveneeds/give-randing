'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MarketingHookSection({ title, subtitle, content }) {
  const container = useRef(null);
  const bigTextRef = useRef(null);
  const slotRef = useRef(null);

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

    // 🎨 거대 텍스트가 슬롯으로 들어가는 애니메이션
    tl.fromTo(bigTextRef.current, 
      {
        scale: 4,
        opacity: 0.1,
        y: 100,
        filter: 'blur(10px)',
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        color: '#3B82F6', // 브랜드 블루
        duration: 2,
      },
      0
    );

    // 슬롯 텍스트와 겹치게 하거나 위치를 조정
  }, { scope: container });

  return (
    <section ref={container} className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden relative">
      <div className="relative z-10 text-center px-4">
        {/* 상단 문구 */}
        <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
          {title}
        </h2>

        {/* 애니메이션 되는 핵심 단어 및 하단 문구 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-end justify-center min-h-[1.2em] relative">
            <span 
              ref={bigTextRef}
              className="text-4xl md:text-7xl font-black text-blue-500 whitespace-nowrap absolute select-none"
            >
              {content.highlight}
            </span>
            {/* 자리를 차지하기 위한 가짜 텍스트 (투명) */}
            <span className="text-4xl md:text-7xl font-black opacity-0 select-none">
              {content.highlight}
            </span>
            <span className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white ml-2 tracking-tighter pb-1">
              {subtitle}
            </span>
          </div>

          <p className="text-2xl md:text-4xl font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
            {content.footer}
          </p>
        </div>
      </div>

      {/* 배경 장식이나 추가 텍스트가 필요하면 여기에 */}
    </section>
  );
}
