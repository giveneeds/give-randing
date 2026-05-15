import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runCollection } from '@/lib/agent/runCollection';
import { sendItemCards } from '@/lib/agent/sendDailyDigest';

export const runtime = 'nodejs';
// 수집은 외부 API 여러 번 호출 + LLM 호출 — 시간이 좀 걸림.
export const maxDuration = 300;

/**
 * POST /api/admin/content-studio/collect
 *
 * 활성 소스 전체 또는 지정한 소스에 대해 수집 실행.
 *
 * Body:
 *   sourceIds?: string[]          없으면 active=true 인 전부
 *   dispatch?: boolean            true 면 수집 후 텔레그램 카드까지 자동 발송 (cron 흐름과 동일)
 *   cronLikeCap?: boolean         true 면 cron 처럼 src 당 1건만 처리 (테스트용)
 *
 * 반환: { jobId, stats, errors, dispatch? }
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await request.json(); } catch {}

  try {
    // cronLikeCap=true 면 trigger='cron' 으로 흘려보내 매체별 cap이 작동하게 한다.
    const result = await runCollection({
      trigger: body.cronLikeCap ? 'cron' : 'manual',
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : undefined,
    });

    let dispatch = null;
    if (body.dispatch) {
      dispatch = await sendItemCards({ jobId: result.jobId });
    }

    return NextResponse.json({ ...result, dispatch });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
