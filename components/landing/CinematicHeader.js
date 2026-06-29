'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import MobileCinematicHeader from './MobileCinematicHeader';

const DesktopCinematicHeader = dynamic(() => import('./DesktopCinematicHeader'), {
  ssr: false,
  loading: () => <div className="hidden md:block h-screen bg-white dark:bg-zinc-950" />,
});

export default function CinematicHeader() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (isDesktop) return <DesktopCinematicHeader />;

  return <MobileCinematicHeader />;
}