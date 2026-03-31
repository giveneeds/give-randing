import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { id, password } = await request.json();
    const adminId = process.env.ADMIN_ID || 'giveneeds1@naver.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'giveneeds12@';

    if (id === adminId && password === adminPassword) {
      const response = NextResponse.json({ success: true });
      // Set a simple auth cookie (httpOnly for security)
      response.cookies.set('admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request) {
  const cookie = request.cookies.get('admin_auth');
  if (cookie?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
