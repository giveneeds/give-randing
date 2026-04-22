import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/downloads
 * query: magazine_id, campaign_id, from (ISO), to (ISO), delivery_method, q (email/name), limit, offset
 * 반환: { rows, total }
 *   rows[i] = {
 *     id, created_at, delivery_method, status, user_email, user_agent,
 *     user: { id, email, full_name },
 *     resource: { id, title, file_name },
 *     magazine: { id, title, slug } | null,
 *     campaign: { id, title, slug } | null,
 *   }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const magazineId = searchParams.get('magazine_id');
  const campaignId = searchParams.get('campaign_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const deliveryMethod = searchParams.get('delivery_method');
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  try {
    let query = supabaseAdmin
      .from('resource_downloads')
      .select(
        `id, created_at, delivery_method, status, user_email, user_agent,
         user_id, magazine_id, campaign_id,
         resource:content_resources!resource_downloads_resource_id_fkey ( id, title, file_name ),
         magazine:magazines!resource_downloads_magazine_id_fkey ( id, title, slug ),
         campaign:campaigns!resource_downloads_campaign_id_fkey ( id, title, slug )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (magazineId) query = query.eq('magazine_id', magazineId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
    if (deliveryMethod && deliveryMethod !== 'all') {
      query = query.eq('delivery_method', deliveryMethod);
    }
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (q) query = query.ilike('user_email', `%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    // profiles 조인이 PostgREST 경로상 번거로워 별도 조회 후 병합
    const userIds = Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean)));
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    const rows = (data || []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      delivery_method: r.delivery_method,
      status: r.status,
      user_email: r.user_email,
      user_agent: r.user_agent,
      user: profilesById[r.user_id] || { id: r.user_id, email: r.user_email, full_name: null },
      resource: r.resource || null,
      magazine: r.magazine || null,
      campaign: r.campaign || null,
    }));

    return NextResponse.json({ rows, total: count || 0, limit, offset });
  } catch (err) {
    return NextResponse.json({ error: err.message || '조회 실패' }, { status: 500 });
  }
}
