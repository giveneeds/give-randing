import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runCollection } from '@/lib/agent/runCollection';
import { runAutoContentPlanning } from '@/lib/agent/runAutoContentPlanning';

export const runtime = 'nodejs';
// 수집은 외부 API 여러 번 호출 + LLM 호출 — 시간이 좀 걸림.
export const maxDuration = 300;

/**
 * POST /api/admin/content-studio/collect
 *
 * 활성 소스 전체 또는 지정한 소스에 대해 수집 실행.
 *
 * Body:
 *   sourceIds?: string[]    없으면 active=true 인 전부
 *   dispatch?: boolean      true 면 수집 후 1차 자동 보고(planning) 까지 즉시 실행 (cron 흐름)
 *   cronLikeCap?: boolean   true 면 cron 처럼 src 당 1건만 처리
 *
 * 반환: { jobId, stats, errors, planning? }
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await request.json(); } catch {}

  try {
    const result = await runCollection({
      trigger: body.cronLikeCap ? 'cron' : 'manual',
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : undefined,
    });

    let planning = null;
    if (body.dispatch) {
      const p = await runAutoContentPlanning({ jobId: result.jobId });
      planning = {
        session_id: p.sessionId,
        sent: p.sent,
        candidates: p.candidateCount,
        skipped_reason: p.skippedReason || null,
      };
    }

    return NextResponse.json({ ...result, planning });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
