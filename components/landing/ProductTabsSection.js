'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Newspaper, Camera, ArrowRightCircle } from 'lucide-react';

const iconMap = {
  Palette: Palette,
  Newspaper: Newspaper,
  Camera: Camera,
};

export default function ProductTabsSection({ title, content }) {
  const [activeTab, setActiveTab] = useState(content.items[1].id); // 11번(언론보도) 기본 선택
  
  const activeItem = content.items.find(item => item.id === activeTab);
  const IconComponent = iconMap[activeItem?.icon] || ArrowRightCircle;

  return (
    <section className="py-24 px-4 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-12">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-widest uppercase">
            {title}
          </h2>
        </div>

        {/* 탭 리스트 (상단) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {content.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative overflow-hidden p-8 rounded-2xl border transition-all duration-300 text-left group
                ${activeTab === item.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] font-black leading-none ${activeTab === item.id ? 'text-blue-100' : 'text-blue-500'}`}>
                  {item.id}
                </span>
                <div className={`transition-colors ${activeTab === item.id ? 'text-white' : 'text-zinc-300 dark:text-zinc-700'}`}>
                  {(() => {
                    const TabIcon = iconMap[item.icon] || ArrowRightCircle;
                    return <TabIcon size={24} strokeWidth={1.5} />;
                  })()}
                </div>
              </div>
              <h3 className="text-lg font-black tracking-tighter mb-2">
                {item.title}
              </h3>
            </button>
          ))}
        </div>

        {/* 상세 내용 (하단) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 dark:bg-zinc-900/40 rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden min-h-[500px] border border-blue-100 dark:border-white/5"
          >
            <div className="max-w-2xl relative z-10">
              <span className="inline-block text-blue-600 font-black text-xs mb-6 tracking-widest uppercase">
                {activeItem.id}
              </span>
              <h4 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter mb-8 leading-tight">
                {activeItem.detail_title}
              </h4>
              <p className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-4 tracking-tight">
                {activeItem.detail_desc}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-12 max-w-lg">
                {activeItem.detail_sub}
              </p>
              
              <button className="flex items-center space-x-2 text-blue-500 font-bold text-sm group">
                <span>상품소개 바로가기</span>
                <ArrowRightCircle size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 상징적 배경 아이콘/일러스트 (오른쪽 하단) */}
            <div className="absolute bottom-10 right-10 md:bottom-20 md:right-20 opacity-10 dark:opacity-5 transform rotate-12 group-hover:rotate-6 transition-transform duration-1000">
              <IconComponent size={300} strokeWidth={0.5} className="text-blue-500 dark:text-white" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
