'use client';
import { motion } from 'framer-motion';
import { Minus } from 'lucide-react';

export default function BrandAboutSection() {
  return (
    <section id="about" className="py-20 sm:py-32 px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto overflow-hidden">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Minus className="text-zinc-400" />
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
              WHO WE ARE
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tighter text-zinc-900 dark:text-zinc-100 mb-6 sm:mb-8">
            우리는 숫자의 이면에서<br/>
            브랜드의 <span className="text-zinc-400 italic">본질</span>을 찾습니다.
          </h2>
          <p className="text-base sm:text-lg text-zinc-500 leading-relaxed max-w-md">
            단순히 유입을 늘리는 마케팅은 누구나 할 수 있습니다. 기브니즈는 브랜드가 가진 고유의 철학을 
            데이터와 결합하여, 고객의 기억에 오래 남는 성장을 설계합니다.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" 
              alt="Brand Identity" 
              className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-1000"
            />
          </div>
          <div className="absolute -bottom-8 -left-8 bg-white dark:bg-zinc-900 p-8 border border-zinc-200 dark:border-zinc-800 hidden md:block">
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100 leading-none">01</div>
            <div className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mt-2">Core Philosophy</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
