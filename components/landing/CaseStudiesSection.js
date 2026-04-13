'use client';

import { motion } from 'framer-motion';

export default function CaseStudiesSection({ title, subtitle, content }) {
  const items = content?.items || [];

  const gridClass =
    items.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : items.length === 2
      ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
      : 'grid-cols-1 md:grid-cols-3';

  return (
    <section className="py-24 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">

        {/* 섹션 헤더 */}
        {(title || subtitle) && (
          <div className="text-center mb-14">
            {subtitle && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium mb-3 tracking-wide">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white leading-snug">
                {title}
              </h2>
            )}
          </div>
        )}

        {/* 카드 그리드 */}
        <div className={`grid gap-6 ${gridClass}`}>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            >
              {/* 이미지 */}
              <div className="w-full aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`${item.metric_result || ''} ${item.client_type || ''}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
                    이미지 준비 중
                  </div>
                )}
              </div>

              {/* 캡션 */}
              <div className="px-5 py-4">
                {item.metric_label && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-1">
                    {item.metric_label}
                  </p>
                )}
                <p className="text-sm md:text-base font-black text-zinc-900 dark:text-white leading-snug">
                  {item.metric_result}{item.client_type && (
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold"> {item.client_type}</span>
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
