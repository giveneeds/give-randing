'use client';
import { MoveRight } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function MagazineCard({ post, variant = 'default' }) {
  const date = new Date(post.created_at).toLocaleDateString('ko-KR', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  // ────── Featured (대형 카드 — 2x2 사이즈) ──────
  if (variant === 'featured') {
    return (
      <a href={`/magazine/${post.slug}`} className="group block relative w-full h-full aspect-square md:aspect-auto md:min-h-[600px] overflow-hidden rounded-2xl">
        {/* 배경 이미지 */}
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
          <OptimizedImage
            src={post.thumbnail_url}
            alt={post.title}
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
        </div>
        {/* 그라디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* 상단 뱃지 */}
        <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
          <span className="bg-white/20 backdrop-blur-xl text-white text-[10px] font-black px-3 py-1.5 rounded-full tracking-widest uppercase">
            {post.category}
          </span>
          {post.is_premium && (
            <span className="bg-amber-400 text-black text-[9px] font-black px-2.5 py-1 rounded-full tracking-wider uppercase">
              PREMIUM
            </span>
          )}
        </div>

        {/* 우상단 화살표 */}
        <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 z-10">
          <MoveRight size={16} className="text-white" />
        </div>

        {/* 하단 텍스트 */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 z-10">
          <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase block mb-3">
            FEATURED — {date}
          </span>
          <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tighter text-white mb-4 break-keep">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="text-sm text-white/70 leading-relaxed max-w-lg line-clamp-2 font-medium">
              {post.excerpt}
            </p>
          )}
          {/* 태그 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {post.tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-bold text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </a>
    );
  }

  // ────── Horizontal (가로형 카드 — 2칸 가로) ──────
  if (variant === 'horizontal') {
    return (
      <a href={`/magazine/${post.slug}`} className="group block relative w-full h-full min-h-[220px] sm:min-h-[260px] overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
          <OptimizedImage
            src={post.thumbnail_url}
            alt={post.title}
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute top-5 left-5 z-10">
          <span className="bg-white/20 backdrop-blur-xl text-white text-[9px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">
            {post.category}
          </span>
        </div>

        <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
          <MoveRight size={14} className="text-white" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase block mb-2">{date}</span>
          <h3 className="text-lg md:text-xl font-black leading-tight tracking-tighter text-white line-clamp-2 break-keep">
            {post.title}
          </h3>
        </div>
      </a>
    );
  }

  // ────── Default (소형 카드 — 1x1 사이즈) ──────
  return (
    <a href={`/magazine/${post.slug}`} className="group block relative w-full h-full aspect-square md:aspect-auto md:min-h-[320px] overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
        <OptimizedImage
          src={post.thumbnail_url}
          alt={post.title}
          className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <div className="absolute top-5 left-5 z-10">
        <span className="bg-white/20 backdrop-blur-xl text-white text-[9px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">
          {post.category}
        </span>
      </div>

      <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500 z-10">
        <MoveRight size={14} className="text-white" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase block mb-2">{date}</span>
        <h3 className="text-lg font-black leading-tight tracking-tighter text-white line-clamp-2 break-keep mb-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        )}
      </div>
    </a>
  );
}
