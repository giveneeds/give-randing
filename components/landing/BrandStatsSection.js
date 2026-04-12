'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BrandStatsSection
 * 레이아웃: 헤드라인(상단) → 카운트업 숫자(하단)
 * - shimmer 텍스트 효과
 * - 통계 숫자 count-up (IntersectionObserver + rAF)
 * - 검은 배경 / 모바일 반응형 / 접근성
 */
export default function BrandStatsSection({ title, subtitle, content = {} }) {
  const {
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
          padding: clamp(80px, 12vw, 180px) clamp(24px, 8vw, 100px);
        }

        /* ── 헤드라인 (상단) ── */
        .bs-headline {
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1.05;
          font-size: clamp(36px, 7vw, 84px);
          margin: 0 0 clamp(80px, 10vw, 160px) 0;
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

        /* ── 카운트업 그리드 (하단) ── */
        .bs-stats-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(60px, 8vw, 80px);
        }
        @media (min-width: 640px) {
          .bs-stats-row {
            grid-template-columns: repeat(${stats.length}, 1fr);
            gap: clamp(40px, 5vw, 80px);
          }
        }

        .bs-stat {
          position: relative;
          width: 100%;
          padding-top: 28px;
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
          font-size: clamp(56px, 10vw, 120px);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #ffffff;
          line-height: 1;
          display: flex;
          align-items: baseline;
          margin-bottom: 16px;
        }
        .bs-suffix {
          font-size: 0.45em;
          font-weight: 700;
          margin-left: 4px;
          color: rgba(255, 255, 255, 0.35);
        }
        .bs-label {
          font-size: clamp(13px, 1.2vw, 16px);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }
        .bs-desc {
          font-size: clamp(13px, 1.2vw, 16px);
          font-weight: 500;
          line-height: 1.6;
          color: #666;
          max-width: 320px;
          word-break: keep-all;
        }

        @media (prefers-reduced-motion: reduce) {
          .bs-fill, .bs-dot { transition: none; }
          .bs-shimmer { animation: none; color: #777; -webkit-text-fill-color: #777; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* 상단: 헤드라인 */}
        <h2 className="bs-headline">
          <span className="bs-line bs-main">{title_main}</span>
          <span className="bs-line bs-shimmer">{title_dim}</span>
        </h2>

        {/* 하단: 카운트업 숫자 */}
        <div className="bs-stats-row">
          {stats.map((s, i) => (
            <BrandStatItem key={i} stat={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandStatItem({ stat, index }) {
  const { value = 0, suffix = '+', label = '', description = '' } = stat || {};
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
      setProgress(100);

      const target = Number(value) || 0;
      let startTs = null;
      const duration = 1200;

      const step = (timestamp) => {
        if (!startTs) startTs = timestamp;
        const progressTime = timestamp - startTs;
        const t = Math.min(progressTime / duration, 1);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(Math.round(target * eased));
        if (t < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => start(), 100);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
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
      {label && <p className="bs-label">{label}</p>}
      <div className="bs-number" role="text" aria-live="polite">
        <span>{formatted}</span>
        {suffix && <span className="bs-suffix">{suffix}</span>}
      </div>
      {description && <p className="bs-desc">{description}</p>}
    </div>
  );
}
