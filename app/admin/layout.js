'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || '로그인에 실패했습니다');
      }
    } catch (e) {
      setError('서버 연결에 실패했습니다');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    router.push('/admin');
  }

  if (isLoading) {
    return (
      <div className="admin-login">
        <div style={{ color: 'var(--admin-text-secondary)' }}>로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(99, 102, 241, 0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form className="admin-login-card" style={{ maxWidth: '420px', width: '100%', padding: '3rem 2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', borderRadius: 'var(--radius-lg)' }} onSubmit={handleLogin}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-md)' }}>✨</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>기브니즈 관리자</h1>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: 'var(--font-size-sm)' }}>계정 정보를 입력하여 로그인하세요.</p>
          </div>
          
          {error && <div className="admin-login-error" style={{ marginBottom: 'var(--space-lg)', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
          
          <div className="form-group" style={{ textAlign: 'left', marginBottom: 'var(--space-md)' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>이메일 아이디</label>
            <input
              type="email"
              className="form-input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="admin@giveneeds.com"
              style={{ padding: '14px 16px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>비밀번호</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: '14px 16px', fontSize: '1rem', borderRadius: 'var(--radius-md)', letterSpacing: '0.1em' }}
              required
            />
          </div>

          <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700, borderRadius: 'var(--radius-md)', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            로그인
          </button>
        </form>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: '📊', label: '대시보드' },
    { href: '/admin/campaigns', icon: '🚀', label: '캠페인(LP) 관리' },
    { href: '/admin/magazine', icon: '📖', label: '매거진 관리' },
    { href: '/admin/sections', icon: '🧩', label: '글로벌 섹션' },
    { href: '/admin/settings', icon: '⚙️', label: '설정' },
  ];

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            ⚡ 기브니즈 Admin
          </div>
          <nav className="admin-nav">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 'var(--space-lg)', marginTop: 'auto' }}>
            <a href="/" target="_blank" className="admin-nav-item">
              <span>🌐</span>
              <span>사이트 보기</span>
            </a>
            <button onClick={handleLogout} className="admin-nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span>🚪</span>
              <span>로그아웃</span>
            </button>
          </div>
        </aside>
        <main className="admin-main">
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  );
}
