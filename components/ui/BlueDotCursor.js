'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BlueDotCursor
 * - 마우스를 따라다니는 동그란 파란색 점
 * - 터치 시 해당 지점에 점이 잠깐 페이드아웃되며 표시
 * - 모바일/터치 디바이스에서는 hover-following 비활성화, 탭 시점에만 표시
 * - prefers-reduced-motion 대응
 */
export default function BlueDotCursor() {
  const dotRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canHover =
      window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    setEnabled(true);

    const onMove = (e) => {
      if (!dotRef.current) return;
      dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      dotRef.current.style.opacity = '1';
    };

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = '0';
    };

    const onDown = () => {
      if (dotRef.current) dotRef.current.classList.add('bdc-press');
    };
    const onUp = () => {
      if (dotRef.current) dotRef.current.classList.remove('bdc-press');
    };

    const onTouch = (e) => {
      const t = e.touches?.[0] || e.changedTouches?.[0];
      if (!t || !dotRef.current) return;
      dotRef.current.style.transform = `translate3d(${t.clientX}px, ${t.clientY}px, 0) translate(-50%, -50%)`;
      dotRef.current.classList.remove('bdc-touch-anim');
      // reflow trigger
      void dotRef.current.offsetWidth;
      dotRef.current.classList.add('bdc-touch-anim');
    };

    if (canHover) {
      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('mouseleave', onLeave);
      window.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);
    }
    window.addEventListener('touchstart', onTouch, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <style jsx global>{`
        @media (hover: hover) and (pointer: fine) {
          html, body, * {
            cursor: none !important;
          }
        }
      `}</style>
      <style jsx>{`
        .bdc-dot {
          position: fixed;
          top: 0;
          left: 0;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #2563eb;
          box-shadow: 0 0 22px rgba(37, 99, 235, 0.85), 0 0 42px rgba(37, 99, 235, 0.35);
          pointer-events: none;
          z-index: 2147483647;
          opacity: 0;
          transition: opacity 200ms ease, width 140ms ease, height 140ms ease, background 140ms ease;
          will-change: transform, opacity;
        }
        .bdc-press.bdc-dot {
          width: 28px;
          height: 28px;
          background: #1d4ed8;
        }
        .bdc-touch-anim {
          animation: bdc-touch 550ms ease-out forwards;
        }
        @keyframes bdc-touch {
          0% {
            width: 24px;
            height: 24px;
            opacity: 0.95;
          }
          100% {
            width: 44px;
            height: 44px;
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bdc-dot { transition: opacity 100ms linear; }
          .bdc-touch-anim { animation-duration: 220ms; }
        }
      `}</style>
      <div ref={dotRef} className="bdc-dot" aria-hidden="true" />
    </>
  );
}
