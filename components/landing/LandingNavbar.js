'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function LandingNavbar({ settings }) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const brand = settings?.brand || {};
  const ctaGlobal = settings?.cta_global || {};
  const navbar = settings?.navbar || {};

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;

  const handleCTA = () => {
    if (router) {
      router.push('/contact');
    } else {
      window.location.href = '/contact';
    }
  };

  return (
    <nav className={`navbar-minimal ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container-minimal">
        <a href="/" className="nav-brand-minimal">
          {brand.name || 'GIVENEEDS'}
        </a>
        
        <div className="nav-links-minimal">
          {(navbar.links || []).map((link, i) => (
            <a key={i} href={link.url} className="nav-link-minimal">
              {link.label}
            </a>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-500 dark:text-zinc-400"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          {navbar.show_cta !== false && (
            <button 
              onClick={handleCTA} 
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 rounded-md font-bold text-xs tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              상담하기
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
