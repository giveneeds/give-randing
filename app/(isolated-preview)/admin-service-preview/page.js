'use client';

import { useEffect, useState } from 'react';
import ServicePreviewSurface from '@/components/service/ServicePreviewSurface';

function isValidPayload(payload) {
  return payload && typeof payload === 'object' && payload.service && typeof payload.service === 'object';
}

export default function AdminServicePreviewPage() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      const data = event.data;
      if (!data || data.type !== 'service:preview') return;
      if (!isValidPayload(data.payload)) return;
      setPayload(data.payload);
    }

    window.addEventListener('message', onMessage);
    try {
      window.parent?.postMessage({ type: 'service:preview:ready' }, window.location.origin);
    } catch {}

    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Loading service preview...
        </p>
      </div>
    );
  }

  return (
    <ServicePreviewSurface
      service={payload.service}
      settings={payload.settings}
      relatedMagazine={payload.relatedMagazine || null}
      preview
      previewData={payload.previewData || {}}
    />
  );
}
