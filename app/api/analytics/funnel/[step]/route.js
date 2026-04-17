import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET(request, { params }) {
  if (isDummyMode) return NextResponse.json({ rows: [] });

  const { step } = await params;

  try {
    switch (step) {

      case 'sessions': {
        // 세션 목록 + 신원 (leads 테이블 join via lead_id)
        const { data, error } = await supabase
          .from('lead_sessions')
          .select(`
            id,
            anonymous_id,
            kakao_name,
            kakao_phone,
            channel_group,
            device_type,
            browser,
            session_start,
            landing_url,
            referrer,
            lead_id,
            leads ( name, phone, email )
          `)
          .order('session_start', { ascending: false })
          .limit(50);

        if (error) throw error;

        const rows = (data || []).map(s => ({
          id: s.id,
          anonymous_id: s.anonymous_id,
          display_name:
            s.kakao_name ||
            s.leads?.name ||
            `(로그인 없음 · ${(s.anonymous_id || '').slice(0, 8)})`,
          display_phone: s.kakao_phone || s.leads?.phone || null,
          channel_group: s.channel_group,
          device_type: s.device_type,
          browser: s.browser,
          session_start: s.session_start,
          landing_url: s.landing_url,
          referrer: s.referrer,
          is_identified: !!(s.kakao_name || s.leads?.name),
        }));

        return NextResponse.json({ rows });
      }

      case 'content': {
        // 콘텐츠 조회 이벤트 — page_url별 집계
        const { data, error } = await supabase
          .from('lead_events')
          .select('page_url, event_type')
          .in('event_type', ['magazine_view', 'service_view']);

        if (error) throw error;

        const map = {};
        for (const e of data || []) {
          const key = e.page_url || '(unknown)';
          if (!map[key]) map[key] = { page_url: key, count: 0, event_type: e.event_type };
          map[key].count++;
        }

        const rows = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 30);
        return NextResponse.json({ rows });
      }

      case 'cta': {
        // CTA 클릭 이벤트 — page_url + cta_id별 집계
        const { data, error } = await supabase
          .from('lead_events')
          .select('page_url, event_data')
          .eq('event_type', 'cta_click');

        if (error) throw error;

        const map = {};
        for (const e of data || []) {
          const ctaId = e.event_data?.cta_id || e.event_data?.label || '(unknown)';
          const key = `${e.page_url || ''}::${ctaId}`;
          if (!map[key]) {
            map[key] = {
              page_url: e.page_url || '(unknown)',
              cta_id: ctaId,
              label: e.event_data?.label || null,
              count: 0,
            };
          }
          map[key].count++;
        }

        const rows = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 30);
        return NextResponse.json({ rows });
      }

      case 'leads': {
        // 최근 리드 20건
        const { data, error } = await supabase
          .from('leads')
          .select('id, name, phone, email, company_name, pipeline_stage, channel_group, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        return NextResponse.json({ rows: data || [] });
      }

      default:
        return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
