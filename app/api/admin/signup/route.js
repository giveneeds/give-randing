import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 어드민 간편 가입 — 암호키(passkey) 확인 후 admin 계정 즉시 생성
const PASSKEY = 'giveneeds12';

export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '서버 설정 오류 (service role 미구성)' }, { status: 500 });
  }

  try {
    const { email, password, full_name, passkey } = await request.json();

    if (!passkey || passkey !== PASSKEY) {
      return NextResponse.json({ error: '암호키가 일치하지 않습니다.' }, { status: 403 });
    }
    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호가 필요합니다.' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 1) Auth 사용자 생성 (자동 confirm)
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || null },
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

    // 2) profile 에 admin 권한 부여
    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        full_name: full_name || null,
        role: 'admin',
        updated_at: new Date().toISOString(),
      });
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ success: true, email });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
