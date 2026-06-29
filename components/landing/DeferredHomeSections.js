'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const SectionRenderer = dynamic(() => import('./SectionRenderer'), {
  ssr: false,
  loading: () => (
    <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-zinc-400">
      Loading Contents
    </div>
  ),
});

export default function DeferredHomeSections({ loading, sections }) {
  const rootRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;

    const show = () => setReady(true);

    if (!('IntersectionObserver' in window)) {
      show();
      return undefined;
    }

    const fallbackId = window.setTimeout(show, 8000);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: '0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackId);
    };
  }, [ready]);

  return (
    <div ref={rootRef} className="min-h-[40vh]">
      {loading ? (
        <div className="py-24 text-center text-xs text-zinc-400 tracking-widest uppercase">
          Loading Contents
        </div>
      ) : ready ? (
        sections.map((section) => (
          <div key={section.id} className="mb-16 md:mb-32">
            <SectionRenderer
              type={section.type}
              title={section.title}
              subtitle={section.subtitle}
              content={section.content}
            />
          </div>
        ))
      ) : null}
    </div>
  );
}
