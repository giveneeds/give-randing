'use client';

import { useState, useEffect } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { DUMMY_SETTINGS } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';

const SECTORS = [
  {
    id: 'ADS',
    title: 'VIRAL MARKETING',
    badge: 'V',
    desc: '단순 배포가 아닌 상위 노출과 고관여 타겟의 유입을 목적으로 하는 전략적 입소문 시스템',
    bg: 'bg-[#1E4181]',
    text: 'text-white',
    hoverBg: 'hover:bg-[#152e5d]',
    borderColor: 'border-[#1E4181]',
  },
  {
    id: 'GROWTH',
    title: 'REVIEW MANAGEMENT',
    badge: 'R',
    desc: '부정적 여론 방어와 진정성 있는 리뷰 축적으로 전환율 최대화',
    bg: 'bg-[#16A34A]',
    text: 'text-white',
    hoverBg: 'hover:bg-[#117a37]',
    borderColor: 'border-[#16A34A]',
  },
  {
    id: 'LOCAL',
    title: 'LOCAL SEO',
    badge: 'L',
    desc: '스토어, 플레이스, 070, 카카오맵 — 지역 기반 검색 최상단 선점 토탈 솔루션',
    bg: 'bg-zinc-900',
    text: 'text-white',
    hoverBg: 'hover:bg-zinc-800',
    borderColor: 'border-zinc-900',
  },
  {
    id: 'TECH',
    title: 'TECH & CREATIVE',
    badge: 'T',
    desc: 'AI 자동화, 프리미엄 웹사이트 — 기술과 크리에이티브의 결합으로 브랜드 가치 극대화',
    bg: 'bg-zinc-100',
    text: 'text-zinc-900',
    hoverBg: 'hover:bg-zinc-50',
    borderColor: 'border-zinc-300',
  },
];



export default function ServicePage() {
  const [services, setServices] = useState([]);
  const [comingSoonModal, setComingSoonModal] = useState(null);

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        const active = Array.isArray(data) ? data.filter(s => s.is_active) : [];
        setServices(active);
      })
      .catch(() => setServices([]));
  }, []);

  const groupedServices = SECTORS.map(sector => ({
    ...sector,
    items: services.filter(s => s.category === sector.id)
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 selection:bg-blue-500 selection:text-white">
      <LandingNavbar settings={DUMMY_SETTINGS} />
      
      <main className="pt-32 pb-40">
        {/* Page Header */}
        <header className="container mx-auto px-4 mb-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-[clamp(3rem,12vw,5rem)] md:text-[10rem] font-black tracking-[-0.05em] text-zinc-900 dark:text-white leading-[0.85] uppercase mb-12">
              Our<br />
              Services
            </h1>
            <p className="text-xl md:text-3xl font-bold text-zinc-400 max-w-3xl leading-snug">
              기브니즈는 데이터와 미학, 그리고 기술의 정점에서 당신의 비즈니스를 위한 최적의 성장을 설계합니다.
            </p>
          </motion.div>
        </header>

        {/* Sectors & Grid Tiles */}
        <div className="space-y-48">
          {groupedServices.map((sector, sIdx) => (
            <section key={sector.id} className="container mx-auto px-0 md:px-4">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="px-4 md:px-0 mb-12 border-b-2 border-zinc-900 dark:border-white pb-6"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-3">
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">
                    {sector.title}
                  </h2>
                  <span className="text-zinc-400 font-black text-lg tracking-widest mt-4 md:mt-0 uppercase">
                    [{sector.items.length}] Products
                  </span>
                </div>
                {sector.desc && (
                  <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium max-w-2xl mt-3">
                    {sector.desc}
                  </p>
                )}
              </motion.div>


              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-l border-zinc-200 dark:border-zinc-800">
                {sector.items.map((service, iIdx) => {
                  const isComingSoon = service?.details?.status === 'coming_soon';
                  const cardInner = (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: (iIdx * 0.05), duration: 0.5 }}
                      className={`
                        aspect-square md:aspect-[4/3] lg:aspect-square p-4 sm:p-10 flex flex-col justify-between transition-all duration-700
                        border-r border-b border-zinc-200 dark:border-zinc-800 relative z-0 overflow-hidden
                        ${sector.bg} ${sector.text || 'text-white'}
                        group-hover:z-10 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]
                      `}
                    >
                      {isComingSoon && (
                        <span className="absolute top-2 right-2 sm:top-4 sm:right-4 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/15 backdrop-blur rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Sparkles size={10} /> Coming Soon
                        </span>
                      )}
                      <div className="flex justify-between items-start">
                        <span className="text-sm sm:text-lg font-black opacity-30 group-hover:opacity-100 transition-opacity">
                          0{iIdx + 1}
                        </span>
                        {!isComingSoon && (
                          <div className="w-10 h-10 border-2 border-current rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                            <ArrowRight size={20} />
                          </div>
                        )}
                      </div>

                      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex flex-col min-h-0">
                        <h3 className="text-lg sm:text-3xl md:text-4xl font-black leading-[1] tracking-tighter mb-3 sm:mb-4 group-hover:mb-5 transition-all">
                          {service.title.split(' ').map((word, idx) => (
                            <span key={idx} className="block">{word}</span>
                          ))}
                        </h3>
                        <p className="text-xs font-medium opacity-0 group-hover:opacity-80 leading-snug transition-opacity duration-700 delay-100">
                          {service.subtitle || service.description}
                        </p>
                      </div>
                    </motion.div>
                  );

                  if (isComingSoon) {
                    return (
                      <button
                        key={service.slug}
                        type="button"
                        onClick={() => setComingSoonModal(service)}
                        className="group no-underline text-left"
                      >
                        {cardInner}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={service.slug}
                      href={`/service/${service.slug}`}
                      className="group no-underline"
                    >
                      {cardInner}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom AI CTA Block */}
        <div className="container mx-auto px-4 mt-60">
          <AiSolutionBlock />
        </div>
      </main>

      <LandingFooter settings={DUMMY_SETTINGS} />

      {/* Coming Soon Popup */}
      <AnimatePresence>
        {comingSoonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setComingSoonModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-10 md:p-14 max-w-lg w-full text-center shadow-2xl relative"
            >
              <button
                onClick={() => setComingSoonModal(null)}
                className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white mb-6">
                <Sparkles size={28} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Coming Soon</p>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-4 uppercase italic text-zinc-900">
                {comingSoonModal.title}
              </h3>
              <p className="text-zinc-500 font-medium leading-relaxed mb-8">
                현재 상품 안내 페이지를 정성껏 준비하고 있습니다.<br />
                빠른 시일 내에 정식 오픈 예정이며,<br className="hidden md:block" />
                먼저 상담을 원하시면 언제든 문의 주세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setComingSoonModal(null)}
                  className="px-8 py-3.5 bg-zinc-100 text-zinc-900 rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-200 transition-all"
                >
                  닫기
                </button>
                <Link
                  href="https://pf.kakao.com/_Rxfuxbxj"
                  target="_blank"
                  className="px-8 py-3.5 bg-zinc-900 text-white rounded-full font-black text-sm uppercase tracking-tight hover:bg-zinc-800 transition-all"
                >
                  먼저 상담하기
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
