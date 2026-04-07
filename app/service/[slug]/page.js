'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Clock, LayoutGrid, CheckCircle2, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ServiceDetailPage({ params }) {
  const { slug } = use(params);
  const router = useRouter();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/services`);
        const data = await res.json();
        const found = data.find(s => s.slug === slug);
        if (found) setService(found);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-white" />;
  if (!service) return <div className="min-h-screen flex items-center justify-center">Service not found.</div>;

  const details = service.details || {};
  const blocks = details.blocks || [];

  // 마크다운 기호(**bold** 등)를 처리하는 인라인 렌더러
  const renderInline = (text) => {
    if (typeof text !== 'string') return text;
    // **텍스트** → <strong>, 나머지 기호들 제거
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-zinc-900">{part.slice(2, -2)}</strong>;
      }
      // 남은 *, _, ` 등 기호 제거
      return part.replace(/[*_`~]/g, '');
    });
  };

  // Rendering logic for text content
  const renderContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        const content = line.trim().substring(2);
        return (
          <div key={i} className="flex gap-2 mb-2 pl-2">
            <span className="text-zinc-400 mt-1.5 flex-shrink-0">•</span>
            <span className="text-zinc-600 font-medium leading-relaxed">{renderInline(content)}</span>
          </div>
        );
      }
      if (!line.trim()) return <div key={i} className="mb-2" />;
      return (
        <p key={i} className="mb-4 text-zinc-600 font-medium leading-relaxed">
          {renderInline(line)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-32 pb-40">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Navigation */}
        <Link 
          href="/service" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12 font-bold text-sm uppercase tracking-widest group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to list
        </Link>

        {/* Hero Block */}
        <header className="mb-16 bg-white p-10 md:p-16 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <span className="px-4 py-1.5 bg-zinc-900 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
               {service.category}
             </span>
             {service.is_active === false && (
               <span className="px-3 py-1 bg-red-50 text-red-500 rounded text-[10px] font-black uppercase tracking-widest">
                 Admin Hidden
               </span>
             )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase italic leading-[1.1]">
            {service.title}
          </h1>
          <p className="text-xl md:text-2xl font-bold text-zinc-400 max-w-3xl leading-snug">
            {service.subtitle}
          </p>
        </header>

        {/* Items Blocks */}
        <div className="space-y-10">
          {blocks.length > 0 ? (
            blocks.map((block, idx) => (
              <motion.section 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-10 md:p-16 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:border-zinc-200 transition-all"
              >
                <h2 className="text-xl font-black uppercase tracking-tight mb-10 flex items-center gap-3 italic">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm not-italic group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  {block.label}
                </h2>
                <div className="prose prose-zinc max-w-none">
                  {renderContent(block.content)}
                </div>
              </motion.section>
            ))
          ) : (
            <section className="bg-white p-16 rounded-[2.5rem] border border-zinc-100 text-center">
              <p className="text-zinc-400 font-bold">상세 데이터를 준비 중입니다.</p>
            </section>
          )}

          {/* Centralized Small CTA Button */}
          <div className="mt-20 flex justify-center">
            <Link 
              href="https://pf.kakao.com/_Rxfuxbxj"
              target="_blank"
              className="px-14 py-5 bg-zinc-900 text-white rounded-full font-black text-lg uppercase tracking-tight hover:bg-zinc-800 transition-all shadow-xl flex items-center gap-3"
            >
              상담하기
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
