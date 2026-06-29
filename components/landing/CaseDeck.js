'use client';
import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, MoveRight } from 'lucide-react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CaseDeck — 덱 형식 캐러셀
 *  - 한 번에 최대 3개(중앙 active + 좌우 각 1개)만 노출, 나머지는 화면 밖에서 대기
 *  - 좌/우 화살표 또는 터치 스와이프로 이동하면 다음 카드가 새로 미끄러져 들어옴
 *  - 모듈로 기반 무한 루프 (항상 최단 경로로 회전)
 *  - 1개 항목만 있으면 네비게이션 숨김
 */
const VISIBLE_RANGE = 1; // active 기준 ±N 까지만 화면에 노출

export default function CaseDeck({ title, subtitle, items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  if (!items || items.length === 0) return null;

  const count = items.length;
  const active = ((activeIndex % count) + count) % count;
  const hasNav = count > 1;

  function advance(step) {
    setActiveIndex((i) => i + step);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }
  function handleTouchMove(e) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }
  function handleTouchEnd() {
    const dx = touchDeltaX.current;
    if (Math.abs(dx) > 50) advance(dx > 0 ? -1 : 1);
  }

  return (
    <section className="px-4 sm:px-6 md:px-12 max-w-screen-xl mx-auto mb-20">
      <div className="flex items-end justify-between mb-8 md:mb-10">
        <div>
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase block mb-2">
            {subtitle || title}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase">
            {title}
          </h2>
        </div>
        {hasNav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => advance(-1)}
              aria-label="이전"
              className="w-11 h-11 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 dark:hover:bg-white dark:hover:text-zinc-900 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => advance(1)}
              aria-label="다음"
              className="w-11 h-11 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 dark:hover:bg-white dark:hover:text-zinc-900 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div
        className="relative h-[420px] sm:h-[480px] md:h-[560px] select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, i) => {
          // active 기준 최단 경로 offset 계산
          let offset = i - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;

          const isActive = offset === 0;
          const isVisible = Math.abs(offset) <= VISIBLE_RANGE;

          // 15% overlap → 인접 카드 중심 간 간격 = 카드폭 * 0.85
          // 보이는 범위 밖 카드는 화면 양 끝으로 멀리 밀어 두어 어색한 잔상이 안 보이게.
          const translatePct = isVisible
            ? offset * 85
            : (offset > 0 ? 1 : -1) * (VISIBLE_RANGE + 1) * 85;
          const scale = isActive ? 1 : 0.9;
          const opacity = isVisible ? (isActive ? 1 : 0.45) : 0;
          const blur = isVisible ? (isActive ? 0 : 1) : 0;
          const zIndex = isVisible ? count - Math.abs(offset) : 0;

          return (
            <div
              key={item.id || item.slug}
              aria-hidden={!isVisible}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 'min(88%, 640px)',
                height: '100%',
                transform: `translate(calc(-50% + ${translatePct}%), 0) scale(${scale})`,
                opacity,
                filter: `blur(${blur}px)`,
                zIndex,
                transition: 'transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease, filter 0.5s ease',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
              onClick={() => isVisible && !isActive && setActiveIndex(activeIndex + offset)}
            >
              <DeckCard item={item} />
            </div>
          );
        })}
      </div>

      {hasNav && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번 카드로 이동`}
              onClick={() => setActiveIndex(i)}
              className={`h-1 rounded-full transition-all ${
                i === active
                  ? 'w-8 bg-zinc-900 dark:bg-white'
                  : 'w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DeckCard({ item }) {
  const cover = item.thumbnail_url || item.cover_url;
  return (
    <Link
      href={`/for-you/${item.slug}`}
      className="group block relative w-full h-full overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800 shadow-2xl"
    >
      {cover && (
        <OptimizedImage
          src={cover}
          alt={item.title}
          className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {item.category && (
        <div className="absolute top-6 left-6 z-10">
          <span className="bg-white/15 backdrop-blur-xl text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase">
            {item.category}
          </span>
        </div>
      )}

      <div className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500 z-10">
        <MoveRight size={16} className="text-white" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7 md:p-10 z-10">
        {item.client_name && (
          <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase block mb-3">
            CLIENT — {item.client_name}
          </span>
        )}
        <h3 className="text-2xl md:text-4xl font-black leading-tight tracking-tighter text-white mb-3 break-keep">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="text-xs md:text-sm text-white/70 leading-relaxed max-w-xl line-clamp-2 font-medium">
            {item.excerpt}
          </p>
        )}
        {item.result_summary && (
          <p className="text-xs md:text-sm text-amber-300 font-bold tracking-wide mt-3 line-clamp-1">
            ▲ {item.result_summary}
          </p>
        )}
      </div>
    </Link>
  );
}
