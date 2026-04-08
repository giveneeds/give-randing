import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.error) return gate.error;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .in('role', ['admin', 'superadmin'])
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data || [] });
}

export async function POST(request) {
  const gate = await requireAdmin(request, { superOnly: true });
  if (gate.error) return gate.error;

  try {
    const { email, password, full_name, role } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호가 필요합니다.' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }
    const targetRole = role === 'superadmin' ? 'superadmin' : 'admin';

    // 1. Auth 사용자 생성 (자동 confirm)
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || null },
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

    // 2. profile role 업그레이드 (트리거가 user로 만들어둠 → 갱신)
    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        full_name: full_name || null,
        role: targetRole,
        updated_at: new Date().toISOString(),
      });
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ success: true, user: { id: created.user.id, email, role: targetRole } });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request, { superOnly: true });
  if (gate.error) return gate.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    if (id === gate.user.id) {
      return NextResponse.json({ error: '본인 권한은 회수할 수 없습니다.' }, { status: 400 });
    }
    // role을 user로 강등 (계정 자체는 유지)
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'user', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
