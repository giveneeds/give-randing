'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { DUMMY_SECTIONS, DUMMY_SETTINGS } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Zap, ArrowRightCircle } from 'lucide-react';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const serviceSection = DUMMY_SECTIONS.find(s => s.id === 'sec-product-detail');
  const services = serviceSection?.content?.items || [];
  const service = useMemo(() => services.find(s => s.slug === slug), [services, slug]);

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">서비스를 찾을 수 없습니다.</h1>
          <button onClick={() => router.push('/service')} className="text-blue-500 font-bold">서비스 목록으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-blue-500 selection:text-white">
      <LandingNavbar settings={DUMMY_SETTINGS} />
      
      <main className="pt-32 pb-24">
        {/* Navigation & Header */}
        <div className="container mx-auto px-4 mb-20">
          <button 
            onClick={() => router.push('/service')}
            className="flex items-center space-x-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-12 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">서비스 목록으로 돌아가기</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase mb-6 text-white"
                style={{ backgroundColor: service.color }}
              >
                {service.detail_title}
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-none"
              >
                {service.title}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-3xl font-bold text-zinc-500 dark:text-zinc-400 tracking-tight"
              >
                {service.detail_desc}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Hero Visual Area */}
        <div className="container mx-auto px-4 mb-32">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="relative h-[400px] md:h-[600px] rounded-[3.5rem] overflow-hidden flex items-center justify-center"
             style={{ backgroundColor: `${service.color}10` }}
           >
             <div className="absolute inset-0 opacity-30 pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-transparent via-white/5 to-transparent dark:via-zinc-800/10" />
             </div>
             
             {service.icon === 'Cpu' ? (
                <div className="w-full max-w-[800px] transform scale-110">
                  <CpuArchitecture text="AI STRATEGY" lineMarkerSize={24} />
                </div>
             ) : (
                <service.icon 
                  size={400} 
                  strokeWidth={0.5} 
                  className="relative z-10 text-zinc-900 dark:text-white opacity-20 dark:opacity-40 transform -rotate-12" 
                  style={{ color: service.color }}
                />
             )}

             <div className="absolute bottom-12 left-12 right-12 flex flex-wrap gap-4 justify-center">
                 {service.detail_desc.split(',').map((tag, i) => (
                   <span key={i} className="px-6 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 rounded-2xl font-bold text-lg shadow-xl">
                      {tag.trim()}
                   </span>
                 ))}
             </div>
           </motion.div>
        </div>

        {/* Detailed Content */}
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-20">
          <div className="md:col-span-2 space-y-20">
            {/* 핵심 가치 */}
            <section>
              <h3 className="text-3xl font-black tracking-tighter mb-10 flex items-center space-x-3">
                <div className="w-2 h-8 bg-blue-500 rounded-full" style={{ backgroundColor: service.color }} />
                <span>솔루션 개요</span>
              </h3>
              <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                {service.detail_sub} 기브니즈의 {service.title} 솔루션은 단순히 실행 지표를 달성하는 것에 멈추지 않습니다. 
                비즈니스의 지속 가능한 성장을 위해 시장의 흐름을 읽고, 타겟의 결핍을 찾아 최적의 인터랙션을 설계합니다.
              </p>
            </section>

            {/* 프로세스 (더미) */}
            <section>
              <h3 className="text-3xl font-black tracking-tighter mb-10 flex items-center space-x-3">
                <div className="w-2 h-8 bg-blue-500 rounded-full" style={{ backgroundColor: service.color }} />
                <span>진행 프로세스</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { step: '01', title: '인텐트 분석', desc: '고객의 구매 의도와 시장 내 경쟁 구조를 정밀하게 분석합니다.' },
                  { step: '02', title: '맞춤형 설계', desc: '분석된 데이터를 기반으로 최적의 성과를 낼 수 있는 전략을 수립합니다.' },
                  { step: '03', step: '03', title: '정교한 실행', desc: '각 분야의 전문가들이 협업하여 초격차 퀄리티의 결과물을 만들어냅니다.' },
                  { step: '04', title: '최적화 및 리포트', desc: '실행 결과를 실시간으로 모니터링하고 다음 스택을 제안합니다.' }
                ].map((item, i) => (
                  <div key={i} className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 group hover:border-zinc-300 dark:hover:border-white/20 transition-all">
                    <span className="text-4xl font-black opacity-10 mb-6 block" style={{ color: service.color }}>{item.step}</span>
                    <h4 className="text-xl font-black mb-4">{item.title}</h4>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Area (Why Giveneeds) */}
          <div className="space-y-8">
            <div className="sticky top-32 p-10 rounded-[2.5rem] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
               <Zap className="mb-6 animate-pulse" style={{ color: service.color }} />
               <h3 className="text-2xl font-black mb-6 tracking-tighter">Why GIVENEEDS?</h3>
               <ul className="space-y-6">
                 {[
                   '데이터 기반의 의사결정',
                   '업계 최고의 시각적 퀄리티',
                   '실시간 성과 모니터링',
                   '비즈니스 무한 스케일업'
                 ].map((txt, i) => (
                   <li key={i} className="flex items-center space-x-3 font-bold text-sm">
                      <CheckCircle2 size={18} style={{ color: service.color }} />
                      <span>{txt}</span>
                   </li>
                 ))}
               </ul>
               <button 
                onClick={() => window.open('https://www.youtube.com/@GIVENEEDS', '_blank')}
                className="w-full mt-12 py-5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black text-lg transition-transform hover:scale-[1.03]"
               >
                 상담하기
               </button>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter settings={DUMMY_SETTINGS} />
    </div>
  );
}
