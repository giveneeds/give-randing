import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/content-studio/ai-logs
 *
 * LLM 호출 이력. 시간 내림차순. 현재 비어 있을 수 있음.
 *
 * Query:
 *   limit  default 50, max 200
 *
 * 반환: { rows: agent_ai_logs[] }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  try {
    const { data, error } = await supabaseAdmin
      .from('agent_ai_logs')
      .select('id, item_id, job_id, stage, model, prompt, response, input_tokens, output_tokens, cost_usd, latency_ms, error, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
