'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import MagazineCard from './MagazineCard';
import BrandLoader from '@/components/ui/BrandLoader';

export default function MagazineList({ title, subtitle, limit = 4, showMoreLink = true, preview = false, previewData = {}, content = {} }) {
  const previewMagazines = Array.isArray(previewData.magazines)
    ? previewData.magazines
    : Array.isArray(content.magazines)
      ? content.magazines
      : [];
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    if (preview) return;
    async function loadMagazines() {
      try {
        if (isDummyMode) {
          setMagazines(DUMMY_MAGAZINES);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('magazines')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setMagazines(data || []);
      } catch (e) {
        console.error('Failed to load magazines for block:', e);
        setMagazines(DUMMY_MAGAZINES.slice(0, limit));
      } finally {
        setLoading(false);
      }
    }
    loadMagazines();
  }, [limit, preview]);

  if (!preview && loading) {
    return (
      <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto py-20 flex justify-center">
        <BrandLoader size={64} label="MAGAZINE" />
      </section>
    );
  }

  const visible = (preview ? previewMagazines : magazines).slice(0, limit);

  return (
    <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-6 mb-10 md:mb-16">
        <div className="flex-1">
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase block mb-2">Insight Library</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">{title || 'Latest Articles'}</h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">{subtitle}</p>
          )}
        </div>
        <div className="hidden md:block flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {visible.map((post) => (
          <MagazineCard key={post.id} post={post} />
        ))}
      </div>

      {showMoreLink && (
        <div className="mt-10 md:mt-14 flex justify-center md:justify-end">
          <Link
            href={preview ? '#' : '/magazine'}
            onClick={preview ? (e) => e.preventDefault() : undefined}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-colors"
          >
            더 많은 매거진 보러가기
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}
