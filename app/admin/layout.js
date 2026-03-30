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
        body: JSON.stringify({ password }),
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
      <div className="admin-login">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🔒</div>
          <h1 className="admin-login-title">관리자 로그인</h1>
          <p className="admin-login-subtitle">기브니즈 랜딩 페이지 관리자</p>
          {error && <div className="admin-login-error">{error}</div>}
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호를 입력하세요"
              autoFocus
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%' }}>
            로그인
          </button>
        </form>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: '📊', label: '대시보드' },
    { href: '/admin/sections', icon: '🧩', label: '섹션 관리' },
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
