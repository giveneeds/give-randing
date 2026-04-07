import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Star, Cpu, MapPin, 
  Layout, Target, ArrowRightCircle 
} from 'lucide-react';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';

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

export default function ProductTabsSection({ title, content }) {
  const items = useMemo(() => content?.items || [], [content]);
  const [activeTab, setActiveTab] = useState(items[0]?.id);
  
  const activeItem = useMemo(() => items.find(item => item.id === activeTab) || items[0], [items, activeTab]);
  const IconComponent = iconMap[activeItem?.icon] || ArrowRightCircle;

  if (!items.length) return null;

  return (
    <section className="py-24 px-4 bg-zinc-50 dark:bg-zinc-900/50 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-widest uppercase mb-2">
              {title}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">기브니즈만의 압도적인 마케팅 솔루션</p>
          </div>
        </div>

        {/* 탭 리스트 (상단) - 7개 항목이므로 캐러셀이나 유연한 그리드 적용 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-8">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full p-3 sm:p-5 rounded-2xl border transition-all duration-300 text-left group
                ${activeTab === item.id 
                  ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white text-white dark:text-zinc-900 shadow-xl' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black leading-none ${activeTab === item.id ? 'opacity-50' : 'text-zinc-400'}`}>
                  {item.id.toUpperCase()}
                </span>
                <div className={`transition-colors ${activeTab === item.id ? 'text-white dark:text-zinc-900' : 'text-zinc-300 dark:text-zinc-700'}`}>
                  {(() => {
                    const TabIcon = iconMap[item.icon] || ArrowRightCircle;
                    return <TabIcon size={20} strokeWidth={2} />;
                  })()}
                </div>
              </div>
              <h3 className="text-sm font-bold tracking-tighter whitespace-pre-wrap">
                {item.title}
              </h3>
            </button>
          ))}
        </div>

        {/* 상세 내용 (하단) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-10 md:p-16 relative overflow-hidden min-h-[420px] md:min-h-[500px] border border-zinc-200 dark:border-white/5 shadow-2xl"
          >
            <div className="max-w-2xl relative z-10">
              <span 
                className="inline-block px-3 py-1 rounded-full text-white font-black text-[10px] mb-6 tracking-widest uppercase"
                style={{ backgroundColor: activeItem.color || '#3b82f6' }}
              >
                {activeItem.detail_title}
              </span>
              <h4 className="text-3xl sm:text-4xl md:text-7xl font-black text-zinc-900 dark:text-white tracking-tighter mb-6 md:mb-8 leading-none">
                {activeItem.title}
              </h4>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-700 dark:text-zinc-300 mb-6 tracking-tight">
                {activeItem.detail_desc}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed mb-12 max-w-lg text-lg">
                {activeItem.detail_sub}
              </p>
              
              <a
                href={activeItem.slug ? `/service/${activeItem.slug}` : '/service'}
                className="inline-flex items-center space-x-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-full font-bold text-base group transition-transform hover:scale-105 active:scale-95"
              >
                <span>솔루션 상세보기</span>
                <ArrowRightCircle size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* AI 섹션일 경우 CPU 아키텍처 보여주기, 그 외에는 큰 아이콘 배경 */}
            <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-20 md:right-0 w-full md:w-1/2 h-full items-center justify-center pointer-events-none opacity-20 md:opacity-100">
              {activeItem.icon === 'Cpu' ? (
                <div className="w-full max-w-[600px] transform scale-100 md:scale-125 rotate-0 md:rotate-12 translate-x-0 md:translate-x-20">
                  <CpuArchitecture text="AI SOLUTION" />
                </div>
              ) : (
                <IconComponent
                  size={500}
                  strokeWidth={0.3}
                  className="text-zinc-900 dark:text-white transform rotate-0 md:rotate-12"
                  style={{ color: activeItem.color }}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
