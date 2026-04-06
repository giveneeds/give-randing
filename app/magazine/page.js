'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS } from '@/lib/supabase';
import MagazineNavbar from '@/components/landing/MagazineNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';

export default function MagazinePage() {
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setMagazines(DUMMY_MAGAZINES.filter(m => m.is_published !== false));
          setSettings(DUMMY_SETTINGS);
          setLoading(false);
          return;
        }

        const [mRes, sRes] = await Promise.all([
          supabase
            .from('magazines')
            .select('*')
            .eq('status', 'published')
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false }),
          supabase.from('landing_settings').select('*').single()
        ]);

        setMagazines(mRes.data && mRes.data.length > 0 ? mRes.data : DUMMY_MAGAZINES);
        setSettings(sRes.data || DUMMY_SETTINGS);
      } catch (error) {
        console.error('Failed to load magazine data:', error);
        setMagazines(DUMMY_MAGAZINES);
        setSettings(DUMMY_SETTINGS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 카테고리 필터
  const filtered = activeCategory
    ? magazines.filter(m => m.category === activeCategory)
    : magazines;

  // 그리드 배치: Featured(첫번째) + 나머지
  const featured = filtered.find(m => m.is_featured) || filtered[0];
  const rest = filtered.filter(m => m.id !== featured?.id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-xs text-zinc-400 dark:text-zinc-600 tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  );

  return (
    <>
      <MagazineNavbar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <main className="bg-white dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
        {/* ─── Masthead ─── */}
        <section className="pt-28 pb-12 px-6 md:px-12 max-w-screen-xl mx-auto">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-0 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                EST. 2025 — MARKETING INTELLIGENCE
              </span>
              <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-black leading-[0.85] tracking-tighter text-zinc-900 dark:text-zinc-100 mt-3">
                GIVENEEDS<br/>
                <span className="text-zinc-300 dark:text-zinc-700">MAGAZINE</span>
              </h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed md:text-right pb-2">
              광고 그 이상의 가치.<br/>
              데이터와 감각의 균형으로<br/>
              실질적인 성장을 증명합니다.
            </p>
          </div>
        </section>

        {/* ─── Modular Grid ─── */}
        <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
          {filtered.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-zinc-400 dark:text-zinc-600 text-sm font-bold uppercase tracking-widest">
                해당 카테고리의 아카이브가 없습니다.
              </p>
            </div>
          ) : (
            <>
              {/* 메인 그리드: Featured(2x2) + 우측 2개(1x1) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Featured 대형 카드 */}
                {featured && (
                  <div className="md:col-span-2 md:row-span-2">
                    <MagazineCard post={featured} variant="featured" />
                  </div>
                )}
                {/* 우측 첫 번째 */}
                {rest[0] && (
                  <div className="md:col-span-1">
                    <MagazineCard post={rest[0]} variant="default" />
                  </div>
                )}
                {/* 우측 두 번째 */}
                {rest[1] && (
                  <div className="md:col-span-1">
                    <MagazineCard post={rest[1]} variant="default" />
                  </div>
                )}
              </div>

              {/* 하단 그리드: 3칸 (소형 + 소형 + 가로형) */}
              {rest.length > 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {rest[2] && (
                    <div className="md:col-span-1">
                      <MagazineCard post={rest[2]} variant="default" />
                    </div>
                  )}
                  {rest[3] && (
                    <div className="md:col-span-1">
                      <MagazineCard post={rest[3]} variant="default" />
                    </div>
                  )}
                  {rest[4] && (
                    <div className="md:col-span-1">
                      <MagazineCard post={rest[4]} variant="default" />
                    </div>
                  )}
                </div>
              )}

              {/* 나머지 글 (리스트) */}
              {rest.length > 5 && (
                <>
                  <div className="flex items-center gap-6 mt-16 mb-8">
                    <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">More Archives</span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rest.slice(5).map(post => (
                      <div key={post.id}>
                        <MagazineCard post={post} variant="default" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
