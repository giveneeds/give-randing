'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft, Menu, X, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAGAZINE_CATEGORIES, ALL_CATEGORY } from '@/lib/magazineCategories';

const TABS = [ALL_CATEGORY, ...MAGAZINE_CATEGORIES];

export default function MagazineNavbar({ activeCategory = '', onCategoryChange }) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isMagazineHome = pathname === '/magazine';

  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/magazine';
  };

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 모바일 메뉴 오픈 시 바디 스크롤 잠금
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSelect = (value) => {
    onCategoryChange?.(value);
    setMobileOpen(false);
  };

  return (
    <>
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-100 dark:border-zinc-800/50'
        : 'bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md md:bg-transparent md:backdrop-blur-0'
    }`}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-12 h-16 flex items-center justify-between">
        {/* 좌측: 뒤로가기(모바일) + 로고 */}
        <div className="flex items-center gap-2 md:gap-8">
          {!isMagazineHome && (
            <button
              onClick={handleBack}
              aria-label="뒤로가기"
              className="md:hidden p-2 -ml-2 rounded-lg text-zinc-700 dark:text-zinc-200 active:bg-zinc-100 dark:active:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Link href="/magazine" className="text-sm font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
            GIVENEEDS
          </Link>
          {/* 메인 / we(회사소개) — 모바일에서도 노출 */}
          <Link
            href="/"
            className="text-[10px] md:text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase hover:text-zinc-900 dark:hover:text-white transition-colors px-2 py-1 rounded-md border border-zinc-200 dark:border-white/10 md:border-0 md:px-0 md:py-0"
          >
            we
          </Link>
        </div>

        {/* 데스크탑 — 카테고리 탭 (한국어) */}
        <div className="hidden md:flex items-center gap-1">
          {TABS.map(cat => (
            <button
              key={cat.value || 'all'}
              onClick={() => onCategoryChange?.(cat.value)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-tight transition-all duration-300 break-keep ${
                activeCategory === cat.value
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 우측: 다크모드 + 햄버거(모바일) */}
        <div className="flex items-center gap-1 md:gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-500 dark:text-zinc-400"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="카테고리 메뉴 열기"
            className="md:hidden p-2 -mr-1 rounded-md text-zinc-700 dark:text-zinc-200"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </nav>

    {/* 모바일 햄버거 — 풀스크린 세로 리스트 (불투명 배경 보장) */}
      {mobileOpen && (
        <div
          className="md:hidden flex flex-col bg-white dark:bg-zinc-950"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-100 dark:border-white/5">
            <span className="text-sm font-black tracking-tighter text-zinc-900 dark:text-white">
              MAGAZINE <span className="text-zinc-400">/ 카테고리</span>
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="닫기"
              className="p-2 -mr-1 rounded-md text-zinc-700 dark:text-zinc-200"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 px-6 py-8 flex flex-col">
            <ul className="flex flex-col">
              {TABS.map(cat => {
                const isActive = activeCategory === cat.value;
                return (
                  <li key={cat.value || 'all'} className="border-b border-zinc-100 dark:border-white/5">
                    <button
                      onClick={() => handleSelect(cat.value)}
                      className={`w-full text-left py-4 flex items-center justify-between transition-colors ${
                        isActive
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      <span className={`text-base tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                        {cat.label}
                      </span>
                      {cat.value === '' && (
                        <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">
                          매일 12시 갱신
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-8">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
              >
                <Home size={14} /> 메인 / we로
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
