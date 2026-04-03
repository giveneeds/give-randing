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
    // 🎨 1. GIVENEEDS 시네마틱 '뒤로 멀어지기' (원근법)
    gsap.fromTo(heroTextRef.current, 
      { scale: 1, opacity: 1, filter: 'blur(0px)' },
      {
        scale: 0.1,
        opacity: 0,
        filter: 'blur(20px)',
        scrollTrigger: {
          trigger: "main",
          start: "top top",
          end: "150vh",
          scrub: true,
        }
      }
    );

    // 🌟 마지막 단계: 애니메이션이 끝나면 전체 컨테이너 숨기기 (하위 섹션 가독성 확보)
    gsap.to(container.current, {
      autoAlpha: 0,
      scrollTrigger: {
        trigger: "main",
        start: "400vh",
        end: "450vh",
        scrub: true,
      }
    });

    // 🚀 2. 검색 팔레트 '멀리서 다가오기' (투시 효과)
    gsap.fromTo(searchBarRef.current, 
      { scale: 0.7, opacity: 0, y: 10, visibility: 'hidden' },
      { 
        scale: 1, 
        opacity: 1, 
        y: 0,
        visibility: 'visible',
        scrollTrigger: {
          trigger: "main",
          start: "100vh",
          end: "250vh",
          scrub: true,
        }
      }
    );

    // 📋 3. 항목 순차 노출 (리스트업)
    MARKETING_PRODUCTS.forEach((_, index) => {
      const startPos = 250 + index * 100;
      const endPos = 350 + index * 100;

      gsap.fromTo(listItemsRef.current[index],
        { opacity: 0, x: -10, filter: 'blur(5px)' },
        {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          scrollTrigger: {
            trigger: "main",
            start: `${startPos}vh`,
            end: `${startPos + 40}vh`,
            scrub: true,
          }
        }
      );

      ScrollTrigger.create({
        trigger: "main",
        start: `${startPos}vh`,
        end: `${endPos}vh`,
        onToggle: (self) => {
          if (self.isActive) {
            gsap.to(listItemsRef.current[index], {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              transform: 'scale(1.01)',
              duration: 0.4,
            });
          } else {
            gsap.to(listItemsRef.current[index], {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              transform: 'scale(1)',
              duration: 0.4,
            });
          }
        }
      });
    });
  }, { scope: container });

  return (
    <div ref={container} className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-700">
      <div className="relative flex items-center justify-center w-full h-full">
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
                className="group flex items-center justify-between px-3 py-3 rounded-xl border border-transparent transition-all duration-500 transform"
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
