'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

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
    const vh = (v) => (v * window.innerHeight) / 100;

    // 🧱 1. Pinning - 컨테이너를 800vh 동안 고정 (이게 핵심!)
    ScrollTrigger.create({
      trigger: container.current,
      start: "top top",
      end: "+=800vh",
      pin: true,
      pinSpacing: true, // 다음 섹션이 800vh 뒤에 오도록 공간 확보
      scrub: true,
    });

    // 🎨 2. GIVENEEDS 로고 멀어지기 (150vh 구간)
    gsap.fromTo(heroTextRef.current, 
      { scale: 1, opacity: 1, filter: 'blur(0px)' },
      {
        scale: 0.1,
        opacity: 0,
        filter: 'blur(20px)',
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: `+=${vh(150)}`,
          scrub: true,
        }
      }
    );

    // 🚀 3. 검색 팔레트 다가오기 (100vh ~ 250vh 구간)
    gsap.fromTo(searchBarRef.current, 
      { scale: 0.7, opacity: 0, y: 10, autoAlpha: 0 },
      { 
        scale: 1, 
        opacity: 1, 
        y: 0,
        autoAlpha: 1,
        scrollTrigger: {
          trigger: container.current,
          start: `+=${vh(100)}`,
          end: `+=${vh(250)}`,
          scrub: true,
        }
      }
    );

    // 📋 4. 상품 리스트 순차 노출 (250vh ~ 750vh 구간)
    MARKETING_PRODUCTS.forEach((_, index) => {
      const startPos = vh(250 + index * 100);
      const endPos = vh(350 + index * 100);

      gsap.fromTo(listItemsRef.current[index],
        { opacity: 0, x: -10, filter: 'blur(5px)' },
        {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          scrollTrigger: {
            trigger: container.current,
            start: `+=${startPos}`,
            end: `+=${startPos + vh(50)}`,
            scrub: true,
          }
        }
      );

      ScrollTrigger.create({
        trigger: container.current,
        start: `+=${startPos}`,
        end: `+=${endPos}`,
        onToggle: (self) => {
          if (self.isActive) {
            gsap.to(listItemsRef.current[index], {
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              scale: 1.02,
              duration: 0.4,
            });
          } else {
            gsap.to(listItemsRef.current[index], {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              scale: 1,
              duration: 0.4,
            });
          }
        }
      });
    });

    // 🌟 5. 마지막 페이드 아웃 (750vh ~ 800vh)
    gsap.to(container.current, {
      opacity: 0,
      scale: 0.95,
      scrollTrigger: {
        trigger: container.current,
        start: `+=${vh(750)}`,
        end: `+=${vh(800)}`,
        scrub: true,
      }
    });

  }, { scope: container });

  return (
    <div 
      ref={container} 
      className="w-full h-screen relative flex items-center justify-center overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-700 z-40"
    >
      <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
        {/* GIVENEEDS 브랜드 로고 */}
        <h1 
          ref={heroTextRef}
          className="absolute text-[12vw] font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-2xl select-none uppercase"
        >
          GIVENEEDS
        </h1>

        {/* 커맨드 팔레트 */}
        <div 
          ref={searchBarRef}
          className="absolute w-[90%] max-w-[520px] bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.7)] p-4 pointer-events-auto opacity-0 invisible"
        >
          <div className="flex items-center space-x-3 pb-4 border-b border-zinc-100 dark:border-white/5 mb-2">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Searching Solutions..." 
              className="bg-transparent border-none outline-none text-zinc-900 dark:text-white/90 placeholder-zinc-400 dark:placeholder-zinc-500 w-full text-lg font-light"
              readOnly
              value="Marketing Solutions"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[9px] uppercase font-bold text-zinc-500 px-2 py-2 tracking-[0.2em]">
              Available Services
            </div>
            
            {MARKETING_PRODUCTS.map((product, i) => (
              <div 
                key={product.id}
                ref={(el) => {
                  listItemsRef.current[i] = el;
                }}
                className="group flex items-center justify-between px-3 py-3 rounded-xl border border-transparent transition-all duration-500 transform opacity-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-blue-500/20 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-900 dark:text-white/90">{product.title}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light">{product.subtitle}</div>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-500 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded border border-zinc-200 dark:border-white/10 uppercase tracking-tighter">
                  {product.category}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center text-[10px] text-zinc-500 px-1">
            <div className="flex items-center space-x-2">
              <kbd className="bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-white/40">⌘ K</kbd>
              <span>to find insights</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="opacity-40">ESC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
