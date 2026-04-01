'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

export default function HomePage() {
  const [magazines, setMagazines] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let magData, setData;
        if (isDummyMode) {
          magData = DUMMY_MAGAZINES;
          setData = DUMMY_SETTINGS;
        } else {
          const [mRes, sRes] = await Promise.all([
            supabase.from('magazines').select('*').order('created_at', { ascending: false }),
            supabase.from('landing_settings').select('*').single(),
          ]);
          magData = mRes.data || [];
          setData = sRes.data || {};
        }
        setMagazines(magData);
        setSettings(setData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-xs text-zinc-400 tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  );

  const featured = magazines[0];
  const rest = magazines.slice(1);

  return (
    <>
      <LandingNavbar settings={settings} />

      <main>
        {/* ─── Hero / Masthead ─── */}
        <section className="pt-40 pb-20 px-6 md:px-12 max-w-screen-xl mx-auto">
          <div className="border-b border-zinc-900 pb-6 mb-12 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                EST. 2025 — MARKETING INTELLIGENCE
              </span>
              <h1 className="text-[clamp(3rem,10vw,9rem)] font-black leading-[0.85] tracking-tighter text-zinc-900 mt-3">
                GIVENEEDS<br/>
                <span className="text-zinc-300">MAGAZINE</span>
              </h1>
            </div>
            <p className="hidden md:block text-sm text-zinc-500 max-w-xs leading-relaxed text-right">
              광고 그 이상의 가치.<br/>
              데이터와 감각의 균형으로<br/>
              실질적인 성장을 증명합니다.
            </p>
          </div>
        </section>

        {/* ─── Featured Article (Full-bleed) ─── */}
        {featured && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-24">
            <a href={`/magazine/${featured.slug}`} className="group block">
              <div className="grid md:grid-cols-2 gap-0 border border-zinc-200 overflow-hidden hover:border-zinc-900 transition-colors duration-300">
                {/* Image */}
                <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-zinc-100">
                  <img
                    src={featured.thumbnail_url}
                    alt={featured.title}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                  />
                  {featured.is_premium && (
                    <span className="absolute top-4 left-4 bg-zinc-900 text-white text-[9px] font-bold px-2.5 py-1 tracking-widest uppercase">
                      PREMIUM
                    </span>
                  )}
                </div>
                {/* Content */}
                <div className="p-10 md:p-16 flex flex-col justify-between bg-white">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                      {featured.category} — FEATURED
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tighter text-zinc-900 mt-4 mb-6">
                      {featured.title}
                    </h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {featured.excerpt || '데이터로 증명한 마케팅 인사이트. 성장하는 브랜드의 비결을 공개합니다.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-100">
                    <span className="text-xs text-zinc-400">
                      {new Date(featured.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 group-hover:gap-3 flex items-center gap-2 transition-all uppercase tracking-widest">
                      Read Article →
                    </span>
                  </div>
                </div>
              </div>
            </a>
          </section>
        )}

        {/* ─── Section Divider ─── */}
        <div className="px-6 md:px-12 max-w-screen-xl mx-auto mb-12">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">Latest Issues</span>
            <div className="flex-1 h-px bg-zinc-200" />
            <a href="/magazine" className="text-[10px] font-bold tracking-[0.3em] text-zinc-900 uppercase hover:text-zinc-500 transition-colors">
              View All →
            </a>
          </div>
        </div>

        {/* ─── Article Grid ─── */}
        {rest.length > 0 && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-32">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
              {rest.map((post, i) => (
                <a key={post.id} href={`/magazine/${post.slug}`}
                  className="group block bg-white p-8 hover:bg-zinc-50 transition-colors duration-200">
                  <div className="aspect-[3/2] overflow-hidden bg-zinc-100 mb-6">
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase mb-3 block">
                    {post.category}
                  </span>
                  <h3 className="text-lg font-bold leading-tight text-zinc-900 mb-4 group-hover:text-zinc-600 transition-colors tracker-tight">
                    {post.title}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900 transition-colors">
                    Read →
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ─── Services Strip ─── */}
        <section className="bg-zinc-900 text-white py-24 px-6 md:px-12 mb-0" id="services">
          <div className="max-w-screen-xl mx-auto">
            <div className="border-b border-zinc-700 pb-8 mb-16 flex items-end justify-between">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">우리가 하는 일</h2>
              <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase hidden md:block">Services</span>
            </div>
            <div className="grid md:grid-cols-3 gap-px bg-zinc-800">
              {[
                { no: '01', title: '퍼포먼스 마케팅', desc: 'Meta, Google 매체 최적화로 ROAS 극대화 및 고객 획득 비용 절감' },
                { no: '02', title: 'CRM 마케팅', desc: '행동 데이터 기반 세그먼트 타겟팅으로 고객 라이프타임 밸류 상승' },
                { no: '03', title: '브랜드 콘텐츠', desc: '고관여 타겟을 매료시키는 영상/디자인 애셋 기획 및 제작' },
              ].map(s => (
                <div key={s.no} className="bg-zinc-900 p-8 md:p-12 hover:bg-zinc-800 transition-colors">
                  <span className="text-[10px] font-bold text-zinc-600 tracking-[0.3em] mb-6 block">{s.no}</span>
                  <h3 className="text-xl font-black tracking-tight mb-4">{s.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-32 px-6 md:px-12 bg-white" id="cta">
          <div className="max-w-screen-xl mx-auto">
            <div className="border border-zinc-200 p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 tracking-[0.3em] uppercase mb-4">Get Started</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900">
                  성장의 파트너가<br/>되어 드립니다.
                </h2>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <a href="https://pf.kakao.com/"
                  className="px-10 py-4 bg-zinc-900 text-white font-bold text-sm hover:bg-black transition-colors uppercase tracking-widest text-center">
                  무료 상담 요청
                </a>
                <a href="/magazine"
                  className="px-10 py-4 border border-zinc-200 text-zinc-600 font-bold text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors uppercase tracking-widest text-center">
                  매거진 보기
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter settings={settings} />
    </>
  );
}
