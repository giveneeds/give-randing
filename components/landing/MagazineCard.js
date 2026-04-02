'use client';
import { MoveRight } from 'lucide-react';

export default function MagazineCard({ post, variant = 'default' }) {
  if (variant === 'featured') {
    return (
      <a href={`/magazine/${post.slug}`} className="group block">
        <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-900 mb-6 border border-transparent dark:border-zinc-800">
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          {post.is_premium && (
            <span className="absolute top-4 left-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold px-2.5 py-1 tracking-widest uppercase">
              PREMIUM
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase mb-3 block">
          {post.category} — FEATURED
        </span>
        <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tighter text-zinc-900 dark:text-zinc-100 mb-4 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
          {post.title}
        </h2>
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
          <span>Read Article</span>
          <MoveRight size={14} />
        </div>
      </a>
    );
  }

  return (
    <a href={`/magazine/${post.slug}`}
      className="group block bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-200 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 py-6 first:pt-0">
      <div className="flex gap-6 items-start">
        <div className="w-24 h-16 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800">
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase mb-1.5 block">
            {post.category}
          </span>
          <h3 className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
        </div>
        <MoveRight size={14} className="shrink-0 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors mt-1" />
      </div>
    </a>
  );
}
