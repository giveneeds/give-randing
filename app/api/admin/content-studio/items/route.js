import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_SOURCES = new Set(['youtube', 'threads', 'instagram', 'hackernews', 'reddit', 'naver_news', 'google_news', 'web']);
const ALLOWED_STATUSES = new Set(['collected', 'reviewed', 'approved', 'rejected', 'sent']);

/**
 * GET /api/admin/content-studio/items
 *
 * 수집된 콘텐츠 아이템 목록 조회. 검수 카드 그리드 데이터 소스.
 *
 * Query:
 *   source    youtube | threads | instagram | hackernews | reddit | naver_news | google_news | web
 *   status    collected | reviewed | approved | rejected | sent
 *   limit     default 20, max 100
 *   offset    default 0
 *
 * 반환: { rows: agent_items[], total: number }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  try {
    let query = supabaseAdmin
      .from('agent_items')
      .select(
        'id, job_id, source, source_account, post_id, post_url, posted_at, collected_at, normalized, classification, summary, translation, status, send_flag, reviewed_at, note, notified_at, notification_message_id, approved_via',
        { count: 'exact' }
      )
      .order('collected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (source && ALLOWED_SOURCES.has(source)) query = query.eq('source', source);
    if (status && ALLOWED_STATUSES.has(status)) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data || [], total: count || 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
