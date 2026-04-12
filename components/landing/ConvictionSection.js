'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * ConvictionSection — 3막 스크롤 애니메이션 섹션
 *
 * content shape:
 * {
 *   act1_title: string,    // 1막: 공감 (예: "여러 회사에 문의 해보셨다면...")
 *   act1_sub: string,      // 1막: 부제 (예: "대부분 비슷한 이야기를 한다는 것을.")
 *   act2_lines: string[],  // 2막: 진단 키워드 리스트
 *   act3_lines: string[],  // 3막: 선언문 줄 배열
 * }
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
      '현재 상황에 맞지 않는 미디어 믹스',
      '목표 달성이 아닌',
      '광고 상품을 진행하는 것 자체에 포커싱',
    ],
    act3_lines = [
      '더이상 광고가 그렇게',
      '진행 되어서는 안됩니다.',
      '',
      '맞지 않으면,',
      '하지 않는게 낫습니다.',
      '',
      '필요하지 않다면,',
      '억지로 할 필요가 없습니다.',
    ],
  } = content;

  useGSAP(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    // 모바일: pin 없이 간단한 fade-in
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

    // ── 1막: 공감 텍스트 표시 (이미 보임) → 페이드아웃 ──
    tl.to(act1Ref.current, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.in',
    }, 0.8);

    // ── 구체 확대 시작 ──
    tl.to(sphereRef.current, {
      scale: 2.5,
      opacity: 0.3,
      duration: 2,
      ease: 'power2.inOut',
    }, 0.5);

    // ── 2막: 진단 키워드 한 줄씩 등장 ──
    tl.to(act2Ref.current, { opacity: 1, duration: 0.3 }, 1.0);
    act2LinesRef.current.forEach((el, i) => {
      if (!el) return;
      tl.fromTo(el,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        1.2 + i * 0.25
      );
    });

    // ── 2막 페이드아웃 ──
    tl.to(act2Ref.current, {
      opacity: 0,
      duration: 0.5,
    }, 2.5);

    // ── 구체 더 확대 + 흐려짐 ──
    tl.to(sphereRef.current, {
      scale: 5,
      opacity: 0.08,
      duration: 1.5,
    }, 2.5);

    // ── 3막: 선언문 한 줄씩 등장 ──
    tl.to(act3Ref.current, { opacity: 1, duration: 0.3 }, 3.0);
    act3LinesRef.current.forEach((el, i) => {
      if (!el) return;
      tl.fromTo(el,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        3.2 + i * 0.2
      );
    });

  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 구체 (CSS만으로 구현 — 이미지 불필요) */}
      <div
        ref={sphereRef}
        style={{
          position: 'absolute',
          width: 'min(50vw, 400px)',
          height: 'min(50vw, 400px)',
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 35% 35%, #555 0%, #222 40%, #111 70%, #000 100%)
          `,
          boxShadow: `
            inset -20px -20px 60px rgba(0,0,0,0.8),
            inset 10px 10px 40px rgba(255,255,255,0.05),
            0 0 80px rgba(255,255,255,0.03)
          `,
          filter: 'contrast(1.2) brightness(0.8)',
          zIndex: 1,
        }}
      >
        {/* 구체 텍스처 오버레이 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `
              repeating-conic-gradient(
                from 0deg,
                rgba(255,255,255,0.02) 0deg 2deg,
                transparent 2deg 4deg
              )
            `,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* 1막: 공감 */}
      <div
        ref={act1Ref}
        style={{
          position: 'absolute',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 700,
        }}
      >
        <p
          style={{
            fontSize: 'clamp(18px, 3vw, 32px)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.6,
            letterSpacing: '-0.02em',
            whiteSpace: 'pre-line',
            marginBottom: 16,
          }}
        >
          {act1_title}
        </p>
        <p
          style={{
            fontSize: 'clamp(14px, 2vw, 22px)',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
          }}
        >
          {act1_sub}
        </p>
      </div>

      {/* 2막: 진단 키워드 */}
      <div
        ref={act2Ref}
        style={{
          position: 'absolute',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 24px',
          opacity: 0,
        }}
      >
        {act2_lines.map((line, i) => (
          <p
            key={i}
            ref={el => (act2LinesRef.current[i] = el)}
            style={{
              fontSize: 'clamp(16px, 2.5vw, 28px)',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.8,
              letterSpacing: '-0.01em',
              opacity: 0,
            }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* 3막: 선언문 */}
      <div
        ref={act3Ref}
        style={{
          position: 'absolute',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 800,
          opacity: 0,
        }}
      >
        {act3_lines.map((line, i) => (
          <p
            key={i}
            ref={el => (act3LinesRef.current[i] = el)}
            style={{
              fontSize: line === '' ? '0px' : 'clamp(20px, 3.5vw, 40px)',
              fontWeight: 800,
              color: '#fff',
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
