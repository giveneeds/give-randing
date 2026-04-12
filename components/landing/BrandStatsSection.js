'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BrandStatsSection
 * 헤드라인(상단) + 카운트업 숫자(하단)
 * 2번 사진 기준: 오렌지 프로그레스바 + 큰 숫자 + 설명
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
    <section className="relative w-full bg-black text-white overflow-hidden">
      {/* 글로벌 keyframes */}
      <style>{`
        @keyframes bs-shine {
          to { background-position: 200% center; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: 'clamp(80px, 12vw, 180px) clamp(24px, 8vw, 100px)',
        }}
      >
        {/* 상단: 헤드라인 */}
        <h2
          style={{
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 1.05,
            fontSize: 'clamp(36px, 7vw, 84px)',
            margin: '0 0 clamp(80px, 10vw, 160px) 0',
            maxWidth: 1400,
          }}
        >
          <span style={{ display: 'block', color: '#ffffff' }}>{title_main}</span>
          <span
            style={{
              display: 'inline-block',
              color: '#555',
              background: 'linear-gradient(to right, #444 20%, #888 40%, #fff 50%, #888 60%, #444 80%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'bs-shine 5s linear infinite',
            }}
          >
            {title_dim}
          </span>
        </h2>

        {/* 하단: 카운트업 숫자 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: stats.length > 1 ? `repeat(${stats.length}, 1fr)` : '1fr',
            gap: 'clamp(40px, 5vw, 80px)',
          }}
        >
          {stats.map((s, i) => (
            <BrandStatItem key={i} stat={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandStatItem({ stat }) {
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
        const t = Math.min((timestamp - startTs) / duration, 1);
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
  }, [value]);

  const formatted = new Intl.NumberFormat('en-US').format(display);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', paddingTop: 32 }}>
      {/* 배경 트랙 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 2,
          background: 'rgba(255,255,255,0.1)',
        }}
      />
      {/* 오렌지 프로그레스 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 2,
          width: `${progress}%`,
          background: '#2563eb',
          transition: 'width 1.2s cubic-bezier(0.19, 1, 0.22, 1)',
        }}
      />
      {/* 오렌지 도트 */}
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: `${progress}%`,
          width: 10,
          height: 10,
          marginLeft: -5,
          background: '#2563eb',
          borderRadius: '50%',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)',
          opacity: progress > 0 ? 1 : 0,
          transition: 'left 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s',
        }}
      />

      {/* 라벨 */}
      {label && (
        <p
          style={{
            fontSize: 'clamp(12px, 1.2vw, 15px)',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 8,
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </p>
      )}

      {/* 숫자 */}
      <div
        style={{
          fontSize: 'clamp(72px, 14vw, 160px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#ffffff',
          lineHeight: 0.9,
          display: 'flex',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <span>{formatted}</span>
        {suffix && (
          <span
            style={{
              fontSize: '0.4em',
              fontWeight: 700,
              marginLeft: 6,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* 설명 */}
      {description && (
        <p
          style={{
            fontSize: 'clamp(13px, 1.2vw, 16px)',
            fontWeight: 500,
            lineHeight: 1.6,
            color: '#666',
            maxWidth: 320,
            wordBreak: 'keep-all',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
