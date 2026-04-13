'use client';

import { useState, useEffect } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { DUMMY_SETTINGS } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import AiSolutionBlock from '@/components/ui/AiSolutionBlock';
import CaseStudiesSection from '@/components/landing/CaseStudiesSection';
import ClientLogosSection from '@/components/landing/ClientLogosSection';

const SECTORS = [
  {
    id: 'ADS',
    title: 'VIRAL MARKETING',
    badge: 'V',
    desc: '광고비 없이도 잠재 고객이 먼저 찾아옵니다. 검색 상단에 내 브랜드가 자연스럽게 노출되고, 관심 있는 고객의 유입이 늘어납니다.',
    bg: 'bg-[#1E4181]',
    text: 'text-white',
    hoverBg: 'hover:bg-[#152e5d]',
    borderColor: 'border-[#1E4181]',
  },
  {
    id: 'GROWTH',
    title: 'REVIEW MANAGEMENT',
    badge: 'R',
    desc: '고객의 진짜 목소리가 새 손님을 데려옵니다. 긍정 리뷰는 쌓고, 부정 여론은 선제 관리해 첫 방문 고객의 신뢰를 높입니다.',
    bg: 'bg-[#16A34A]',
    text: 'text-white',
    hoverBg: 'hover:bg-[#117a37]',
    borderColor: 'border-[#16A34A]',
  },
  {
    id: 'LOCAL',
    title: 'LOCAL SEO',
    badge: 'L',
    desc: '지도 앱에서 내 가게가 가장 먼저 보입니다. 근처를 검색하는 고객이 경쟁사보다 내 매장을 먼저 발견하게 됩니다.',
    bg: 'bg-zinc-900',
    text: 'text-white',
    hoverBg: 'hover:bg-zinc-800',
    borderColor: 'border-zinc-900',
  },
  {
    id: 'TECH',
    title: 'TECH & CREATIVE',
    badge: 'T',
    desc: '처음 방문한 고객도 "여기다" 싶게 만듭니다. 세련된 웹사이트와 AI 자동화로 브랜드 신뢰를 높이고 운영 시간도 줄입니다.',
    bg: 'bg-zinc-100',
    text: 'text-zinc-900',
    hoverBg: 'hover:bg-zinc-50',
    borderColor: 'border-zinc-300',
  },
];



export default function ServicePage() {
  const [services, setServices] = useState([]);
  const [caseStudies, setCaseStudies] = useState(null);
  const [clientLogos, setClientLogos] = useState(null);
  const [comingSoonModal, setComingSoonModal] = useState(null);

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        const active = Array.isArray(data) ? data.filter(s => s.is_active) : [];
        setServices(active);
      })
      .catch(() => setServices([]));

    fetch('/api/sections?page=service')
      .then(r => r.json())
      .then(data => {
        if (data.error) { console.error('[service] sections API error:', data.error); return; }
        const sections = data.sections || [];
        const foundCase = sections.find(s => s.type === 'case_studies' && s.is_active);
        if (foundCase) setCaseStudies(foundCase);
        const foundLogos = sections.find(s => s.type === 'client_logos' && s.is_active);
        if (foundLogos) setClientLogos(foundLogos);
      })
      .catch(e => console.error('[service] sections fetch failed:', e));
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
        <header className="container mx-auto px-4 mb-24 md:mb-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
          >
            {/* 상단 작은 라벨 */}
            <p className="text-xs font-black tracking-[0.35em] text-zinc-400 dark:text-zinc-500 uppercase mb-8">
              더 많은 고객, 더 높은 매출
            </p>

            {/* 메인 헤드라인 */}
            <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black tracking-[-0.03em] text-zinc-900 dark:text-white leading-[1.05] mb-10 uppercase">
              What We Do<br />For You
            </h1>

            {/* 서브카피 */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
              <p className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white leading-snug">
                우리 비즈니스에 맞는<br />서비스는?
              </p>
              <p className="text-base md:text-lg font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed">
                검색하면 내 브랜드가 먼저 뜨고,<br />
                리뷰가 신뢰를 대신 말해주며,<br />
                콘텐츠가 잠재 고객을 다시 불러옵니다.
              </p>
            </div>

            {/* 신뢰 배지 */}
            <div className="flex flex-wrap justify-center gap-3 mt-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold">
                ✓ 누적 클라이언트 500+
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold">
                ✓ 고객 만족도 95%
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold">
                ✓ 전략 · 실행 · 성과 ONE-STOP
              </span>
            </div>
          </motion.div>
        </header>

        {/* Case Studies Section — 헤더 바로 아래 */}
        {caseStudies && (
          <CaseStudiesSection
            title={caseStudies.title}
            subtitle={caseStudies.subtitle}
            content={caseStudies.content}
          />
        )}

        {/* Client Logos Section */}
        {clientLogos && (
          <ClientLogosSection
            title={clientLogos.title}
            subtitle={clientLogos.subtitle}
            content={clientLogos.content}
          />
        )}

        {/* Sectors & Grid Tiles */}
        <div className={`space-y-48 ${(caseStudies || clientLogos) ? 'mt-24' : ''}`}>
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
