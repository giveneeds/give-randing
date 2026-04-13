'use client';

import { motion } from 'framer-motion';

export default function ClientLogosSection({ title, subtitle, content }) {
  const items = (content?.items || []).filter(item => item.image_url);

  return (
    <section className="py-24 bg-zinc-950">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-16">
            {title && (
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base text-zinc-400 font-medium">{subtitle}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-2xl flex items-center justify-center p-6 aspect-[3/2]"
            >
              <img
                src={item.image_url}
                alt={item.name || '클라이언트 로고'}
                className="max-w-full max-h-full object-contain"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
