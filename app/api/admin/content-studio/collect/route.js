import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runCollection } from '@/lib/agent/runCollection';

export const runtime = 'nodejs';
// 수집은 외부 API 여러 번 호출 + LLM 호출 — 시간이 좀 걸림.
export const maxDuration = 300;

/**
 * POST /api/admin/content-studio/collect
 *
 * 활성 소스 전체 또는 지정한 소스에 대해 수집 실행.
 *
 * Body: { sourceIds?: string[] }  (없으면 active=true 인 전부)
 * 반환: { jobId, stats, errors }
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await request.json(); } catch {}

  try {
    const result = await runCollection({
      trigger: 'manual',
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
