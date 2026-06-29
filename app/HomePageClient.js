'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS, DUMMY_SECTIONS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import DeferredHomeSections from '@/components/landing/DeferredHomeSections';
import CinematicHeader from '@/components/landing/CinematicHeader';

export default function HomePage() {
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setSettings(DUMMY_SETTINGS);
          setSections(DUMMY_SECTIONS.filter(s => s.is_active));
          setLoading(false);
          return;
        }

        // 실서버 데이터 로드 (실패 시 개별적으로 더미 데이터 폴백)
        const [sRes, secRes] = await Promise.all([
          supabase.from('landing_settings').select('*').single(),
          supabase.from('global_sections').select('*').eq('is_active', true).or('content->_page.is.null,content->>_page.eq.home').order('order_index', { ascending: true })
        ]);
        
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

        setSettings(setData);
        setSections(secData.filter(s => s.is_active));
      } catch (error) {
        console.error('데이터 로드 중 오류 발생 (더미 모드 전환):', error);
        setSettings(DUMMY_SETTINGS);
        setSections(DUMMY_SECTIONS);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);



  return (
    <>
      <LandingNavbar settings={settings} />
      
      <main className="relative z-10 w-full overflow-x-hidden">
        {/* 🔮 Cinematic GSAP Background (Pinnable Section) */}
        <CinematicHeader />

        {/* ─── Global Sections (Content starts after cinematic phase) ─── */}
        <div className="bg-white dark:bg-zinc-950 relative z-20">
          {/* 페이지 H1 — 히어로(GIVENEEDS)는 장식 div, 검색 키워드는 이 한국어 H1이 담당 */}
          <h1 className="text-center text-sm sm:text-base font-bold tracking-tight text-zinc-400 dark:text-zinc-500 pt-12 pb-2 px-4">
            데이터 기반 종합 광고 대행사 기브니즈
          </h1>
          <DeferredHomeSections loading={loading} sections={sections} />
          
          {/* ─── AI 상담 유도 블록 (제거됨 - 상단 AI 전략 섹션이 대체) ─── */}
          
          <LandingFooter settings={settings} />
        </div>
      </main>
    </>
  );
}
