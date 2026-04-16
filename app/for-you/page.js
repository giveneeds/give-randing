'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import CaseDeck from '@/components/landing/CaseDeck';

const CATEGORY_SECTIONS = [
  { category: '검색노출', title: '검색 노출', subtitle: 'Search Visibility' },
  { category: '바이럴', title: '바이럴', subtitle: 'Viral' },
];

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

  const grouped = useMemo(() => {
    const map = new Map();
    for (const { category } of CATEGORY_SECTIONS) {
      map.set(category, cases.filter((c) => c.category === category));
    }
    return map;
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
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.9] tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase">
              for client
            </h1>
          </div>
        </section>

        {/* ─── Category Decks ─── */}
        {CATEGORY_SECTIONS.map(({ category, title, subtitle }) => {
          const items = grouped.get(category) || [];
          if (items.length === 0) return null;
          return (
            <CaseDeck
              key={category}
              title={title}
              subtitle={subtitle}
              items={items}
            />
          );
        })}

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
