'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * ConvictionSection — 3막 스크롤 애니메이션 섹션 (다크/라이트 모드 대응)
 */
export default function ConvictionSection({ content = {} }) {
  const containerRef = useRef(null);
  const sphereRef = useRef(null);
  const act1Ref = useRef(null);
  const act2Ref = useRef(null);
  const act3Ref = useRef(null);
  const act2LinesRef = useRef([]);
  const act3LinesRef = useRef([]);

  const {
    act1_title = '여러 회사에 문의 해보셨다면\n느끼고 계실겁니다.',
    act1_sub = '대부분 비슷한 이야기를 한다는 것을.',
    act2_lines = [
      '현재 상황에 맞지 않는 미디어 믹스,',
      '목표 달성이 아닌',
      '광고 상품을 진행하는 것 자체에 포커싱.'
    ],
    act3_lines = [
      '더이상 광고가 그렇게',
      '진행 되어서는 안됩니다.',
      '',
      '맞지 않으면,',
      '하지 않는게 낫습니다.',
      '',
      '필요하지 않다면,',
      '억지로 할 필요가 없습니다.'
    ],
  } = content;

  useGSAP(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
      gsap.set(sphereRef.current, { scale: 0.6, opacity: 0.7 });
      gsap.set(act1Ref.current, { opacity: 1 });
      gsap.set(act2Ref.current, { opacity: 1 });
      gsap.set(act3Ref.current, { opacity: 1 });
      act2LinesRef.current.forEach(el => el && gsap.set(el, { opacity: 1, y: 0 }));
      act3LinesRef.current.forEach(el => el && gsap.set(el, { opacity: 1, y: 0 }));
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=300%',
        scrub: 1,
        pin: true,
      },
    });

    tl.to(act1Ref.current, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0.8);
    tl.to(sphereRef.current, { scale: 2.5, opacity: 0.3, duration: 2, ease: 'power2.inOut' }, 0.5);

    tl.to(act2Ref.current, { opacity: 1, duration: 0.3 }, 1.0);
    act2LinesRef.current.forEach((el, i) => {
      if (!el) return;
      tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.2 + i * 0.25);
    });

    tl.to(act2Ref.current, { opacity: 0, duration: 0.5 }, 2.5);
    tl.to(sphereRef.current, { scale: 5, opacity: 0.08, duration: 1.5 }, 2.5);

    tl.to(act3Ref.current, { opacity: 1, duration: 0.3 }, 3.0);
    act3LinesRef.current.forEach((el, i) => {
      if (!el) return;
      tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 3.2 + i * 0.2);
    });

  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-white dark:bg-zinc-950 overflow-hidden"
      style={{ minHeight: '100vh', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* 구체 */}
      <div
        ref={sphereRef}
        className="absolute"
        style={{
          width: 'min(50vw, 400px)',
          height: 'min(50vw, 400px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #888 0%, #555 40%, #333 70%, #111 100%)',
          boxShadow: 'inset -20px -20px 60px rgba(0,0,0,0.8), inset 10px 10px 40px rgba(255,255,255,0.05), 0 0 80px rgba(0,0,0,0.1)',
          filter: 'contrast(1.2) brightness(0.8)',
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'repeating-conic-gradient(from 0deg, rgba(128,128,128,0.03) 0deg 2deg, transparent 2deg 4deg)',
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* 1막: 공감 */}
      <div ref={act1Ref} className="absolute z-10 text-center px-6" style={{ maxWidth: 700 }}>
        <p
          className="text-zinc-900 dark:text-white"
          style={{
            fontSize: 'clamp(18px, 3vw, 32px)',
            fontWeight: 700,
            lineHeight: 1.6,
            letterSpacing: '-0.02em',
            whiteSpace: 'pre-line',
            marginBottom: 16,
          }}
        >
          {act1_title}
        </p>
        <p
          className="text-zinc-400 dark:text-white/45"
          style={{ fontSize: 'clamp(14px, 2vw, 22px)', fontWeight: 500, lineHeight: 1.5 }}
        >
          {act1_sub}
        </p>
      </div>

      {/* 2막: 진단 */}
      <div ref={act2Ref} className="absolute z-10 text-center px-6" style={{ opacity: 0 }}>
        {act2_lines.map((line, i) => (
          <p
            key={i}
            ref={el => (act2LinesRef.current[i] = el)}
            className="text-zinc-600 dark:text-white/70"
            style={{
              fontSize: 'clamp(16px, 2.5vw, 28px)',
              fontWeight: 600,
              lineHeight: 1.8,
              letterSpacing: '-0.01em',
              opacity: 0,
            }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* 3막: 선언 */}
      <div ref={act3Ref} className="absolute z-10 text-center px-6" style={{ maxWidth: 800, opacity: 0 }}>
        {act3_lines.map((line, i) => (
          <p
            key={i}
            ref={el => (act3LinesRef.current[i] = el)}
            className="text-zinc-900 dark:text-white"
            style={{
              fontSize: line === '' ? '0px' : 'clamp(20px, 3.5vw, 40px)',
              fontWeight: 800,
              lineHeight: line === '' ? 0.8 : 1.5,
              letterSpacing: '-0.03em',
              marginBottom: line === '' ? 24 : 4,
              opacity: 0,
            }}
          >
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </section>
  );
}
