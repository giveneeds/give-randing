'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import MagazineNavbar from '@/components/landing/MagazineNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import MagazineCard from '@/components/landing/MagazineCard';
import { ArrowLeft, Clock, Share2, Bookmark } from 'lucide-react';
import Link from 'next/link';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';
import LeadForm from '@/components/ui/LeadForm';
import PremiumGateModal from '@/components/ui/PremiumGateModal';
import { useAuth } from '@/lib/useAuth';
import { appendMagazine } from '@/lib/userTrail';

export default function MagazineDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const isLocked = !!post?.is_premium && !user && !authLoading;

  useEffect(() => {
    async function loadPost() {
      try {
        if (isDummyMode) {
          const mag = DUMMY_MAGAZINES.find(m => m.slug === slug);
          setPost(mag);
          // 같은 카테고리의 다른 글
          if (mag) {
            setRelated(DUMMY_MAGAZINES.filter(m => m.category === mag.category && m.id !== mag.id).slice(0, 3));
          }
        } else {
          const { data, error } = await supabase
            .from('magazines')
            .select('*')
            .eq('slug', slug)
            .single();
          if (error) throw error;
          setPost(data);
          // 관련 글 로드
          if (data) {
            const { data: relData } = await supabase
              .from('magazines')
              .select('*')
              .eq('category', data.category)
              .eq('is_published', true)
              .neq('id', data.id)
              .order('sort_order', { ascending: true })
              .limit(3);
            setRelated(relData || []);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadPost();
  }, [slug]);

  // 행동 추적 — 내부 전용, UI에 노출 금지
  useEffect(() => {
    if (post?.slug) {
      appendMagazine({ slug: post.slug, title: post.title, category: post.category });
    }
  }, [post]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 tracking-[0.3em] uppercase animate-pulse">Retrieving Content...</div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 p-6">
      <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4 uppercase">404 - Archive Missing</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">요청하신 데이터가 기록되지 않았거나 삭제되었습니다.</p>
      <Link href="/magazine" className="text-xs font-bold text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white pb-1 uppercase tracking-widest">
        Back to Magazine
      </Link>
    </div>
  );

  return (
    <>
      <MagazineNavbar />
      
      <main className="bg-white dark:bg-zinc-950 min-h-screen pb-32 transition-colors duration-300">
        {/* ─── Hero Header ─── */}
        <header className="pt-28 px-6 md:px-12 max-w-screen-lg mx-auto mb-16">
          <Link href="/magazine" className="inline-flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-12 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Magazine</span>
          </Link>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                {post.category}
              </span>
              {post.is_premium && (
                <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-black px-2 py-0.5 tracking-tighter rounded-sm">PREMIUM</span>
              )}
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1.05] tracking-tighter text-zinc-900 dark:text-white break-keep">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
                {post.excerpt}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" />
                 <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">BY {post.author || 'GIVENEEDS'}</span>
               </div>
               <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                 <Clock size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-widest">
                   {new Date(post.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                 </span>
               </div>
               <div className="flex items-center gap-3 ml-auto">
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Share2 size={18} /></button>
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Bookmark size={18} /></button>
               </div>
            </div>
            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {post.tags.map((tag, i) => (
                  <span key={i} className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ─── Featured Image ─── */}
        <section className="px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
          <div className="aspect-[21/9] overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <img 
              src={post.thumbnail_url} 
              alt={post.title} 
              className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
            />
          </div>
        </section>

        {/* ─── Content ─── */}
        <article className="px-6 md:px-12 max-w-screen-md mx-auto">
          <div className="relative">
            <div
               className="prose prose-zinc dark:prose-invert prose-lg max-w-none magazine-prose
                          prose-headings:font-black prose-headings:tracking-tighter
                          prose-p:text-zinc-600 dark:prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-8
                          prose-strong:text-zinc-900 dark:prose-strong:text-white prose-strong:font-black
                          prose-confirm-img:rounded-xl prose-img:border prose-img:border-zinc-200 dark:prose-img:border-zinc-800 shadow-none"
               style={isLocked ? {
                 maxHeight: '480px',
                 overflow: 'hidden',
                 WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                 maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
               } : undefined}
               dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          </div>
          
          <div className="mt-20 border-t border-zinc-100 dark:border-zinc-800 pt-20">
            <LeadForm 
              title="프리미엄 전략 리포트 신청"
              subtitle="매거진 독자분들을 위해 기브니즈가 엄선한 월간 마케팅 트렌드 리포트를 보내드립니다."
              ctaLabel="리포트 무료로 받기"
              category="magazine"
              magazineId={post.id}
            />
          </div>

          <div className="mt-20">
            <AiSolutionBlock />
          </div>
        </article>

        {/* ─── Related Archives ─── */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 max-w-screen-xl mx-auto mt-32">
            <div className="flex items-center gap-6 mb-10">
              <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">Related Archives</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map(r => (
                <div key={r.id}>
                  <MagazineCard post={r} variant="default" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <LandingFooter />
      {isLocked && <PremiumGateModal slug={slug} />}
    </>
  );
}
