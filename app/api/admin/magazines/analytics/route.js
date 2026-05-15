import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminAnonIds } from '@/lib/analyticsFilters';

export const runtime = 'nodejs';

/**
 * GET /api/admin/magazines/analytics
 *
 * 매거진 글별 조회수 / 고유 방문자 / 자료 다운로드 집계.
 *
 * Query:
 *   from         ISO 시각 (기본: 30일 전)
 *   to           ISO 시각 (기본: 현재)
 *   category     매거진 카테고리 필터
 *   status       'published' | 'draft' | 'all' (기본: all)
 *   q            제목 부분일치
 *
 * 반환 rows[i] = {
 *   id, slug, title, category, status, thumbnail_url, created_at, updated_at,
 *   views, unique_visitors, downloads, conversion_rate, last_activity_at
 * }
 * + summary = { total_views, total_unique_visitors, total_downloads, overall_conversion }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = searchParams.get('from') || defaultFrom.toISOString();
  const to = searchParams.get('to') || now.toISOString();
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'all';
  const q = (searchParams.get('q') || '').trim();

  try {
    // 1) 매거진 목록 — 필터 적용
    let magQuery = supabaseAdmin
      .from('magazines')
      .select('id, slug, title, category, status, thumbnail_url, created_at, updated_at');
    if (status !== 'all') magQuery = magQuery.eq('status', status);
    if (category) magQuery = magQuery.eq('category', category);
    if (q) magQuery = magQuery.ilike('title', `%${q}%`);
    const { data: magazines, error: magErr } = await magQuery;
    if (magErr) throw magErr;
    if (!magazines || magazines.length === 0) {
      return NextResponse.json({
        rows: [],
        summary: { total_views: 0, total_unique_visitors: 0, total_downloads: 0, overall_conversion: 0 },
        range: { from, to },
      });
    }

    const slugSet = new Set(magazines.map((m) => m.slug));
    const idSet = new Set(magazines.map((m) => m.id));

    // 2) 조회 이벤트 — slug별 집계용
    const { data: events, error: evErr } = await supabaseAdmin
      .from('lead_events')
      .select('anonymous_id, event_data, created_at')
      .eq('event_type', 'magazine_view')
      .gte('created_at', from)
      .lte('created_at', to);
    if (evErr) throw evErr;

    // 어드민이 한 번이라도 로그인했던 anonymous_id 누적 제외.
    // 본인이 비로그인 상태로 들렀던 이력까지 후행 제거.
    const adminAnonIds = await getAdminAnonIds();

    // 3) 다운로드 — magazine_id별 집계용
    const { data: downloads, error: dlErr } = await supabaseAdmin
      .from('resource_downloads')
      .select('magazine_id, created_at')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('magazine_id', 'is', null);
    if (dlErr) throw dlErr;

    // 슬러그 기준 조회 집계
    const viewsBySlug = new Map(); // slug → { views, uniqueSet:Set, lastAt }
    for (const e of events || []) {
      const s = e.event_data?.slug;
      if (!s || !slugSet.has(s)) continue;
      if (e.anonymous_id && adminAnonIds.has(e.anonymous_id)) continue; // 어드민 본인 활동 제외
      let v = viewsBySlug.get(s);
      if (!v) {
        v = { views: 0, uniqueSet: new Set(), lastAt: null };
        viewsBySlug.set(s, v);
      }
      v.views += 1;
      if (e.anonymous_id) v.uniqueSet.add(e.anonymous_id);
      if (!v.lastAt || e.created_at > v.lastAt) v.lastAt = e.created_at;
    }

    // magazine_id 기준 다운로드 집계
    const downloadsByMag = new Map();
    for (const d of downloads || []) {
      if (!idSet.has(d.magazine_id)) continue;
      let dd = downloadsByMag.get(d.magazine_id);
      if (!dd) {
        dd = { downloads: 0, lastAt: null };
        downloadsByMag.set(d.magazine_id, dd);
      }
      dd.downloads += 1;
      if (!dd.lastAt || d.created_at > dd.lastAt) dd.lastAt = d.created_at;
    }

    // 행 조립
    const rows = magazines.map((m) => {
      const v = viewsBySlug.get(m.slug) || { views: 0, uniqueSet: new Set(), lastAt: null };
      const dd = downloadsByMag.get(m.id) || { downloads: 0, lastAt: null };
      const lastA = v.lastAt;
      const lastB = dd.lastAt;
      const last_activity_at = lastA && lastB ? (lastA > lastB ? lastA : lastB) : lastA || lastB || null;
      const conversion_rate = v.views > 0 ? +(dd.downloads / v.views * 100).toFixed(2) : 0;
      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        category: m.category,
        status: m.status,
        thumbnail_url: m.thumbnail_url,
        created_at: m.created_at,
        updated_at: m.updated_at,
        views: v.views,
        unique_visitors: v.uniqueSet.size,
        downloads: dd.downloads,
        conversion_rate,
        last_activity_at,
      };
    });

    // 정렬: 조회수 내림차순
    rows.sort((a, b) => b.views - a.views);

    const summary = rows.reduce(
      (acc, r) => {
        acc.total_views += r.views;
        acc.total_unique_visitors += r.unique_visitors;
        acc.total_downloads += r.downloads;
        return acc;
      },
      { total_views: 0, total_unique_visitors: 0, total_downloads: 0 }
    );
    summary.overall_conversion = summary.total_views > 0
      ? +(summary.total_downloads / summary.total_views * 100).toFixed(2)
      : 0;

    return NextResponse.json({ rows, summary, range: { from, to } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
