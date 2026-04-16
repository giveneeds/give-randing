'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import CaseCard from '@/components/landing/CaseCard';

export default function ForYouPage() {
  const [cases, setCases] = useState([]);
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

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

  // 등록된 카테고리 수집 (중복 제거, 공백 제외)
  const categories = useMemo(() => {
    const set = new Set();
    cases.forEach((c) => {
      if (c.category && c.category.trim()) set.add(c.category.trim());
    });
    return Array.from(set);
  }, [cases]);

  const filtered = activeCategory
    ? cases.filter((c) => c.category === activeCategory)
    : cases;

  const featured = filtered.find((c) => c.is_featured) || filtered[0];
  const rest = filtered.filter((c) => c.id !== featured?.id);

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
        <section className="pt-28 pb-12 px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                FOR YOU — CLIENT STORIES
              </span>
              <h1 className="text-[clamp(2.25rem,12vw,7rem)] font-black leading-[0.85] tracking-tighter text-zinc-900 dark:text-zinc-100 mt-3">
                고객 사례<br />
                <span className="text-zinc-300 dark:text-zinc-700">CASE STUDIES</span>
              </h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed md:text-right pb-2">
              숫자로 증명된 결과.<br />
              브랜드와 기브니즈가 함께<br />
              만든 성장의 기록입니다.
            </p>
          </div>
        </section>

        {/* ─── Category Filter ─── */}
        {categories.length > 0 && (
          <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto mb-10">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
                  activeCategory === ''
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                ALL
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
                    activeCategory === cat
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ─── Grid ─── */}
        <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
          {filtered.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-zinc-400 dark:text-zinc-600 text-sm font-bold uppercase tracking-widest">
                {cases.length === 0
                  ? '아직 등록된 고객 사례가 없습니다.'
                  : '해당 카테고리의 사례가 없습니다.'}
              </p>
            </div>
          ) : (
            <>
              {/* 모바일: Featured + 2열 그리드 */}
              <div className="md:hidden space-y-3">
                {featured && <CaseCard item={featured} variant="featured" />}
                {rest.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {rest.map((c) => (
                      <CaseCard key={c.id} item={c} variant="default" />
                    ))}
                  </div>
                )}
              </div>

              {/* 데스크탑: Featured 2x2 + 우측 2개 + 하단 3칸 그리드 */}
              <div className="hidden md:grid grid-cols-3 gap-4 mb-4">
                {featured && (
                  <div className="md:col-span-2 md:row-span-2">
                    <CaseCard item={featured} variant="featured" />
                  </div>
                )}
                {rest[0] && (
                  <div className="md:col-span-1">
                    <CaseCard item={rest[0]} variant="default" />
                  </div>
                )}
                {rest[1] && (
                  <div className="md:col-span-1">
                    <CaseCard item={rest[1]} variant="default" />
                  </div>
                )}
              </div>

              {rest.length > 2 && (
                <div className="hidden md:grid grid-cols-3 gap-4">
                  {rest.slice(2).map((c) => (
                    <div key={c.id}>
                      <CaseCard item={c} variant="default" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
