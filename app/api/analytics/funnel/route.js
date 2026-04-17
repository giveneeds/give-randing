import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET() {
  if (isDummyMode) {
    return NextResponse.json({
      steps: [
        { label: '세션 시작', key: 'sessions', count: 0, conversion_rate: 100 },
        { label: '콘텐츠 조회', key: 'content_views', count: 0, conversion_rate: 0 },
        { label: 'CTA 클릭', key: 'cta_clicks', count: 0, conversion_rate: 0 },
        { label: '리드 전환', key: 'leads', count: 0, conversion_rate: 0 },
      ],
      channel_breakdown: [],
      device_breakdown: [],
    });
  }

  try {
    // Run all queries in parallel
    const [sessionsRes, contentViewsRes, ctaClicksRes, leadsRes, channelRes, deviceRes] =
      await Promise.all([
        supabase.from('lead_sessions').select('anonymous_id', { count: 'exact', head: true }),
        supabase
          .from('lead_events')
          .select('id', { count: 'exact', head: true })
          .in('event_type', ['magazine_view', 'service_view']),
        supabase
          .from('lead_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'cta_click'),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('channel_group').not('channel_group', 'is', null),
        supabase.from('leads').select('device_type').not('device_type', 'is', null),
      ]);

    const sessionCount = sessionsRes.count ?? 0;
    const contentCount = contentViewsRes.count ?? 0;
    const ctaCount = ctaClicksRes.count ?? 0;
    const leadCount = leadsRes.count ?? 0;

    const safe = (current, prev) =>
      prev > 0 ? Math.round((current / prev) * 100) : 0;

    const steps = [
      { label: '세션 시작', key: 'sessions', count: sessionCount, conversion_rate: 100 },
      { label: '콘텐츠 조회', key: 'content_views', count: contentCount, conversion_rate: safe(contentCount, sessionCount) },
      { label: 'CTA 클릭', key: 'cta_clicks', count: ctaCount, conversion_rate: safe(ctaCount, contentCount) },
      { label: '리드 전환', key: 'leads', count: leadCount, conversion_rate: safe(leadCount, ctaCount) },
    ];

    // Channel breakdown
    const channelMap = {};
    for (const row of channelRes.data || []) {
      const g = row.channel_group || 'other';
      channelMap[g] = (channelMap[g] || 0) + 1;
    }
    const channel_breakdown = Object.entries(channelMap)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count);

    // Device breakdown
    const deviceMap = {};
    for (const row of deviceRes.data || []) {
      const d = row.device_type || 'unknown';
      deviceMap[d] = (deviceMap[d] || 0) + 1;
    }
    const device_breakdown = Object.entries(deviceMap)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ steps, channel_breakdown, device_breakdown });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
