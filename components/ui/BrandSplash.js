'use client';

import { useEffect, useState } from 'react';
import BrandLoader from './BrandLoader';

/**
 * BrandSplash — 사이트 최초 진입 시 잠깐 뜨는 브랜드 스플래시 화면.
 *  - 세션 단위(sessionStorage)로 1회만 노출 → 라우트 이동마다 뜨지 않음.
 *  - 약 900ms 후 페이드 아웃.
 */
export default function BrandSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('giveneeds_splash_seen')) return;
      sessionStorage.setItem('giveneeds_splash_seen', '1');
    } catch {
      // 무시
    }
    setVisible(true);
    const t1 = setTimeout(() => setFading(true), 900);
    const t2 = setTimeout(() => setVisible(false), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[400] flex items-center justify-center bg-white dark:bg-zinc-950 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <BrandLoader size={96} label="GIVENEEDS" />
    </div>
  );
}
