'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS, DUMMY_SECTIONS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';
import SectionRenderer from '@/components/landing/SectionRenderer';
import CinematicHeader from '@/components/landing/CinematicHeader';
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
          setSections(DUMMY_SECTIONS.filter(s => s.is_active));
          setLoading(false);
          return;
        }

        // 실서버 데이터 로드 (실패 시 개별적으로 더미 데이터 폴백)
        const [mRes, sRes, secRes] = await Promise.all([
          supabase.from('magazines').select('*').eq('status', 'published').order('created_at', { ascending: false }),
          supabase.from('landing_settings').select('*').single(),
          supabase.from('global_sections').select('*').eq('is_active', true).order('order_index', { ascending: true })
        ]);

        // 매거진 데이터 (없으면 더미)
        const magData = (mRes.data && mRes.data.length > 0) ? mRes.data : DUMMY_MAGAZINES;
        
        // 설정 데이터 (구조 변환: single row JSON -> 컴포넌트 기대 구조)
        let setData = DUMMY_SETTINGS;
        if (sRes.data) {
          setData = {
            brand: sRes.data.brand || DUMMY_SETTINGS.brand,
            cta_global: sRes.data.cta_global || DUMMY_SETTINGS.cta_global,
            seo: sRes.data.seo || DUMMY_SETTINGS.seo,
            navbar: sRes.data.navbar || DUMMY_SETTINGS.navbar,
            footer: sRes.data.footer || DUMMY_SETTINGS.footer
          };
        }

        // DB에 있는 섹션들을 그대로 사용하고 없으면 더미 사용
        let secData = DUMMY_SECTIONS;
        if (secRes.data && secRes.data.length > 0) {
          secData = secRes.data;
        }

        setMagazines(magData);
        setSettings(setData);
        setSections(secData.filter(s => s.is_active));
      } catch (error) {
        console.error('데이터 로드 중 오류 발생 (더미 모드 전환):', error);
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-700">
      <div className="text-xs text-zinc-400 tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  );

  const featured = magazines[0];
  const rest = magazines.slice(1);

  return (
    <>
      <LandingNavbar settings={settings} />
      
      <main className="relative z-10 w-full overflow-x-hidden">
        {/* 🔮 Cinematic GSAP Background (Pinnable Section) */}
        <CinematicHeader />

        {/* ─── Global Sections (Content starts after cinematic phase) ─── */}
        <div className="bg-white dark:bg-zinc-950 relative z-20">
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
          
          {/* ─── AI 상담 유도 블록 (제거됨 - 상단 AI 전략 섹션이 대체) ─── */}
          
          <LandingFooter settings={settings} />
        </div>
      </main>
    </>
  );
}
