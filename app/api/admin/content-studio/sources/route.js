import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'youtube', 'threads', 'instagram', 'hackernews',
  'naver_news', 'google_news', 'reddit',
]);

/**
 * GET /api/admin/content-studio/sources
 * 반환: { rows: agent_sources[] }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_sources')
      .select('id, source_type, identifier, label, active, last_collected_at, meta, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/content-studio/sources
 * Body: { source_type, identifier, label?, meta? }
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const source_type = String(body.source_type || '').trim();
  const identifier = String(body.identifier || '').trim().replace(/^@/, '');
  const label = body.label ? String(body.label).slice(0, 200) : null;
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

  if (!ALLOWED_TYPES.has(source_type)) {
    return NextResponse.json({ error: '허용되지 않는 source_type' }, { status: 400 });
  }
  if (!identifier) {
    return NextResponse.json({ error: 'identifier 누락' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_sources')
      .insert({ source_type, identifier, label, meta, active: true })
      .select('id, source_type, identifier, label, active, last_collected_at, meta, created_at, updated_at')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 소스입니다' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
