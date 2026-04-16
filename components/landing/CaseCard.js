'use client';
import { MoveRight } from 'lucide-react';

export default function CaseCard({ item, variant = 'default' }) {
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })
    : '';

  const cover = item.thumbnail_url || item.cover_url;

  // ────── Featured (대형 카드) ──────
  if (variant === 'featured') {
    return (
      <a
        href={`/for-you/${item.slug}`}
        className="group block relative w-full h-full aspect-square md:aspect-auto md:min-h-[600px] overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
          {cover && (
            <img
              src={cover}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
          {item.category && (
            <span className="bg-white/20 backdrop-blur-xl text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase">
              {item.category}
            </span>
          )}
          {item.is_featured && (
            <span className="bg-amber-400 text-black text-[9px] font-black px-2.5 py-1 rounded-full tracking-wider uppercase">
              FEATURED
            </span>
          )}
        </div>

        <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 z-10">
          <MoveRight size={16} className="text-white" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 z-10">
          {item.client_name && (
            <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase block mb-3">
              CLIENT — {item.client_name}
            </span>
          )}
          <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tighter text-white mb-4 break-keep">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="text-sm text-white/70 leading-relaxed max-w-lg line-clamp-2 font-medium">
              {item.excerpt}
            </p>
          )}
          {item.result_summary && (
            <p className="text-xs md:text-sm text-amber-300 font-bold tracking-wide mt-3 line-clamp-1">
              ▲ {item.result_summary}
            </p>
          )}
        </div>
      </a>
    );
  }

  // ────── Default (그리드 카드) ──────
  return (
    <a
      href={`/for-you/${item.slug}`}
      className="group block relative w-full h-full aspect-square md:aspect-auto md:min-h-[340px] overflow-hidden rounded-2xl"
    >
      <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
        {cover && (
          <img
            src={cover}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
        {item.category && (
          <span className="bg-white/20 backdrop-blur-xl text-white text-[9px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">
            {item.category}
          </span>
        )}
      </div>

      <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500 z-10">
        <MoveRight size={14} className="text-white" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        {(item.client_name || date) && (
          <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase block mb-2">
            {item.client_name || date}
          </span>
        )}
        <h3 className="text-lg md:text-xl font-black leading-tight tracking-tighter text-white line-clamp-2 break-keep mb-2">
          {item.title}
        </h3>
        {item.result_summary && (
          <p className="text-[11px] text-amber-300 font-bold tracking-wide line-clamp-1">
            ▲ {item.result_summary}
          </p>
        )}
      </div>
    </a>
  );
}
