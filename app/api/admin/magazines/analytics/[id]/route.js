import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminAnonIds } from '@/lib/analyticsFilters';

export const runtime = 'nodejs';

/**
 * GET /api/admin/magazines/analytics/[id]
 *
 * 매거진 글 1건의 상세 분석.
 *
 * Query:
 *   from         ISO (기본: 30일 전)
 *   to           ISO (기본: 현재)
 *
 * 반환:
 *   magazine: { id, slug, title, category, status, thumbnail_url, created_at }
 *   kpi: { views, unique_visitors, downloads, conversion_rate }
 *   daily: [{ date, views, unique_visitors }]    일자별 조회 추이
 *   viewers: [{                                   조회자 목록 (익명 ID 기준 집계)
 *     anonymous_id, view_count, first_view, last_view,
 *     kakao_name, kakao_phone, device_type, browser, user_id
 *   }]
 *   downloads: [{                                 자료 다운로드자 목록
 *     id, created_at, delivery_method, status,
 *     user_email, user_name, resource: { title, file_name }
 *   }]
 */
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = searchParams.get('from') || defaultFrom.toISOString();
  const to = searchParams.get('to') || now.toISOString();

  try {
    // 1) 매거진 메타
    const { data: mag, error: magErr } = await supabaseAdmin
      .from('magazines')
      .select('id, slug, title, category, status, thumbnail_url, created_at')
      .eq('id', id)
      .single();
    if (magErr || !mag) {
      return NextResponse.json({ error: '매거진을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2) 조회 이벤트 (해당 slug)
    const { data: events, error: evErr } = await supabaseAdmin
      .from('lead_events')
      .select('anonymous_id, created_at, event_data')
      .eq('event_type', 'magazine_view')
      .gte('created_at', from)
      .lte('created_at', to);
    if (evErr) throw evErr;

    // 어드민 본인이 한 번이라도 로그인했던 anonymous_id 누적 제외 — kpi/일자별/조회자 목록 모두 일관 적용.
    const adminAnonIds = await getAdminAnonIds();
    const myEvents = (events || []).filter(
      (e) => e.event_data?.slug === mag.slug && !(e.anonymous_id && adminAnonIds.has(e.anonymous_id))
    );

    // 일자별 집계 (KST 기준 YYYY-MM-DD)
    const dailyMap = new Map();
    const uniqSet = new Set();
    for (const e of myEvents) {
      const d = new Date(e.created_at);
      // 한국 시간(+09:00) 기준 날짜
      const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let bucket = dailyMap.get(kstDate);
      if (!bucket) {
        bucket = { date: kstDate, views: 0, uniq: new Set() };
        dailyMap.set(kstDate, bucket);
      }
      bucket.views += 1;
      if (e.anonymous_id) bucket.uniq.add(e.anonymous_id);
      if (e.anonymous_id) uniqSet.add(e.anonymous_id);
    }
    const daily = [...dailyMap.values()]
      .map((b) => ({ date: b.date, views: b.views, unique_visitors: b.uniq.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3) 조회자 목록 — anonymous_id 기준 집계 + lead_sessions에서 카카오 신원 매칭
    const viewerMap = new Map();
    for (const e of myEvents) {
      if (!e.anonymous_id) continue;
      let v = viewerMap.get(e.anonymous_id);
      if (!v) {
        v = {
          anonymous_id: e.anonymous_id,
          view_count: 0,
          first_view: e.created_at,
          last_view: e.created_at,
          kakao_name: null,
          kakao_phone: null,
          device_type: null,
          browser: null,
          user_id: null,
        };
        viewerMap.set(e.anonymous_id, v);
      }
      v.view_count += 1;
      if (e.created_at < v.first_view) v.first_view = e.created_at;
      if (e.created_at > v.last_view) v.last_view = e.created_at;
    }

    const anonIds = [...viewerMap.keys()];
    if (anonIds.length > 0) {
      const { data: sessions } = await supabaseAdmin
        .from('lead_sessions')
        .select('anonymous_id, kakao_name, kakao_phone, user_id, device_type, browser, session_start')
        .in('anonymous_id', anonIds)
        .order('session_start', { ascending: false });
      // anonymous_id마다 가장 최근 세션의 신원/디바이스 정보로 보강
      const seen = new Set();
      for (const s of sessions || []) {
        if (seen.has(s.anonymous_id)) continue;
        seen.add(s.anonymous_id);
        const v = viewerMap.get(s.anonymous_id);
        if (!v) continue;
        v.kakao_name = s.kakao_name || null;
        v.kakao_phone = s.kakao_phone || null;
        v.device_type = s.device_type || null;
        v.browser = s.browser || null;
        v.user_id = s.user_id || null;
      }
    }

    // 가입 신원 있는 사람 → 조회 횟수 → 최근 조회 시각 순으로 정렬
    const viewers = [...viewerMap.values()].sort((a, b) => {
      if (!!a.kakao_name !== !!b.kakao_name) return a.kakao_name ? -1 : 1;
      if (a.view_count !== b.view_count) return b.view_count - a.view_count;
      return a.last_view < b.last_view ? 1 : -1;
    });

    // 4) 다운로드 로그
    const { data: dls, error: dlErr } = await supabaseAdmin
      .from('resource_downloads')
      .select(`
        id, created_at, delivery_method, status, user_email, user_id,
        resource:content_resources(id, title, file_name)
      `)
      .eq('magazine_id', id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .limit(100);
    if (dlErr) throw dlErr;

    // 사용자 이름 보강 (leads.email 매칭, optional)
    const emails = [...new Set((dls || []).map((d) => d.user_email).filter(Boolean))];
    const nameByEmail = new Map();
    if (emails.length > 0) {
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('email, name, company_name')
        .in('email', emails);
      for (const l of leads || []) {
        if (l.email) nameByEmail.set(l.email, { name: l.name, company: l.company_name });
      }
    }
    const downloads = (dls || []).map((d) => ({
      id: d.id,
      created_at: d.created_at,
      delivery_method: d.delivery_method,
      status: d.status,
      user_email: d.user_email,
      user_name: d.user_email ? nameByEmail.get(d.user_email)?.name || null : null,
      user_company: d.user_email ? nameByEmail.get(d.user_email)?.company || null : null,
      resource: d.resource || null,
    }));

    const kpi = {
      views: myEvents.length,
      unique_visitors: uniqSet.size,
      downloads: downloads.length,
      conversion_rate: myEvents.length > 0 ? +(downloads.length / myEvents.length * 100).toFixed(2) : 0,
    };

    return NextResponse.json({ magazine: mag, kpi, daily, viewers, downloads, range: { from, to } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
