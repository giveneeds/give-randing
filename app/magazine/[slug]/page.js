'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import LeadForm from '@/components/ui/LeadForm';
import { Clock, Tag, ChevronLeft, Share2 } from 'lucide-react';

export default function MagazineDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        let data;
        if (isDummyMode) {
          data = DUMMY_MAGAZINES.find(m => m.slug === slug);
        } else {
          const { data: magData, error } = await supabase
            .from('magazines')
            .select('*')
            .eq('slug', slug)
            .single();
          if (error) throw error;
          data = magData;
        }
        setPost(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchPost();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center">포스트를 찾을 수 없습니다.</div>;

  const showContent = !post.is_premium || isUnlocked;

  return (
    <>
      <LandingNavbar />
      
      <article className="pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-primary font-bold text-xs mb-12 transition-colors">
          <ChevronLeft size={16} /> BACK TO MAGAZINE
        </a>

        <header className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold tracking-widest uppercase text-zinc-500">
              {post.category}
            </span>
            <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
              <Clock size={12} /> {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tighter mb-8">
            {post.title}
          </h1>

          <div className="flex items-center justify-between py-6 border-y border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200" />
              <div>
                <p className="text-xs font-bold">GIVENEEDS EDITORIAL</p>
                <p className="text-[10px] text-zinc-400">Strategic Research Team</p>
              </div>
            </div>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </header>

        <div className="relative">
          {showContent ? (
            <div 
              className="prose prose-zinc prose-lg dark:prose-invert max-w-none 
                prose-headings:font-black prose-headings:tracking-tighter
                prose-p:leading-relaxed prose-p:text-zinc-600 dark:prose-p:text-zinc-400"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          ) : (
            <div className="relative">
              {/* Blur Overlay for Gated Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 h-[400px] z-10" />
              <div className="opacity-20 blur-sm pointer-events-none select-none h-[400px] overflow-hidden">
                <p className="mb-8">이 콘텐츠는 기브니즈 감사의 프리미엄 리포트입니다. 브랜드의 성장을 위한 핵심 인사이트와 실제 수치 데이터가 포함되어 있습니다. 내용을 확인하시려면 아래 리드 폼을 작성해 주세요.</p>
                <div className="w-full h-32 bg-zinc-100 rounded-2xl mb-8" />
                <p>본문 데이터 및 상세 분석 내용이 이 위치에 표시됩니다...</p>
              </div>

              {/* Lead Form Gate */}
              <div className="relative z-20 -mt-20 flex justify-center">
                <LeadForm 
                  title="Premium Content Unlocked"
                  subtitle="리포트 전체 내용을 확인하시려면 정보를 입력해 주세요."
                  ctaLabel="리포트 읽기"
                  magazineId={post.id}
                />
              </div>
            </div>
          )}
        </div>
      </article>

      <LandingFooter />
    </>
  );
}
