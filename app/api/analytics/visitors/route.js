import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET() {
  if (isDummyMode) return NextResponse.json({ visitors: [] });

  try {
    // anonymous_id별 최신 세션 + 이벤트 수 집계
    const { data: sessions, error: sessErr } = await supabase
      .from('lead_sessions')
      .select('anonymous_id, kakao_name, kakao_phone, channel_group, device_type, session_start, lead_id, leads(name, phone)')
      .order('session_start', { ascending: false });

    if (sessErr) throw sessErr;

    // anonymous_id 기준으로 묶기 (가장 최근 세션 정보 사용)
    const visitorMap = {};
    for (const s of sessions || []) {
      const aid = s.anonymous_id;
      if (!visitorMap[aid]) {
        visitorMap[aid] = {
          anonymous_id: aid,
          display_name:
            s.kakao_name ||
            s.leads?.name ||
            `(로그인 없음 · ${(aid || '').slice(0, 8)})`,
          display_phone: s.kakao_phone || s.leads?.phone || null,
          is_identified: !!(s.kakao_name || s.leads?.name),
          channel_group: s.channel_group,
          device_type: s.device_type,
          last_seen: s.session_start,
          session_count: 0,
        };
      }
      visitorMap[aid].session_count++;
    }

    // 각 방문자의 이벤트 수 + 최근 페이지들
    const anonymousIds = Object.keys(visitorMap);
    if (anonymousIds.length > 0) {
      const { data: events } = await supabase
        .from('lead_events')
        .select('anonymous_id, event_type, page_url, created_at')
        .in('anonymous_id', anonymousIds)
        .order('created_at', { ascending: true });

      for (const e of events || []) {
        const v = visitorMap[e.anonymous_id];
        if (!v) continue;
        if (!v.event_count) v.event_count = 0;
        v.event_count++;
        // 최근 3개 page_view URL 수집
        if (e.event_type === 'page_view') {
          if (!v.recent_pages) v.recent_pages = [];
          if (!v.recent_pages.includes(e.page_url)) {
            v.recent_pages.push(e.page_url);
          }
        }
      }
    }

    const visitors = Object.values(visitorMap)
      .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
      .slice(0, 100);

    return NextResponse.json({ visitors });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
