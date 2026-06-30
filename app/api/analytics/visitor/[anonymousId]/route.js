import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET(request, { params }) {
  if (isDummyMode) return NextResponse.json({ sessions: [], events: [] });

  const { anonymousId } = await params;

  try {
    // 해당 anonymous_id의 모든 세션
    const { data: sessions, error: sessErr } = await supabase
      .from('lead_sessions')
      .select('id, session_start, channel_group, device_type, browser, landing_url, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, kakao_name, kakao_phone, lead_id, leads(name, phone)')
      .eq('anonymous_id', anonymousId)
      .order('session_start', { ascending: false });

    if (sessErr) throw sessErr;

    // 해당 anonymous_id의 모든 이벤트 (시간순)
    const { data: events, error: evtErr } = await supabase
      .from('lead_events')
      .select('id, session_id, event_type, page_url, event_data, created_at')
      .eq('anonymous_id', anonymousId)
      .order('created_at', { ascending: true });

    if (evtErr) throw evtErr;

    // 이벤트에 체류시간 계산 (다음 이벤트 기준)
    const enrichedEvents = (events || []).map((e, i) => {
      const next = events[i + 1];
      const dwell = next
        ? Math.round((new Date(next.created_at) - new Date(e.created_at)) / 1000)
        : null;
      return { ...e, dwell_seconds: dwell };
    });

    // 신원 정보 (kakao 또는 lead)
    const firstIdentified = (sessions || []).find(s => s.kakao_name || s.leads?.name);
    const identity = firstIdentified
      ? {
          display_name: firstIdentified.kakao_name || firstIdentified.leads?.name,
          display_phone: firstIdentified.kakao_phone || firstIdentified.leads?.phone,
          is_identified: true,
        }
      : {
          display_name: `(로그인 없음 · ${anonymousId.slice(0, 8)})`,
          display_phone: null,
          is_identified: false,
        };

    return NextResponse.json({
      anonymous_id: anonymousId,
      identity,
      sessions: sessions || [],
      events: enrichedEvents,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
