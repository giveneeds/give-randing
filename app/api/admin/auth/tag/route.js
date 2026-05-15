import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { ADMIN_TAG_COOKIE } from '@/lib/botFilter';

export const runtime = 'nodejs';

// 어드민 본인 디바이스를 분석에서 누적 제외하기 위한 마커 쿠키.
// 로그인 검증을 통과한 디바이스에 1년 유효 쿠키 발급. 이후 비로그인 상태로 들러도
// Tracker / events 라우트가 쿠키만 보고 모두 skip.

const MAX_AGE = 60 * 60 * 24 * 365;

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_TAG_COOKIE, '1', {
    path: '/',
    maxAge: MAX_AGE,
    sameSite: 'lax',
    httpOnly: false, // Tracker 가 즉시 읽고 skip 판정해야 해서 httpOnly 끔
    secure: true,
  });
  return res;
}

export async function DELETE() {
  // 공용 PC 등에서 어드민 분류를 명시적으로 해제할 때 사용.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_TAG_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
