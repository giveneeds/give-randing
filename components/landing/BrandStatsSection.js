'use client';

import { useEffect, useRef, useState } from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function BrandStatsSection({ title, subtitle, content = {} }) {
  const {
    title_main = title || 'We are',
    title_dim = subtitle || 'brand marketing agency',
    bg_image = '',
    bg_opacity = 0.08,
    stats = [
      { value: 500, suffix: '+', label: '누적 클라이언트', description: '기브니즈와 함께한 500+ 누적 클라이언트입니다.' },
      { value: 95, suffix: '%', label: '고객 만족도', description: '프로젝트 종료 후 고객 만족도 95%를 기록했습니다.' },
    ],
  } = content;

  return (
    <section className="relative w-full bg-white dark:bg-zinc-950 overflow-hidden">

      {/* 배경 이미지 (전체 노출, 투명도로 은은하게) */}
      {bg_image && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: bg_opacity,
            pointerEvents: 'none',
          }}
        >
          <OptimizedImage
            src={bg_image}
            alt=""
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1400,
          margin: '0 auto',
          padding: 'clamp(80px, 12vw, 180px) clamp(24px, 8vw, 100px)',
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 1.15,
            fontSize: 'clamp(36px, 7vw, 84px)',
            margin: '0 0 clamp(80px, 10vw, 160px) 0',
            maxWidth: 1400,
          }}
        >
          <span className="block text-zinc-900 dark:text-white">{title_main}</span>
          <span
            className="inline-block"
            style={{
              background: 'linear-gradient(to right, #bbb 20%, #3b82f6 40%, #60a5fa 50%, #3b82f6 60%, #bbb 80%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title_dim}
          </span>
        </h2>

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
      <div className="absolute top-0 left-0 w-full" style={{ height: 2 }}>
        <div className="w-full h-full bg-zinc-200 dark:bg-white/10" />
      </div>
      {/* 프로그레스 */}
      <div
        className="absolute top-0 left-0"
        style={{
          height: 2,
          width: `${progress}%`,
          background: '#2563eb',
          transition: 'width 1.2s cubic-bezier(0.19, 1, 0.22, 1)',
        }}
      />
      {/* 도트 */}
      <div
        className="absolute"
        style={{
          top: -4,
          left: `${progress}%`,
          width: 10,
          height: 10,
          marginLeft: -5,
          background: '#2563eb',
          borderRadius: '50%',
          boxShadow: '0 0 20px rgba(37, 99, 235, 0.8)',
          opacity: progress > 0 ? 1 : 0,
          transition: 'left 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s',
        }}
      />

      {label && (
        <p className="text-zinc-400 dark:text-white/40" style={{ fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.02em' }}>
          {label}
        </p>
      )}

      <div
        className="text-zinc-900 dark:text-white"
        style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          display: 'flex',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <span>{formatted}</span>
        {suffix && (
          <span className="text-zinc-300 dark:text-white/35" style={{ fontSize: '0.4em', fontWeight: 700, marginLeft: 6 }}>
            {suffix}
          </span>
        )}
      </div>

      {description && (
        <p className="text-zinc-500" style={{ fontSize: 'clamp(13px, 1.2vw, 16px)', fontWeight: 500, lineHeight: 1.6, maxWidth: 320, wordBreak: 'keep-all' }}>
          {description}
        </p>
      )}
    </div>
  );
}
