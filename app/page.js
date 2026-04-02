'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS, DUMMY_SECTIONS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';
import SectionRenderer from '@/components/landing/SectionRenderer';
import ChatCTA from '@/components/ui/ChatCTA';
import BrandAboutSection from '@/components/landing/BrandAboutSection';
import FreeToolsSection from '@/components/landing/FreeToolsSection';
import HeroSection from '@/components/landing/HeroSection';
import { MoveRight } from 'lucide-react';

export default function HomePage() {
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState({});
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setMagazines(DUMMY_MAGAZINES);
          setSettings(DUMMY_SETTINGS);
          setSections(DUMMY_SECTIONS);
          setLoading(false);
          return;
        }

        const [mRes, sRes, secRes] = await Promise.all([
          supabase.from('magazines').select('*').eq('is_active', true).order('created_at', { ascending: false }),
          supabase.from('landing_settings').select('*').single(),
          supabase.from('global_sections').select('*').eq('is_active', true)
        ]);

        const magData = mRes.data?.length > 0 ? mRes.data : DUMMY_MAGAZINES;
        const setData = sRes.data ? {
          brand: sRes.data.brand || DUMMY_SETTINGS.brand,
          cta_global: sRes.data.cta_global || DUMMY_SETTINGS.cta_global,
          seo: sRes.data.seo || DUMMY_SETTINGS.seo,
          navbar: sRes.data.navbar || DUMMY_SETTINGS.navbar,
          footer: sRes.data.footer || DUMMY_SETTINGS.footer
        } : DUMMY_SETTINGS;
        const secData = secRes.data?.length > 0 ? secRes.data : DUMMY_SECTIONS;

        setMagazines(magData);
        setSettings(setData);
        setSections(secData);
      } catch (error) {
        console.error('데이터 로드 실패 (더미 전환):', error);
        setMagazines(DUMMY_MAGAZINES);
        setSettings(DUMMY_SETTINGS);
        setSections(DUMMY_SECTIONS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase animate-pulse">Loading</div>
    </div>
  );

  const featured = magazines[0];
  const rest = magazines.slice(1);

  return (
    <>
      <main className="bg-white">
        {/* 1. HeroSection (Static) */}
        <section id="hero" className="border-b border-zinc-100">
           <HeroSection />
        </section>

        {/* 2. BrandAboutSection (New) */}
        <BrandAboutSection />

        {/* 3. FreeToolsSection (New) */}
        <FreeToolsSection />

        {/* 4. 서비스 요약 (Global Sections 기반) */}
        <section id="services" className="pt-24">
          {sections.map(section => (
            <div key={section.id} className="mb-32">
              <SectionRenderer type={section.type} title={section.title} subtitle={section.subtitle} content={section.content} />
            </div>
          ))}
        </section>

        {/* 5. AI 챗봇 유도 섹션 */}
        <section id="chatbot">
          <ChatCTA />
        </section>
      </main>

      <LandingFooter settings={settings} />
    </>
  );
}
