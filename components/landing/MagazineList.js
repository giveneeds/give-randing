'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import MagazineCard from './MagazineCard';

export default function MagazineList({ title, subtitle }) {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setMagazines(data || []);
      } catch (e) {
        console.error('Failed to load magazines for block:', e);
        setMagazines(DUMMY_MAGAZINES);
      } finally {
        setLoading(false);
      }
    }
    loadMagazines();
  }, []);

  if (loading) return null;

  return (
    <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-6 mb-10 md:mb-16">
        <div className="flex-1">
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase block mb-2">Insight Library</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900">{title || 'Latest Articles'}</h2>
        </div>
        <div className="hidden md:block flex-1 h-px bg-zinc-100" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100">
        {magazines.map((post) => (
          <MagazineCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
