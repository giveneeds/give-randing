'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { label: 'ALL', value: '' },
  { label: 'INSIGHT', value: 'INSIGHT' },
  { label: 'STRATEGY', value: 'STRATEGY' },
  { label: 'ANALYSIS', value: 'ANALYSIS' },
];

export default function MagazineNavbar({ activeCategory = '', onCategoryChange }) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-100 dark:border-zinc-800/50' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-screen-xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        {/* 좌측: 로고 + 회사소개 링크 */}
        <div className="flex items-center gap-8">
          <Link href="/magazine" className="text-sm font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
            GIVENEEDS
          </Link>
          <Link 
            href="/" 
            className="text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            회사소개
          </Link>
        </div>

        {/* 중앙~우측: 카테고리 탭 */}
        <div className="hidden md:flex items-center gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange?.(cat.value)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                activeCategory === cat.value
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 우측: 다크모드 토글 */}
        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-500 dark:text-zinc-400"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* 모바일 카테고리 (스크롤 시 표시) */}
      <div className="md:hidden overflow-x-auto px-6 pb-3 flex gap-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange?.(cat.value)}
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeCategory === cat.value
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-400 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
