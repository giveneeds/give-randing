'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import CaseDeck from '@/components/landing/CaseDeck';

const UNCATEGORIZED_KEY = '__uncategorized__';
const UNCATEGORIZED_TITLE = '기타';

export default function ForYouPage() {
  const [cases, setCases] = useState([]);
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setCases([]);
          setSettings(DUMMY_SETTINGS);
          setLoading(false);
          return;
        }

        const [cRes, sRes] = await Promise.all([
          supabase
            .from('case_studies')
            .select('*')
            .eq('status', 'published')
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false }),
          supabase.from('landing_settings').select('*').single(),
        ]);

        setCases(cRes.data || []);
        setSettings(sRes.data || DUMMY_SETTINGS);
      } catch (error) {
        console.error('Failed to load case studies:', error);
        setCases([]);
        setSettings(DUMMY_SETTINGS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const sections = useMemo(() => {
    const map = new Map();
    for (const c of cases) {
      const raw = (c.category || '').trim();
      const key = raw || UNCATEGORIZED_KEY;
      if (!map.has(key)) {
        map.set(key, { key, title: raw || UNCATEGORIZED_TITLE, items: [] });
      }
      map.get(key).items.push(c);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.key === UNCATEGORIZED_KEY) return 1;
      if (b.key === UNCATEGORIZED_KEY) return -1;
      return 0;
    });
    return list;
  }, [cases]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-xs text-zinc-400 dark:text-zinc-600 tracking-widest uppercase animate-pulse">
          Loading
        </div>
      </div>
    );

  return (
    <>
      <LandingNavbar settings={settings} />
      <main className="bg-white dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
        {/* ─── Masthead ─── */}
        <section className="pt-28 pb-14 px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
            {/* 영문 라벨(장식) + 한국어 H1 — 검색 키워드는 H1이 담당 */}
            <p className="text-sm font-black tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase mb-3">
              For Client
            </p>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.9] tracking-tighter text-zinc-900 dark:text-zinc-100">
              광고 대행사 기브니즈<br />클라이언트 사례
            </h1>
          </div>
        </section>

        {/* ─── Category Decks ─── */}
        {sections.map(({ key, title, items }) => (
          <CaseDeck key={key} title={title} items={items} />
        ))}

        {cases.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-zinc-400 dark:text-zinc-600 text-sm font-bold uppercase tracking-widest">
              아직 등록된 고객 사례가 없습니다.
            </p>
          </div>
        )}
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
