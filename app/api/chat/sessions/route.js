import { NextResponse } from 'next/server';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — 새 세션 생성 또는 기존 세션 업데이트
// body: { sessionId?, trail?, answers?, current_step? }
export async function POST(request) {
  try {
    const { supabase, user } = await createSupabaseFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, trail, answers, current_step } = body;

    // 리드 매칭 — 가장 최근 본인 리드 (있으면)
    let leadId = null;
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      leadId = lead?.id || null;
    } catch {
      /* leads 접근 실패는 치명적이지 않음 */
    }

    if (sessionId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          trail: trail ?? undefined,
          answers: answers ?? undefined,
          current_step: current_step ?? undefined,
          last_active_at: new Date().toISOString(),
          lead_id: leadId ?? undefined,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ session: data });
    }

    // 새 세션 생성
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        lead_id: leadId,
        trail: trail || {},
        answers: answers || {},
        current_step: current_step || 'greet',
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error('sessions POST error:', err);
    return NextResponse.json({ error: err?.message || '서버 오류' }, { status: 500 });
  }
}

// GET — 본인 세션 목록
export async function GET(request) {
  try {
    const { supabase, user } = await createSupabaseFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch (err) {
    return NextResponse.json({ error: err?.message || '서버 오류' }, { status: 500 });
  }
}
