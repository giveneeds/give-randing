// phase2 어드민 트리거 — 텔레그램 없이 어드민에서 직접 후보를 채택해 글 생성까지 실행.
//
// 텔레그램 webhook(app/api/webhook/telegram/route.js)이 하던 잠금 로직을 그대로 재현한다:
//   1) 세션을 phase2_running 으로 잠가 이중 실행 방지
//   2) finishPlanningSession 호출 (2차 리서치 → 글 생성 → 저장 → 완료)
//
// 응답은 finishPlanningSession 완료까지 await — 어드민은 완료 후 단계 리플레이로 이동한다.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { finishPlanningSession } from '@/lib/agent/finishPlanningSession';

export const runtime = 'nodejs';
// 2차 리서치 + LLM 글 생성 — 시간이 걸림.
export const maxDuration = 300;

export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { sessionId } = await params;
  let body = {};
  try { body = await request.json(); } catch {}

  const { data: session, error: sessErr } = await supabaseAdmin
    .from('planning_sessions')
    .select('id, status, candidate_item_ids, candidates_summary')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });

  // 이중 실행 방지 — 이미 진행 중이거나 완료된 세션은 거부.
  if (session.status === 'phase2_running') {
    return NextResponse.json({ error: '이미 진행 중인 세션입니다.' }, { status: 409 });
  }
  if (session.status === 'completed') {
    return NextResponse.json({ error: '이미 완료된 세션입니다.' }, { status: 409 });
  }

  const selectedItemId = body.selectedItemId;
  if (!selectedItemId) {
    return NextResponse.json({ error: 'selectedItemId 가 필요합니다.' }, { status: 400 });
  }
  // 채택 후보가 세션 후보 목록에 있는지 확인.
  const candidateIds = Array.isArray(session.candidate_item_ids) ? session.candidate_item_ids : [];
  if (candidateIds.length > 0 && !candidateIds.includes(selectedItemId)) {
    return NextResponse.json({ error: '이 세션의 후보가 아닙니다.' }, { status: 400 });
  }

  // webhook 과 동일 — 세션을 phase2_running 으로 잠그고 채택 정보를 기록.
  await supabaseAdmin
    .from('planning_sessions')
    .update({
      status: 'phase2_running',
      selected_item_id: selectedItemId,
      user_decision_raw: '어드민 직접 채택',
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  try {
    const result = await finishPlanningSession({
      sessionId,
      selectedItemId,
      variantCount: body.variantCount,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || '글 생성에 실패했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sessionId, draftId: result.draftId });
  } catch (e) {
    // finishPlanningSession 내부에서 세션을 failed 로 마무리하지만, 예외가 새어나오면 여기서도 방어.
    await supabaseAdmin
      .from('planning_sessions')
      .update({ status: 'failed', error: e.message, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
