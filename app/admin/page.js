'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [secRes, setRes] = await Promise.all([
        fetch('/api/sections?all=true'),
        fetch('/api/settings')
      ]);
      const secData = await secRes.json();
      const setData = await setRes.json();
      setSections(secData.sections || []);
      setSettings(setData.settings || {});
    } catch (e) {
      console.error(e);
    }
  }

  const activeSections = sections.filter(s => s.is_active).length;
  const totalSections = sections.length;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">대시보드</h1>
          <p className="admin-subtitle">기브니즈 랜딩 페이지 관리</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
        <div className="admin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🧩</div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--admin-primary)' }}>{totalSections}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}>전체 섹션</div>
        </div>
        <div className="admin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>✅</div>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: '#22c55e' }}>{activeSections}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}>활성 섹션</div>
        </div>
        <div className="admin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🏢</div>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{settings?.brand?.name || '기브니즈'}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}>브랜드</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="admin-card">
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>빠른 액세스</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <a href="/admin/sections" className="admin-btn admin-btn-primary">
            🧩 섹션 관리
          </a>
          <a href="/admin/settings" className="admin-btn admin-btn-secondary">
            ⚙️ 설정
          </a>
          <a href="/" target="_blank" className="admin-btn admin-btn-secondary">
            🌐 사이트 미리보기
          </a>
        </div>
      </div>

      {/* Current Sections */}
      <div className="admin-card" style={{ marginTop: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>현재 섹션 구성</h2>
        {sections.length === 0 ? (
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            아직 등록된 섹션이 없습니다. 섹션 관리에서 새 섹션을 추가하세요.
          </p>
        ) : (
          <div>
            {sections
              .sort((a, b) => a.order_index - b.order_index)
              .map((section, i) => (
                <div key={section.id} className="section-list-item" style={{ cursor: 'default' }}>
                  <span className="section-list-icon" style={{ fontSize: 'var(--font-size-xl)' }}>
                    {section.type === 'hero' ? '🏠' :
                     section.type === 'services' ? '⚡' :
                     section.type === 'resources' ? '📁' :
                     section.type === 'testimonials' ? '💬' :
                     section.type === 'faq' ? '❓' :
                     section.type === 'cta' ? '🎯' :
                     section.type === 'gallery' ? '🖼️' : '📝'}
                  </span>
                  <div className="section-list-info">
                    <div className="section-list-name">{section.title}</div>
                    <div className="section-list-type">{section.type}</div>
                  </div>
                  <span className={`badge ${section.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {section.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
