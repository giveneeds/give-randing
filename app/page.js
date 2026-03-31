'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';
import SectionRenderer from '@/components/landing/SectionRenderer';

export default function HomePage() {
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState({});
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let magData, setData, secData;

        if (isDummyMode) {
          magData = DUMMY_MAGAZINES;
          setData = DUMMY_SETTINGS;
          // 메인 홈에 노출할 고정 섹션들 (서비스 소개 등)
          secData = [
            { id: 'home-services', type: 'products', title: 'Our Solutions', subtitle: '기브니즈가 제안하는 독보적인 마케팅 솔루션', content: { items: [
              { category: "DATA", title: "퍼포먼스 마케팅", desc: "데이터 기반의 정교한 타겟팅으로 광고 효율 극대화" },
              { category: "CREATIVE", title: "브랜드 콘텐츠", desc: "고객의 마음을 움직이는 감각적인 비주얼 스토리텔링" }
            ]}}
          ];
        } else {
          const [mRes, sRes, secRes] = await Promise.all([
            supabase.from('magazines').select('*').order('created_at', { ascending: false }),
            supabase.from('landing_settings').select('*').single(),
            supabase.from('global_sections').select('*').eq('is_active', true)
          ]);
          magData = mRes.data || [];
          setData = sRes.data || {};
          secData = secRes.data || [];
        }

        setMagazines(magData);
        setSettings(setData);
        setSections(secData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <>
      <LandingNavbar settings={settings} />
      
      <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Editorial Hero */}
        <header className="mb-20 md:mb-32">
          <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-4 block">
            EST. 2025
          </span>
          <h1 className="text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-8">
            GIVENEEDS<br/>
            MAGAZINE
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl font-medium leading-relaxed">
            광고 그 이상의 가치. 우리는 브랜드의 본질을 탐구하고, 
            데이터와 감각의 완벽한 균형을 통해 실질적인 성장을 증명합니다.
          </p>
        </header>

        {/* Magazine Grid */}
        <section className="mb-32">
          <div className="flex items-center justify-between mb-12 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <h2 className="text-sm font-bold tracking-widest uppercase">Latest Issues</h2>
            <a href="/magazine" className="text-xs font-bold hover:text-primary transition-colors">VIEW ALL</a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {magazines.map(post => (
              <MagazineCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Global Sections (Services, etc.) */}
        {sections.map(section => (
          <div key={section.id} className="mb-32">
            <SectionRenderer
              type={section.type}
              title={section.title}
              subtitle={section.subtitle}
              content={section.content}
            />
          </div>
        ))}
        
        {/* Static Contact CTA */}
        <section className="py-32 bg-zinc-900 text-white rounded-[40px] px-8 text-center" id="cta">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">성장의 파트너가 되어 드립니다.</h2>
          <p className="text-zinc-400 text-lg mb-12 max-w-xl mx-auto">
            지금 바로 무료 마케팅 진단을 신청하고,<br/>
            기브니즈만의 전략 리포트를 받아보세요.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <a href="https://pf.kakao.com/" className="px-10 py-5 bg-primary text-white rounded-full font-bold text-lg hover:scale-105 transition-transform">
              상담 요청하기
            </a>
          </div>
        </section>
      </main>

      <LandingFooter settings={settings} />
    </>
  );
}
