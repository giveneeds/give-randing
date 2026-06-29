'use client';

import { useEffect, useState } from 'react';

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export default function useThirdPartyGate({ fallbackDelay = 10000 } = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;

    let fallbackId;
    let settled = false;

    const activate = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };

    const scheduleFallback = () => {
      fallbackId = window.setTimeout(activate, fallbackDelay);
    };

    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, activate, { once: true, passive: true });
    });

    if (document.readyState === 'complete') {
      scheduleFallback();
    } else {
      window.addEventListener('load', scheduleFallback, { once: true });
    }

    return () => {
      settled = true;
      window.removeEventListener('load', scheduleFallback);
      INTERACTION_EVENTS.forEach((eventName) => window.removeEventListener(eventName, activate));
      if (fallbackId) window.clearTimeout(fallbackId);
    };
  }, [fallbackDelay, ready]);

  return ready;
}
