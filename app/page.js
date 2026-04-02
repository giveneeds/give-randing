'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
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
        if (isDummyMode) {
          setSections([
            { id: 1, type: 'hero', title: '모든 마케팅을 데이터로', subtitle: '기브니즈가 제안하는 데이터 기반 성장 솔루션', is_active: true },
            { id: 2, type: 'services', title: 'Our Services', subtitle: '핵심 마케팅 솔루션', is_active: true }
          ]);
          setSettings(DUMMY_SETTINGS);
          setLoading(false);
          return;
        }

        const [secRes, setRes] = await Promise.all([
          supabase.from('global_sections').select('*').eq('is_active', true).order('order_key'),
          supabase.from('landing_settings').select('*').single()
        ]);

        setSections(secRes.data || []);
        setSettings(setRes.data || DUMMY_SETTINGS);
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
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-400 text-xs tracking-widest uppercase">
        Loading
      </div>
    );
  }

  return (
    <>
      <LandingNavbar settings={settings} />
      <main className="bg-white">
        {sections.map(section => (
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
