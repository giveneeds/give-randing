import { NextResponse } from 'next/server';
import { runCollection } from '@/lib/agent/runCollection';
import { sendItemCards } from '@/lib/agent/sendDailyDigest';

export const runtime = 'nodejs';
// 외부 API + LLM enrich + 다이제스트 발송 = 길어질 수 있음. Vercel hobby plan 한도 60s, Pro 300s.
export const maxDuration = 300;

function timingSafeEqual(a, b) {
  // 상수 시간 비교. 비밀번호 비교 시 권장 패턴.
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * POST /api/cron/collect
 *
 * GitHub Actions cron 이 호출하는 엔드포인트.
 * Authorization: Bearer <CRON_SECRET> 헤더 검증.
 *
 * 흐름: runCollection → sendDailyDigest → 결과 반환.
 */
export async function POST(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!timingSafeEqual(token, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runCollection({ trigger: 'cron' });
    // 건당 카드 + 승인/반려 버튼으로 발송. fit_score 낮은 건은 자동 스킵.
    const dispatch = await sendItemCards({ jobId: result.jobId });
    return NextResponse.json({
      ok: true,
      jobId: result.jobId,
      stats: result.stats,
      errors: result.errors,
      dispatch,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
