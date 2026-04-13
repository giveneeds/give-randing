'use client';

import { motion } from 'framer-motion';

export default function CaseStudiesSection({ title, subtitle, content }) {
  const items = content?.items || [];

  return (
    <section className="py-24 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="mb-16">
            {title && (
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-3">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium">{subtitle}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              {/* 이미지 영역 */}
              <div className="w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden mb-5">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`${item.metric_result} ${item.client_type}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
                    이미지 준비 중
                  </div>
                )}
              </div>

              {/* 캡션 */}
              <div>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium mb-1">
                  {item.metric_label}
                </p>
                <p className="text-lg font-black text-zinc-900 dark:text-white">
                  {item.metric_result}{' '}
                  <span className="text-zinc-500 dark:text-zinc-400 font-bold">{item.client_type}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
