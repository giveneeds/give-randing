'use client';

import { motion } from 'framer-motion';

export default function StatsGridSection({ title, subtitle, content }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-medium">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {content.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center group hover:border-blue-500/30 transition-all duration-500 shadow-xl shadow-black/5"
            >
              <div className="text-4xl sm:text-5xl md:text-7xl font-black text-zinc-900 dark:text-white mb-3 sm:mb-4 tracking-tighter transition-colors group-hover:text-blue-500">
                {item.value}
              </div>
              <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400 tracking-[0.2em] uppercase">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
