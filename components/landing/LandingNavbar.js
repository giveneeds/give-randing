'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, X, ArrowLeft, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase, isDummyMode } from '@/lib/supabase';

export default function LandingNavbar({ settings, preview = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (preview) return;
    if (isDummyMode || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [preview]);

  const handleSignOut = async () => {
    if (preview) return;
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileOpen(false);
    window.location.href = '/';
  };
  const isHome = pathname === '/';
  const authRedirect = pathname && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/auth')
    ? pathname
    : '/';
  const loginHref = `/login?redirect=${encodeURIComponent(authRedirect)}`;
  const signupHref = `/signup?redirect=${encodeURIComponent(authRedirect)}`;
  const handleBack = () => {
    if (typeof window === 'undefined') return;
    if (preview) return;
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  };
  const preventPreviewNav = (e) => {
    if (!preview) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const hrefFor = (href) => (preview ? '#' : href);
  
  const brand = settings?.brand || {};
  const ctaGlobal = settings?.cta_global || {};
  // settings를 안 넘기는 페이지(/chat 등)에서도 메뉴가 비지 않도록 폴백 링크 제공
  const DEFAULT_NAV_LINKS = [
    { label: 'we', url: '/#hero' },
    { label: 'do', url: '/service' },
    { label: 'foryou', url: '/for-you' },
    { label: '매거진', url: '/magazine' },
    { label: '문의하기', url: '/contact' },
  ];
  const navbar = settings?.navbar || {};
  const navLinks = (navbar.links && navbar.links.length > 0) ? navbar.links : DEFAULT_NAV_LINKS;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 모바일 메뉴 오픈 시 바디 스크롤 잠금
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
    <nav
      className={`navbar-minimal ${scrolled ? 'scrolled' : ''}`}
      style={preview ? { position: 'sticky', top: 0, left: 'auto', width: '100%', zIndex: 20 } : undefined}
    >
      <div className="container nav-container-minimal px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {!isHome && (
            <button
              onClick={handleBack}
              aria-label="뒤로가기"
              className="md:hidden p-2 -ml-2 rounded-lg text-zinc-700 dark:text-zinc-200 active:bg-zinc-100 dark:active:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <a href={hrefFor('/')} onClick={preventPreviewNav} className="nav-brand-minimal">
            {brand.name || 'GIVENEEDS'}
          </a>
          {/* 모바일 — we(회사소개) 빠른 진입 */}
          <a
            href={hrefFor('/#hero')}
            onClick={preventPreviewNav}
            className="md:hidden text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase px-2 py-1 rounded-md border border-zinc-200 dark:border-white/10 ml-1"
          >
            we
          </a>
        </div>

        <div className="nav-links-minimal">
          {navLinks.map((link, i) => (
            <a key={i} href={hrefFor(link.url)} onClick={preventPreviewNav} className="nav-link-minimal">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => {
              if (preview) return;
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-500 dark:text-zinc-400"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <button
              onClick={handleSignOut}
              className="hidden md:inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-2 font-bold text-xs tracking-widest uppercase transition-colors"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          ) : (
            <>
              <a
                href={hrefFor(loginHref)}
                onClick={preventPreviewNav}
                className="hidden md:inline-flex items-center text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white px-3 py-2 font-bold text-xs tracking-widest uppercase transition-colors"
              >
                로그인
              </a>
              <a
                href={hrefFor(signupHref)}
                onClick={preventPreviewNav}
                className="hidden md:inline-flex bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 rounded-md font-bold text-xs tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                무료 가입
              </a>
            </>
          )}

          {/* 모바일 햄버거 (md 미만에서만) */}
          <button
            onClick={() => {
              if (preview) return;
              setMobileOpen(true);
            }}
            className="md:hidden p-2 -mr-1 rounded-md text-zinc-700 dark:text-zinc-200"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </nav>

    {/* 모바일 메뉴 오버레이 — navbar-minimal의 backdrop-filter가 fixed containing block을 만들어버리는 문제로 nav 바깥으로 분리 */}
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col">
          <div className="flex items-center justify-between px-5 py-5 border-b border-zinc-100 dark:border-white/5">
            <a href={hrefFor('/')} className="text-base font-bold tracking-tight text-zinc-900 dark:text-white" onClick={(e) => { preventPreviewNav(e); setMobileOpen(false); }}>
              {brand.name || 'GIVENEEDS'}
            </a>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 -mr-1 rounded-md text-zinc-700 dark:text-zinc-200"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-6">
            <ul className="flex flex-col">
              {navLinks.map((link, i) => (
                <li key={i} className="border-b border-zinc-100 dark:border-white/5">
                  <a
                    href={hrefFor(link.url)}
                    onClick={(e) => { preventPreviewNav(e); setMobileOpen(false); }}
                    className="block py-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-5 pb-8 pt-2 space-y-2.5">
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-[0.99] transition-transform"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            ) : (
              <>
                <a
                  href={hrefFor(signupHref)}
                  onClick={(e) => { preventPreviewNav(e); setMobileOpen(false); }}
                  className="block text-center w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-[0.99] transition-transform"
                >
                  무료 회원가입
                </a>
                <a
                  href={hrefFor(loginHref)}
                  onClick={(e) => { preventPreviewNav(e); setMobileOpen(false); }}
                  className="block text-center w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-[0.99] transition-transform"
                >
                  로그인
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
