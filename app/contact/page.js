'use client';
import { useState, useEffect } from 'react';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import ContactForm from '@/components/landing/ContactForm';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, Clock, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
  const [settings, setSettings] = useState(DUMMY_SETTINGS);

  useEffect(() => {
    async function loadSettings() {
      if (isDummyMode) return;
      try {
        const { data } = await supabase.from('landing_settings').select('*').single();
        if (data) {
          setSettings({
            brand: data.brand || DUMMY_SETTINGS.brand,
            cta_global: data.cta_global || DUMMY_SETTINGS.cta_global,
            seo: data.seo || DUMMY_SETTINGS.seo,
            navbar: data.navbar || DUMMY_SETTINGS.navbar,
            footer: data.footer || DUMMY_SETTINGS.footer
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <LandingNavbar settings={settings} />
      
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 text-xs font-black tracking-widest uppercase mb-6"
            >
              <Sparkles size={14} className="text-primary" /> Premium Consultation
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-7xl font-black text-zinc-900 dark:text-white tracking-tighter mb-8 leading-[1.1]"
            >
              당신의 비즈니스를<br/>
              <span className="text-zinc-400 dark:text-zinc-600">가장 잘 이해하는</span> 마케팅 팀
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed"
            >
              어떤 마케팅을 해야 할지 막막하신가요? 기브니즈의 마케팅 전문가가<br className="hidden md:block" />
              귀사의 비즈니스 상황을 정밀 분석하여 최적의 성장 로드맵을 제안해 드립니다.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">
            {/* 좌측 안내 정보 */}
            <div className="lg:col-span-4 space-y-12">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-white/5">
                <h3 className="text-lg font-black mb-8 tracking-tight">상담 프로세스</h3>
                <div className="space-y-8">
                  {[
                    { icon: <MessageCircle size={20}/>, title: '문의 접수', desc: '상담 폼을 통해 귀사의 기본 정보를 전달해주세요.' },
                    { icon: <Clock size={20}/>, title: '정밀 분석', desc: '전문가가 24시간 이내에 비즈니스를 조사합니다.' },
                    { icon: <ShieldCheck size={20}/>, title: '전략 제안', desc: '귀사에 최적화된 맞춤형 솔루션을 제안드립니다.' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white shadow-sm">
                        {step.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-1">{step.title}</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-8 flex flex-col gap-2">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contact Info</p>
                <p className="text-base font-bold text-zinc-900 dark:text-white underline underline-offset-4">giveneeds1@naver.com</p>
                <p className="text-base font-bold text-zinc-900 dark:text-white">평일 10:00 - 19:00</p>
              </div>
            </div>

            {/* 우측 폼 */}
            <div className="lg:col-span-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>

      <LandingFooter settings={settings} />
    </div>
  );
}
