'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function LazyYouTubeEmbed({
  videoId,
  title = 'YouTube video',
  embedUrl,
  className = '',
  aspectClassName = 'aspect-video',
  style,
}) {
  const [activated, setActivated] = useState(false);
  const src = embedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}` : '');

  if (!src || !videoId) return null;

  const autoplaySrc = src.includes('?') ? `${src}&autoplay=1` : `${src}?autoplay=1`;
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-zinc-950 ${aspectClassName} ${className}`} style={style}>
      {activated ? (
        <iframe
          src={autoplaySrc}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="group absolute inset-0 block w-full overflow-hidden text-left"
          aria-label={`${title} 재생`}
          onClick={() => setActivated(true)}
        >
          <OptimizedImage
            src={thumbnail}
            alt=""
            className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
            sizes="(max-width: 768px) 100vw, 960px"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-zinc-950 shadow-2xl transition duration-300 group-hover:scale-110">
            <Play size={24} fill="currentColor" className="ml-1" />
          </span>
          <span className="sr-only">{title}</span>
        </button>
      )}
    </div>
  );
}
