'use client';

import { useEffect, use, useState } from 'react';
import { appendService } from '@/lib/userTrail';
import { trackEvent } from '@/lib/tracker';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';
import ServicePreviewSurface from '@/components/service/ServicePreviewSurface';

export default function ServiceDetailPage({ params }) {
  const { slug } = use(params);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedMagazine, setRelatedMagazine] = useState(null);
  const [relatedMagazines, setRelatedMagazines] = useState([]);
  const [settings, setSettings] = useState(DUMMY_SETTINGS);

  useEffect(() => {
    if (isDummyMode) return;
    (async () => {
      try {
        const { data } = await supabase.from('landing_settings').select('*').single();
        if (data) setSettings(data);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    async function fetchService() {
      try {
        const res = await fetch(`/api/services?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setService(null);
          return;
        }
        const data = await res.json();
        const found = Array.isArray(data) ? data.find((item) => item.slug === slug) : data;
        if (found) {
          setService(found);
          if (!found?.details?.related_magazine_slug) {
            setRelatedMagazine(null);
            setRelatedMagazines([]);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [slug]);

  useEffect(() => {
    if (service?.slug) {
      appendService({ slug: service.slug, title: service.title, category: service.category });
      trackEvent('service_view', { slug: service.slug, title: service.title, category: service.category });
    }
  }, [service]);

  useEffect(() => {
    const blockRelSlugs = Array.isArray(service?.details?.blocks)
      ? service.details.blocks
        .filter((block) => block?.type === 'related_magazine' && block.is_visible !== false && block.magazine_slug)
        .map((block) => block.magazine_slug)
      : [];
    const relSlugs = [...new Set([service?.details?.related_magazine_slug, ...blockRelSlugs].filter(Boolean))];
    let cancelled = false;

    async function loadRelatedMagazines() {
      if (relSlugs.length === 0) {
        if (!cancelled) {
          setRelatedMagazine(null);
          setRelatedMagazines([]);
        }
        return;
      }

      try {
        const response = await fetch('/api/magazines');
        const d = await response.json();
        const list = Array.isArray(d?.magazines) ? d.magazines : [];
        const matches = list.filter((m) => relSlugs.includes(m.slug));
        const primarySlug = service?.details?.related_magazine_slug || blockRelSlugs[0];
        if (cancelled) return;
        setRelatedMagazines(matches);
        setRelatedMagazine(matches.find((m) => m.slug === primarySlug) || matches[0] || null);
      } catch {
        if (cancelled) return;
        setRelatedMagazine(null);
        setRelatedMagazines([]);
      }
    }

    loadRelatedMagazines();
    return () => {
      cancelled = true;
    };
  }, [service]);

  if (loading) return <div className="min-h-screen bg-white" />;

  return (
    <ServicePreviewSurface
      service={service}
      settings={settings}
      relatedMagazine={relatedMagazine}
      preview={false}
      previewData={{ magazines: relatedMagazines }}
    />
  );
}
