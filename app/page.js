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
            { 
              id: 2, 
              type: 'services', 
              title: 'Our Services', 
              subtitle: '핵심 마케팅 솔루션', 
              is_active: true,
              content: {
                items: [
                  { title: '퍼포먼스 마케팅', description: '데이터 기반의 효율적인 매체 운영', label: 'Growth' },
                  { title: '브랜딩 기획', description: '지속 가능한 브랜드 아이덴티티 구축', label: 'Brand' },
                  { title: '콘텐츠 제작', description: '고관여 유도를 위한 전문 콘텐츠 제작', label: 'Creative' },
                  { title: '데이터 분석', description: '정교한 성과 추적 및 비즈니스 인사이트', label: 'Data' }
                ]
              }
            }
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
