'use client';

import { useState, useEffect } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { DUMMY_SECTIONS, DUMMY_SETTINGS } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  ArrowRightCircle, CheckCircle2, 
  MessageSquare, Star, Cpu, MapPin, 
  Layout, Target 
} from 'lucide-react';

// 커스텀 Instagram 라인 드로잉 SVG (lucide-react 1.7.0 누락 대응)
const InstagramIcon = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const iconMap = {
  MessageSquare: MessageSquare,
  Star: Star,
  Cpu: Cpu,
  Instagram: InstagramIcon,
  MapPin: MapPin,
  Layout: Layout,
  Target: Target,
};

export default function ServicePage() {
  const serviceSection = DUMMY_SECTIONS.find(s => s.id === 'sec-product-detail');
  const services = serviceSection?.content?.items || [];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white selection:bg-blue-500 selection:text-white">
      <LandingNavbar settings={DUMMY_SETTINGS} />
      
      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <div className="container mx-auto px-4 mb-20 text-center">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-xs tracking-widest uppercase mb-6"
          >
            Our Services
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-none"
          >
            성장을 위한<br />
            <span className="text-zinc-400">7가지 마스터 전략</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium"
          >
            기브니즈는 단순한 대행을 넘어 비즈니스의 본질적 체질을 개선하는 
            데이터 기반의 통합 마케팅 솔루션을 제공합니다.
          </motion.p>
        </div>

        {/* Services Stack List */}
        <div className="container mx-auto px-4 space-y-8">
          {services.map((service, index) => (
            <motion.section
              key={service.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-[3rem] border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-500"
            >
              <div className="flex flex-col md:flex-row min-h-[450px]">
                {/* Text Content */}
                <div className="flex-1 p-10 md:p-20 flex flex-col justify-center">
                  <div className="flex items-center space-x-4 mb-8">
                    <span 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black"
                      style={{ backgroundColor: service.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="font-black text-zinc-400 tracking-widest uppercase text-sm">
                      {service.detail_title.split('.')[1]?.trim() || service.detail_title}
                    </span>
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight">
                    {service.title}
                  </h2>
                  
                  <div className="space-y-4 mb-12">
                    <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                      {service.detail_desc}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed max-w-xl">
                      {service.detail_sub}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-12">
                    {service.detail_desc.split(',').map((tag, i) => (
                      <span key={i} className="flex items-center space-x-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300">
                        <CheckCircle2 size={14} style={{ color: service.color }} />
                        <span>{tag.trim()}</span>
                      </span>
                    ))}
                  </div>

                  <a 
                    href={`/service/${service.slug}`}
                    className="inline-flex items-center space-x-3 text-zinc-900 dark:text-white font-black text-lg group/btn"
                  >
                    <span>상세 프로세스 보기</span>
                    <ArrowRightCircle 
                      size={24} 
                      className="group-hover/btn:translate-x-2 transition-transform" 
                      style={{ color: service.color }}
                    />
                  </a>
                </div>

                {/* Decorative Visual side (Right) */}
                <div 
                  className="w-full md:w-1/3 flex items-center justify-center p-10 md:p-0 relative overflow-hidden"
                  style={{ backgroundColor: `${service.color}15` }}
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[120px] rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                  </div>
                  {(() => {
                    const Icon = iconMap[service.icon] || Target;
                    return (
                      <Icon 
                        size={280} 
                        strokeWidth={0.5} 
                        className="relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" 
                        style={{ color: service.color }}
                      />
                    );
                  })()}
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="container mx-auto px-4 mt-32">
          <div className="bg-zinc-900 dark:bg-white rounded-[3.5rem] p-12 md:p-24 text-center text-white dark:text-zinc-900 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-8 italic">
                Ready to Scale?
              </h2>
              <p className="text-xl md:text-2xl font-bold opacity-70 mb-12 max-w-xl mx-auto italic">
                당신이 보지 못한 성장의 지점을 기브니즈가 찾아드립니다.
              </p>
              <button 
                onClick={() => window.open('https://www.youtube.com/@GIVENEEDS', '_blank')}
                className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-12 py-5 rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                상담 시작하기
              </button>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 blur-[150px] rounded-full" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500 blur-[150px] rounded-full" />
            </div>
          </div>
        </div>
      </main>

      <LandingFooter settings={DUMMY_SETTINGS} />
    </div>
  );
}
