import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

// 카카오 로그인 후 기존 세션에 신원 정보 소급 업데이트
export async function PATCH(request, { params }) {
  if (isDummyMode) return NextResponse.json({ ok: true });

  const { sessionId } = await params;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  try {
    const { user_id, kakao_name, kakao_phone } = await request.json();

    const updates = {};
    if (user_id) updates.user_id = user_id;
    if (kakao_name) updates.kakao_name = kakao_name;
    if (kakao_phone) updates.kakao_phone = kakao_phone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { error } = await supabase
      .from('lead_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
