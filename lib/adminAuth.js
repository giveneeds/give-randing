import { NextResponse } from 'next/server';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Bearer 토큰 → Supabase 사용자 → profiles.role 확인.
 * { user, profile, error } 반환. error가 있으면 NextResponse 객체.
 */
export async function requireAdmin(request, { superOnly = false } = {}) {
  const { user } = await createSupabaseFromRequest(request);
  if (!user) {
    return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }
  if (!supabaseAdmin) {
    return { error: NextResponse.json({ error: 'service role 미설정' }, { status: 500 }) };
  }
  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', user.id)
    .maybeSingle();
  if (pErr) {
    return { error: NextResponse.json({ error: pErr.message }, { status: 500 }) };
  }
  const role = profile?.role;
  const allowed = superOnly ? role === 'superadmin' : role === 'admin' || role === 'superadmin';
  if (!allowed) {
    return { error: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) };
  }
  return { user, profile };
}
