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
      <LandingNavbar settings={settings} />
      
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

        {/* 5. 매거진 프리뷰 */}
        <section id="magazine" className="px-6 md:px-12 max-w-screen-xl mx-auto mb-32">
          <div className="flex items-center gap-6 mb-16">
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">Magazine Preview</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>
          
          {/* Featured */}
          {featured && (
            <a href={`/magazine/${featured.slug}`} className="group block mb-12 border border-zinc-100 overflow-hidden hover:border-zinc-900 transition-colors">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-[4/3] md:aspect-auto overflow-hidden bg-zinc-50 relative">
                  <img src={featured.thumbnail_url} alt={featured.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                  {featured.is_premium && <span className="absolute top-4 left-4 bg-zinc-900 text-white text-[9px] font-bold px-2 py-1 tracking-tighter">PREMIUM</span>}
                </div>
                <div className="p-12 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">{featured.category}</span>
                    <h2 className="text-3xl font-black tracking-tighter text-zinc-900 mt-4 mb-6">{featured.title}</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">기브니즈가 제안하는 데이터 기반의 최신 마케팅 인사이트를 확인하세요.</p>
                  </div>
                  <div className="flex items-center justify-between pt-8 border-t border-zinc-50 mt-8">
                     <span className="text-xs text-zinc-400">{new Date(featured.created_at).toLocaleDateString('ko-KR')}</span>
                     <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">Read More <MoveRight size={10}/></span>
                  </div>
                </div>
              </div>
            </a>
          )}

          {/* Grid */}
          <div className="grid md:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100 mt-2">
            {rest.map((post) => (
              <MagazineCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* 6. AI 챗봇 유도 섹션 */}
        <section id="chatbot">
          <ChatCTA />
        </section>
      </main>

      <LandingFooter settings={settings} />
    </>
  );
}
