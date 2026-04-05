'use client';

import { motion } from 'framer-motion';
import { Plus, Equal } from 'lucide-react';

export default function BrandIdentitySection({ title, content }) {
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };

  const leftTitle = content?.left?.title || "GIVE";
  const leftDesc = content?.left?.desc || "건네주다";
  const middleTitle = content?.middle?.title || "NEEDS";
  const middleDesc = content?.middle?.desc || "원하는 것을";
  const rightTitle = content?.right?.title || "GIVENEEDS";
  const rightDesc = content?.right?.desc || "진정 원하는 가치를 전달하는 마케팅";

  return (
    <section className="py-32 px-4 bg-white dark:bg-zinc-950 transition-colors flex flex-col items-center">
      <div className="max-w-4xl mx-auto text-center mb-24">
        <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter leading-tight">
          {title}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center space-y-12 md:space-y-0 md:space-x-8">
        {/* GIVE */}
        <div className="flex flex-col items-center">
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="w-56 h-56 rounded-full border border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-white/5 shadow-2xl shadow-black/5"
          >
            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-widest mb-1">{leftTitle}</span>
            <span className="text-xs font-bold text-zinc-400 uppercase">{leftDesc}</span>
          </motion.div>
        </div>

        {/* PLUS */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl">
          <Plus size={16} strokeWidth={4} />
        </div>

        {/* NEEDS */}
        <div className="flex flex-col items-center">
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="w-56 h-56 rounded-full border border-zinc-200 dark:border-white/10 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-white/5 shadow-2xl shadow-black/5"
          >
            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-widest mb-1">{middleTitle}</span>
            <span className="text-xs font-bold text-zinc-400 uppercase">{middleDesc}</span>
          </motion.div>
        </div>

        {/* EQUAL */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl">
          <Equal size={16} strokeWidth={4} />
        </div>

        {/* GIVENEEDS */}
        <div className="flex flex-col items-center">
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="w-64 h-64 rounded-full border-4 border-blue-500/30 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative"
          >
            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-[0.2em] mb-2">{rightTitle}</span>
            <span className="text-xs font-bold text-blue-500 text-center max-w-[140px] leading-relaxed uppercase whitespace-pre-wrap">
              {rightDesc}
            </span>
            <div className="absolute inset-0 rounded-full animate-ping opacity-10 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
