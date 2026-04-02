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

  const handleCTA = () => {
    // 📺 사용자 요청사항: 헤더 링크 유튜브로 연결
    window.open('https://www.youtube.com/@GIVENEEDS', '_blank');
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
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--foreground)',
                padding: '8px'
              }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}

          {navbar.show_cta !== false && (
            <button onClick={handleCTA} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              상담하기
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
