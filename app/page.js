'use client';
import { useState, useEffect } from 'react';
import SectionRenderer from '@/components/landing/SectionRenderer';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

export default function HomePage() {
  const [sections, setSections] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sectionsRes, settingsRes] = await Promise.all([
          fetch('/api/sections'),
          fetch('/api/settings')
        ]);

        const sectionsData = await sectionsRes.json();
        const settingsData = await settingsRes.json();

        setSections(sectionsData.sections || []);
        setSettings(settingsData.settings || {});
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTop: '3px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin-slow 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <>
      <LandingNavbar settings={settings} />
      <main>
        {sections.filter(s => s.is_active).map(section => (
          <SectionRenderer
            key={section.id}
            type={section.type}
            title={section.title}
            subtitle={section.subtitle}
            content={section.content}
            settings={settings}
          />
        ))}
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
