'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { DUMMY_SERVICE_PRODUCTS, DUMMY_SETTINGS } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle2, Zap, ArrowRightCircle,
  MessageSquare, Star, Cpu, MapPin, 
  Layout, Target, ShieldCheck, FileText, BarChart3
} from 'lucide-react';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';

import AiSolutionBlock from '@/components/ui/AiSolutionBlock';

const iconMap = {
  MessageSquare, Star, Cpu, MapPin, Layout, Target, CheckCircle2
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const services = DUMMY_SERVICE_PRODUCTS;
  const service = useMemo(() => services.find(s => s.slug === slug), [services, slug]);

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">서비스를 찾을 수 없습니다.</h1>
          <button onClick={() => router.push('/service')} className="text-blue-500 font-bold">서비스 목록으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white selection:bg-blue-500 selection:text-white">
      <LandingNavbar settings={DUMMY_SETTINGS} />
      
      <main className="pt-32 pb-40">
        {/* Navigation & Header */}
        <header className="container mx-auto px-4 mb-32">
          <button 
            onClick={() => router.push('/service')}
            className="flex items-center space-x-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-20 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Back to Services</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="max-w-4xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-4 mb-10"
              >
                <span 
                  className="px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase text-white shadow-lg shadow-current/20"
                  style={{ backgroundColor: service.color }}
                >
                  {service.category}
                </span>
                <span className="w-2 h-2 rounded-full bg-zinc-300" />
                <span className="font-black text-zinc-400 text-xs tracking-widest uppercase">
                  {service.detail_title}
                </span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-[8rem] font-black tracking-[-0.05em] mb-12 leading-[0.85] uppercase"
              >
                {service.title}
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-4xl font-bold text-zinc-400 leading-tight"
              >
                {service.desc}
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-shrink-0"
            >
               {service.icon === 'Cpu' ? (
                 <CpuArchitecture text="AI CORE" lineMarkerSize={16} />
               ) : (
                 (() => {
                   const Icon = iconMap[service.icon] || Target;
                   return (
                     <Icon 
                       size={180} 
                       strokeWidth={0.5} 
                       className="opacity-10 dark:opacity-20 animate-pulse" 
                       style={{ color: service.color }}
                     />
                   );
                 })()
               )}
            </motion.div>
          </div>
        </header>

        {/* 1. Onboarding (Process) Section */}
        <section className="container mx-auto px-4 mb-60">
          <div className="flex items-center space-x-6 mb-16">
            <span className="w-16 h-[2px] bg-zinc-900 dark:bg-white" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">
              01/ Onboarding Process
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Intent Insight', desc: '데이터와 시장 흐름을 분석하여 비즈니스의 핵심 결핍을 진단합니다.' },
              { step: '02', title: 'Strategic Setup', desc: '타겟 고객의 심리를 관통하는 초정밀 마케팅 로직을 설계합니다.' },
              { step: '03', title: 'Expert Execution', desc: '기브니즈의 각 분야 전문가들이 최상의 퀄리티로 솔루션을 실행합니다.' },
              { step: '04', title: 'Performance Scale', desc: '성과를 데이터로 증명하고, 다음 성장을 위한 리포트를 발행합니다.' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[3rem] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all group"
              >
                <span className="text-5xl font-black opacity-10 group-hover:opacity-30 transition-opacity mb-8 block" style={{ color: service.color }}>{item.step}</span>
                <h4 className="text-2xl font-black mb-6 uppercase tracking-tighter italic">{item.title}</h4>
                <p className="text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 2. Policy & Regulation Section */}
        <section className="container mx-auto px-4 mb-60">
          <div className="flex items-center space-x-6 mb-16">
            <span className="w-16 h-[2px] bg-zinc-900 dark:bg-white" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">
              02/ Execution Policy
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { icon: ShieldCheck, title: 'Branding Safeguard', desc: '모든 마케팅 집행은 브랜드의 고유한 가치를 훼손하지 않는 범위 내에서 투명하게 진행됩니다.' },
              { icon: FileText, title: 'Quality Standard', desc: '단순한 숫자 채우기가 아닌, 실제 전환으로 이어지는 유의미한 지표와 퀄리티를 최우선으로 합니다.' },
              { icon: Zap, title: 'Real-time Response', desc: '알고리즘 변화나 시장 이슈 발생 시 24시간 이내에 즉각적인 대응 전략을 수립합니다.' },
              { icon: MessageSquare, title: 'Direct Communication', desc: '상시 열려있는 채널을 통해 담당 전문가와 실시간으로 방향성을 조율할 수 있습니다.' }
            ].map((policy, i) => {
              const Icon = policy.icon;
              return (
                <div key={i} className="flex space-x-8 p-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[3.5rem]">
                  <div className="flex-shrink-0 w-16 h-16 bg-white/10 dark:bg-zinc-900/10 rounded-full flex items-center justify-center">
                    <Icon size={32} style={{ color: service.color }} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">{policy.title}</h4>
                    <p className="text-lg opacity-60 font-bold leading-relaxed">{policy.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Reference (Success Cases) */}
        <section className="container mx-auto px-4">
          <div className="flex items-center space-x-6 mb-16">
            <span className="w-16 h-[2px] bg-zinc-900 dark:bg-white" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">
              03/ Success Reference
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { company: 'IT Enterprise A', tag: 'ROAS 450%', desc: '대규모 검색 키워드 최적화를 통해 CPA 30% 절감.' },
              { company: 'Luxury Brand B', tag: 'Top Tier Exp.', 'desc': '글로벌 체험단 운영을 통한 일본 내 인지도 급상승.' },
              { company: 'Food Tech C', tag: 'Viral King', desc: '카페/커뮤니티 확산 전략으로 초기 유입량 5배 폭증.' }
            ].map((ref, i) => (
              <div key={i} className="group relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 rounded-[3.5rem] overflow-hidden p-12 flex flex-col justify-end">
                <div className="absolute top-12 right-12 w-16 h-16 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <BarChart3 size={24} style={{ color: service.color }} />
                </div>
                <div className="relative z-10 transition-transform duration-500 group-hover:-translate-y-4">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-xs font-black mb-6 uppercase" style={{ color: service.color }}>
                    {ref.tag}
                  </span>
                  <h4 className="text-3xl font-black text-zinc-900 dark:text-white mb-6 uppercase italic">
                    {ref.company}
                  </h4>
                  <p className="text-zinc-500 dark:text-zinc-400 font-bold leading-tight line-clamp-2">
                    {ref.desc}
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-200/50 dark:from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic CTA */}
        <div className="container mx-auto px-4 mt-60">
           <AiSolutionBlock />
        </div>
      </main>

      <LandingFooter settings={DUMMY_SETTINGS} />
    </div>
  );
}
