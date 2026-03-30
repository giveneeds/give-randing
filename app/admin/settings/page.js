'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveSettingKey(key) {
    setSaving(true);
    setSavedKey('');
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] }),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(''), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  const updateSetting = (key, field, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', color: 'var(--admin-text-secondary)' }}>로딩 중...</div>;

  const brand = settings.brand || {};
  const ctaGlobal = settings.cta_global || {};
  const seo = settings.seo || {};
  const footer = settings.footer || {};

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">설정</h1>
          <p className="admin-subtitle">랜딩 페이지 전체 설정을 관리하세요</p>
        </div>
      </div>

      {/* Brand Settings */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>🏢 브랜드 정보</h2>
          <button className="admin-btn admin-btn-primary btn-sm" onClick={() => saveSettingKey('brand')} disabled={saving}>
            {savedKey === 'brand' ? '✅ 저장됨' : '💾 저장'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">회사명</label>
          <input className="form-input" value={brand.name || ''} onChange={e => updateSetting('brand', 'name', e.target.value)} placeholder="기브니즈" />
        </div>
        <div className="form-group">
          <label className="form-label">태그라인</label>
          <input className="form-input" value={brand.tagline || ''} onChange={e => updateSetting('brand', 'tagline', e.target.value)} placeholder="마케팅의 새로운 기준" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">주 색상</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <input type="color" value={brand.primary_color || '#6366f1'} onChange={e => updateSetting('brand', 'primary_color', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
              <input className="form-input" value={brand.primary_color || '#6366f1'} onChange={e => updateSetting('brand', 'primary_color', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">악센트 색상</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <input type="color" value={brand.accent_color || '#a78bfa'} onChange={e => updateSetting('brand', 'accent_color', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
              <input className="form-input" value={brand.accent_color || '#a78bfa'} onChange={e => updateSetting('brand', 'accent_color', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">로고 URL</label>
          <input className="form-input" value={brand.logo_url || ''} onChange={e => updateSetting('brand', 'logo_url', e.target.value)} placeholder="https://..." />
          <p className="form-hint">로고 이미지의 URL을 입력하세요 (선택사항)</p>
        </div>
      </div>

      {/* CTA Settings */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>🎯 CTA 설정</h2>
          <button className="admin-btn admin-btn-primary btn-sm" onClick={() => saveSettingKey('cta_global')} disabled={saving}>
            {savedKey === 'cta_global' ? '✅ 저장됨' : '💾 저장'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">카카오톡 채널 URL</label>
          <input className="form-input" value={ctaGlobal.kakao_url || ''} onChange={e => updateSetting('cta_global', 'kakao_url', e.target.value)} placeholder="https://pf.kakao.com/..." />
          <p className="form-hint">카카오톡 채널 URL (플러스친구)</p>
        </div>
        <div className="form-group">
          <label className="form-label">전화번호</label>
          <input className="form-input" value={ctaGlobal.phone || ''} onChange={e => updateSetting('cta_global', 'phone', e.target.value)} placeholder="010-1234-5678" />
        </div>
        <div className="form-group">
          <label className="form-label">외부 링크</label>
          <input className="form-input" value={ctaGlobal.external_url || ''} onChange={e => updateSetting('cta_global', 'external_url', e.target.value)} placeholder="https://..." />
          <p className="form-hint">예약 페이지, 포트폴리오 등 외부 링크</p>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>🔍 SEO 설정</h2>
          <button className="admin-btn admin-btn-primary btn-sm" onClick={() => saveSettingKey('seo')} disabled={saving}>
            {savedKey === 'seo' ? '✅ 저장됨' : '💾 저장'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">페이지 제목</label>
          <input className="form-input" value={seo.title || ''} onChange={e => updateSetting('seo', 'title', e.target.value)} placeholder="기브니즈 | 마케팅 대행사" />
        </div>
        <div className="form-group">
          <label className="form-label">페이지 설명</label>
          <textarea className="form-input form-textarea" value={seo.description || ''} onChange={e => updateSetting('seo', 'description', e.target.value)} placeholder="브랜드 성장을 위한 전략적 마케팅 파트너" />
        </div>
        <div className="form-group">
          <label className="form-label">OG 이미지 URL</label>
          <input className="form-input" value={seo.og_image || ''} onChange={e => updateSetting('seo', 'og_image', e.target.value)} placeholder="https://..." />
          <p className="form-hint">SNS에서 공유될 때 표시되는 미리보기 이미지</p>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>📋 푸터 설정</h2>
          <button className="admin-btn admin-btn-primary btn-sm" onClick={() => saveSettingKey('footer')} disabled={saving}>
            {savedKey === 'footer' ? '✅ 저장됨' : '💾 저장'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">저작권 문구</label>
          <input className="form-input" value={footer.copyright || ''} onChange={e => updateSetting('footer', 'copyright', e.target.value)} placeholder="© 2025 기브니즈. All rights reserved." />
        </div>
      </div>
    </div>
  );
}
