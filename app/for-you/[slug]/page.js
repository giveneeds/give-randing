'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import CaseCard from '@/components/landing/CaseCard';
import { ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function CaseDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [settings, setSettings] = useState(DUMMY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      try {
        if (isDummyMode) {
          setItem(null);
          setSettings(DUMMY_SETTINGS);
          return;
        }

        const [caseRes, settingsRes] = await Promise.all([
          supabase.from('case_studies').select('*').eq('slug', slug).single(),
          supabase.from('landing_settings').select('*').single(),
        ]);

        if (caseRes.error) throw caseRes.error;
        setItem(caseRes.data);
        setSettings(settingsRes.data || DUMMY_SETTINGS);

        if (caseRes.data) {
          const { data: relData } = await supabase
            .from('case_studies')
            .select('*')
            .eq('status', 'published')
            .neq('id', caseRes.data.id)
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(3);
          setRelated(relData || []);
        }
      } catch (e) {
        console.error('Failed to load case:', e);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadItem();
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 tracking-[0.3em] uppercase animate-pulse">
          Retrieving Case...
        </div>
      </div>
    );

  if (!item)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 p-6">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4 uppercase">
          404 — Case Missing
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
          요청하신 사례가 존재하지 않거나 공개되지 않았습니다.
        </p>
        <Link
          href="/for-you"
          className="text-xs font-bold text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white pb-1 uppercase tracking-widest"
        >
          Back to For You
        </Link>
      </div>
    );

  const cover = item.cover_url || item.thumbnail_url;

  return (
    <>
      <LandingNavbar settings={settings} />

      <main className="bg-white dark:bg-zinc-950 min-h-screen pb-32 transition-colors duration-300">
        {/* ─── Header ─── */}
        <header className="pt-28 px-6 md:px-12 max-w-screen-lg mx-auto mb-14">
          <Link
            href="/for-you"
            className="inline-flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-12 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold tracking-widest uppercase">For You</span>
          </Link>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {item.category && (
                <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                  {item.category}
                </span>
              )}
              {item.is_featured && (
                <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-black px-2 py-0.5 tracking-tighter rounded-sm uppercase">
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] tracking-tighter text-zinc-900 dark:text-white break-keep">
              {item.title}
            </h1>

            {item.excerpt && (
              <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
                {item.excerpt}
              </p>
            )}

            {/* ─── Meta Row ─── */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-5 border-t border-zinc-100 dark:border-zinc-800">
              {item.client_name && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Client
                  </span>
                  <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                    {item.client_name}
                  </span>
                </div>
              )}
              {item.services && item.services.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Services
                  </span>
                  {item.services.map((s, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full tracking-wide"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ─── Cover Image ─── */}
        {cover && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
            <div className="aspect-[21/9] overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <img
                src={cover}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
              />
            </div>
          </section>
        )}

        {/* ─── Content ─── */}
        <article className="px-6 md:px-12 max-w-screen-md mx-auto">
          {item.content_html ? (
            <div
              className="prose prose-zinc dark:prose-invert prose-lg max-w-none magazine-prose
                         prose-headings:font-black prose-headings:tracking-tighter
                         prose-p:text-zinc-600 dark:prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-8
                         prose-strong:text-zinc-900 dark:prose-strong:text-white prose-strong:font-black
                         prose-img:rounded-xl prose-img:border prose-img:border-zinc-200 dark:prose-img:border-zinc-800 shadow-none"
              dangerouslySetInnerHTML={{ __html: item.content_html }}
            />
          ) : (
            <p className="text-zinc-400 dark:text-zinc-600 text-sm text-center py-12">
              본문이 아직 등록되지 않았습니다.
            </p>
          )}

          {/* ─── Result Summary ─── */}
          {item.result_summary && (
            <div className="mt-16 p-8 md:p-10 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-500/5">
              <span className="text-[10px] font-bold tracking-[0.3em] text-amber-700 dark:text-amber-400 uppercase block mb-3">
                Result
              </span>
              <p className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-white break-keep leading-snug">
                {item.result_summary}
              </p>
            </div>
          )}
        </article>

        {/* ─── Related ─── */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mt-32">
            <div className="flex items-center gap-6 mb-10">
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                Related Cases
              </span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <CaseCard key={r.id} item={r} variant="default" />
              ))}
            </div>
          </section>
        )}
      </main>

      <LandingFooter settings={settings} />
    </>
  );
}
