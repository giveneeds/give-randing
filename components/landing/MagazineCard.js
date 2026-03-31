'use client';
import { MoveRight } from 'lucide-react';

export default function MagazineCard({ post }) {
  return (
    <a href={`/magazine/${post.slug}`} className="group block overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-all duration-300 hover:shadow-2xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={post.thumbnail_url} 
          alt={post.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
        />
        {post.is_premium && (
          <span className="absolute top-4 left-4 bg-zinc-900/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
            PREMIUM
          </span>
        )}
      </div>
      <div className="p-6 md:p-8">
        <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-3 block">
          {post.category}
        </span>
        <h3 className="text-xl md:text-2xl font-bold leading-tight mb-4 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-zinc-400 group-hover:text-primary font-bold text-sm transition-all">
          <span>READ MORE</span>
          <MoveRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}
