'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BrandStatsSection
 * - shimmer 텍스트 효과 (linear-gradient + background-clip:text, 자동 반복, prefers-reduced-motion 대응)
 * - 통계 숫자 count-up (IntersectionObserver + requestAnimationFrame, ease-out, 1회성)
 * - 검은 배경 / 모바일 반응형 / 접근성 aria-live
 *
 * content shape:
 * {
 *   eyebrow?: string,            // 상단 작은 라벨
 *   title_main?: string,         // 흰색 강조 부분 (예: "We are")
 *   title_dim?: string,          // 어둡게 표시 + shimmer 적용 (예: "brand marketing agency")
 *   stats: [
 *     { value: number, suffix?: string, label?: string, description?: string }
 *   ]
 * }
 */
export default function BrandStatsSection({ title, subtitle, content = {} }) {
  const {
    // eyebrow 제거
    title_main = title || 'We are',
    title_dim = subtitle || 'brand marketing agency',
    stats = [
      { value: 500, suffix: '+', label: '누적 클라이언트', description: '기브니즈와 함께한 500+ 누적 클라이언트입니다.' },
      { value: 95, suffix: '%', label: '고객 만족도', description: '프로젝트 종료 후 고객 만족도 95%를 기록했습니다.' },
    ],
  } = content;

  return (
    <section
      className="bs-section relative w-full bg-black text-white overflow-hidden"
      aria-label={`${title_main} ${title_dim}`.trim()}
    >
      <style jsx>{`
        .bs-section {
          padding: clamp(100px, 15vw, 220px) clamp(24px, 8vw, 100px);
        }
        .bs-headline {
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1.0;
          font-size: clamp(32px, 6vw, 76px); /* 크기 축소 */
          margin: 0;
          max-width: 1400px;
        }
        .bs-headline .bs-line {
          display: block;
        }
        .bs-main {
          color: #ffffff;
        }
        .bs-shimmer {
          display: inline-block;
          color: #555;
          background: linear-gradient(
            to right,
            #444 20%,
            #888 40%,
            #fff 50%,
            #888 60%,
            #444 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: bs-shine 5s linear infinite;
        }
        @keyframes bs-shine {
          to { background-position: 200% center; }
        }
        
        .bs-content-grid {
          display: flex;
          flex-direction: column;
          gap: 80px;
        }
        @media (min-width: 1024px) {
          .bs-content-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            align-items: end;
          }
        }

        .bs-stats-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(60px, 8vw, 100px);
          justify-items: start;
        }
        @media (min-width: 640px) {
          .bs-stats-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 60px;
          }
        }
        @media (min-width: 1024px) {
          .bs-stats-row {
            justify-self: end;
            width: 100%;
          }
        }

        .bs-stat {
          position: relative;
          width: 100%;
          padding-top: 32px;
        }
        .bs-stat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1.5px;
          background: rgba(255, 255, 255, 0.1);
        }

        .bs-track-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1.5px;
        }
        .bs-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 0%;
          background: #f59e0b;
          transition: width 1.2s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .bs-dot {
          position: absolute;
          top: 50%;
          left: 0%;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          margin-top: -5px;
          background: #f59e0b;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.82);
          transition: left 1.2s cubic-bezier(0.19, 1, 0.22, 1);
        }
        
        .bs-number {
          font-size: clamp(72px, 12vw, 160px); /* 크기 대폭 확대 */
          font-weight: 900;
          letter-spacing: -0.05em;
          color: #ffffff;
          line-height: 0.9;
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .bs-suffix {
          font-size: 0.5em;
          font-weight: 800;
          margin-left: 6px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 10px;
        }
        .bs-desc {
          font-size: clamp(14px, 1.5vw, 18px);
          font-weight: 600;
          line-height: 1.5;
          color: #999;
          max-width: 240px;
          word-break: keep-all;
        }

        @media (prefers-reduced-motion: reduce) {
          .bs-fill, .bs-dot { transition: none; }
          .bs-shimmer { animation: none; color: #777; -webkit-text-fill-color: #777; }
        }
      `}</style>

      <div className="bs-inner" style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div className="bs-content-grid">
          <div className="bs-text-side">
            <h2 className="bs-headline">
              <span className="bs-line bs-main">{title_main}</span>
              <span className="bs-line bs-shimmer">{title_dim}</span>
            </h2>
          </div>

          <div className="bs-stats-row">
            {stats.map((s, i) => (
              <BrandStatItem key={i} stat={s} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandStatItem({ stat, index }) {
  const { value = 0, suffix = '+', description = '' } = stat || {};
  const ref = useRef(null);
  const startedRef = useRef(false);
  const [display, setDisplay] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = ref.current;
    if (!node) return;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      
      // 즉각적인 게이지 시작
      setProgress(100);

      const target = Number(value) || 0;
      let startTs = null;
      const duration = 1200; // 빠르게 카운팅

      const step = (timestamp) => {
        if (!startTs) startTs = timestamp;
        const progressTime = timestamp - startTs;
        const t = Math.min(progressTime / duration, 1);
        
        // easeOutExpo (빠르게 시작해서 부드럽게 멈춤)
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(Math.round(target * eased));

        if (t < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // 약간의 지연 후 혹은 즉시 시작 (사용자 경험상 즉시가 좋음)
          setTimeout(() => {
            start();
          }, 100);
          io.disconnect();
        }
      },
      { threshold: 0.1 } // 더 낮은 임계값으로 일찍 시작
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, index]);

  const formatted = new Intl.NumberFormat('en-US').format(display);

  return (
    <div className="bs-stat" ref={ref}>
      <div className="bs-track-wrapper" aria-hidden="true">
        <div className="bs-fill" style={{ width: `${progress}%` }} />
        <div className="bs-dot" style={{ left: `${progress}%`, opacity: progress > 0 ? 1 : 0 }} />
      </div>
      <div
        className="bs-number"
        role="text"
        aria-live="polite"
      >
        <span>{formatted}</span>
        {suffix && <span className="bs-suffix">{suffix}</span>}
      </div>
      {description && <p className="bs-desc">{description}</p>}
    </div>
  );
}

