'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { ArrowLeft, Clock, Share2, Bookmark } from 'lucide-react';
import Link from 'next/link';
import ChatCTA from '@/components/ui/ChatCTA';

export default function MagazineDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      try {
        if (isDummyMode) {
          const mag = DUMMY_MAGAZINES.find(m => m.slug === slug);
          setPost(mag);
        } else {
          const { data, error } = await supabase
            .from('magazines')
            .select('*')
            .eq('slug', slug)
            .single();
          if (error) throw error;
          setPost(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadPost();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-[10px] font-bold text-zinc-400 tracking-[0.3em] uppercase animate-pulse">Retrieving Content...</div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <h1 className="text-4xl font-black tracking-tighter text-zinc-900 mb-4 uppercase">404 - Archive Missing</h1>
      <p className="text-zinc-500 mb-8 text-sm">요청하신 데이터가 기록되지 않았거나 삭제되었습니다.</p>
      <Link href="/" className="text-xs font-bold text-zinc-900 border-b-2 border-zinc-900 pb-1 uppercase tracking-widest">
        Back to Magazine
      </Link>
    </div>
  );

  return (
    <>
      <LandingNavbar />
      
      <main className="bg-white min-h-screen pb-32">
        {/* ─── Hero Header ─── */}
        <header className="pt-40 px-6 md:px-12 max-w-screen-lg mx-auto mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Archive List</span>
          </Link>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                {post.category} — ISSUE 2025.01
              </span>
              {post.is_premium && (
                <span className="bg-zinc-900 text-white text-[9px] font-black px-2 py-0.5 tracking-tighter rounded-sm">PREMIUM</span>
              )}
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] tracking-tighter text-zinc-900">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 border-t border-zinc-100">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200" />
                 <span className="text-xs font-bold text-zinc-900 uppercase tracking-tight">BY {post.author || 'GIVENEEDS Editorial'}</span>
               </div>
               <div className="flex items-center gap-2 text-zinc-400">
                 <Clock size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-widest">
                   {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                 </span>
               </div>
               <div className="flex items-center gap-3 ml-auto">
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><Share2 size={18} /></button>
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><Bookmark size={18} /></button>
               </div>
            </div>
          </div>
        </header>

        {/* ─── Featured Image ─── */}
        <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
          <div className="aspect-[21/9] overflow-hidden bg-zinc-100 rounded-sm shadow-sm border border-zinc-200">
            <img 
              src={post.thumbnail_url} 
              alt={post.title} 
              className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
            />
          </div>
        </section>

        {/* ─── Content ─── */}
        <article className="px-6 md:px-12 max-w-screen-md mx-auto">
          <div 
             className="prose prose-zinc prose-lg max-w-none 
                        prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase 
                        prose-p:text-zinc-600 prose-p:leading-relaxed prose-p:mb-8
                        prose-strong:text-zinc-900 prose-strong:font-black
                        prose-img:rounded-md prose-img:border prose-img:border-zinc-200 shadow-none"
             dangerouslySetInnerHTML={{ __html: post.content_html }}
          />
          
          <ChatCTA />
        </article>
      </main>

      <LandingFooter />
    </>
  );
}
