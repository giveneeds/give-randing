'use client';

import { useEffect } from 'react';
import { appendService } from '@/lib/userTrail';
import { trackEvent } from '@/lib/tracker';

export default function ServiceDetailTracker({ service }) {
  useEffect(() => {
    if (!service?.slug) return;
    appendService({ slug: service.slug, title: service.title, category: service.category });
    trackEvent('service_view', { slug: service.slug, title: service.title, category: service.category });
  }, [service?.slug, service?.title, service?.category]);

  return null;
}
