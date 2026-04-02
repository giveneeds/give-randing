'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';
import { MoveRight } from 'lucide-react';

export default function MagazinePage() {
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (isDummyMode) {
          setMagazines(DUMMY_MAGAZINES);
          setSettings(DUMMY_SETTINGS);
          setLoading(false);
          return;
        }

        const [mRes, sRes] = await Promise.all([
          supabase.from('magazines').select('*').eq('is_active', true).order('created_at', { ascending: false }),
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-xs text-zinc-400 dark:text-zinc-600 tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  );

  const featured = magazines[0];
  const rest = magazines.slice(1);

  return (
    <>
      <LandingNavbar settings={settings} />
      <main className="bg-white dark:bg-zinc-950 transition-colors duration-300">
        {/* ─── Masthead ─── */}
        <section className="pt-40 pb-16 px-6 md:px-12 max-w-screen-xl mx-auto">
          <div className="border-b border-zinc-900 dark:border-zinc-800 pb-6 mb-0 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                EST. 2025 — MARKETING INTELLIGENCE
              </span>
              <h1 className="text-[clamp(3rem,10vw,9rem)] font-black leading-[0.85] tracking-tighter text-zinc-900 dark:text-zinc-100 mt-3">
                GIVENEEDS<br/>
                <span className="text-zinc-300 dark:text-zinc-700">MAGAZINE</span>
              </h1>
            </div>
            <p className="hidden md:block text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed text-right pb-2">
              광고 그 이상의 가치.<br/>
              데이터와 감각의 균형으로<br/>
              실질적인 성장을 증명합니다.
            </p>
          </div>
        </section>

        {/* ─── Featured Article ─── */}
        {featured && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-24 mt-12">
            <a href={`/magazine/${featured.slug}`} className="group block">
              <div className="grid md:grid-cols-2 gap-0 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors duration-300">
                <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                  <img src={featured.thumbnail_url} alt={featured.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                  {featured.is_premium && (
                    <span className="absolute top-4 left-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold px-2.5 py-1 tracking-widest uppercase">PREMIUM</span>
                  )}
                </div>
                <div className="p-10 md:p-16 flex flex-col justify-between bg-white dark:bg-zinc-950">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">{featured.category} — FEATURED</span>
                    <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tighter text-zinc-900 dark:text-zinc-100 mt-4 mb-6">{featured.title}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">데이터로 증명한 마케팅 인사이트. 성장하는 브랜드의 비결을 공개합니다.</p>
                  </div>
                  <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{new Date(featured.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-widest group-hover:gap-4 transition-all">Read Article <MoveRight size={12} /></span>
                  </div>
                </div>
              </div>
            </a>
          </section>
        )}

        {/* ─── Magazine Grid ─── */}
        <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-32">
          <div className="flex items-center gap-6 mb-10">
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">More Issues</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-900" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors">
            {rest.map((post) => (
              <div key={post.id} className="bg-white dark:bg-zinc-950">
                <MagazineCard post={post} />
              </div>
            ))}
          </div>
        </section>
      </main>
      <LandingFooter settings={settings} />
    </>
  );
}
