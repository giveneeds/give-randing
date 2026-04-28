'use client';
import { motion } from 'framer-motion';
import { Search, ClipboardCheck, Lightbulb, ArrowRight } from 'lucide-react';

const tools = [
  {
    title: '리뷰/노출 자가진단',
    desc: '브랜드의 현재 온라인 점유율을 1분 만에 체크하세요.',
    icon: Search,
    color: 'bg-zinc-50 dark:bg-zinc-900'
  },
  {
    title: '성장 체크리스트',
    desc: '업종별 꼭 필요한 마케팅 필수 요소를 확인하세요.',
    icon: ClipboardCheck,
    color: 'bg-white dark:bg-zinc-950'
  },
  {
    title: '아이디어 생성기',
    desc: 'AI가 제안하는 이번 달 콘텐츠 아이디어를 받아보세요.',
    icon: Lightbulb,
    color: 'bg-zinc-50 dark:bg-zinc-900'
  }
];

export default function FreeToolsSection() {
  return (
    <section id="tools" className="py-20 sm:py-32 bg-white dark:bg-zinc-950">
      <div className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto">
        <div className="mb-12 sm:mb-20 text-center md:text-left">
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase mb-4 block">
            FREE RESOURCES
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-[1.1]">
            성장을 위한<br/><span className="text-zinc-400">무료 도구</span>들.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
          {tools.map((tool, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`group p-6 sm:p-12 ${tool.color} border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between transition-all hover:bg-zinc-900 hover:text-white text-zinc-900 dark:text-zinc-100`}
            >
              <div>
                <tool.icon className="mb-6 sm:mb-10 w-9 h-9 sm:w-10 sm:h-10 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-3 sm:mb-4 group-hover:text-white transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                  {tool.desc}
                </p>
              </div>
              <button className="mt-8 sm:mt-12 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 group-hover:text-white transition-all">
                Try Now <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
