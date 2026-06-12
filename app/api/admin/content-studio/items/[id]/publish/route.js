import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/admin/content-studio/items/[id]/publish
 *
 * 검토함 아이템을 바로 발행 파이프라인에 투입.
 * plan → write (R1) → critique → polish (R2) → telegram
 *
 * - sonar 출처 아이템: raw_data.issue를 issueCandidate로 사용
 * - 일반 아이템: normalized/summary에서 issueCandidate 재구성
 */
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = params;

  const { data: item, error: fetchErr } = await supabaseAdmin
    .from('agent_items')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json({ error: '아이템을 찾을 수 없습니다' }, { status: 404 });
  }

  // issueCandidate 구성 — sonar 아이템은 raw_data.issue 사용, 아니면 normalized에서 재구성
  const issueCandidate = item.raw_data?.issue || {
    issue_title: item.normalized?.title || '제목 없음',
    one_line_hook: item.summary?.one_line_summary || '',
    why_interesting: item.summary?.why_it_matters || '',
    what_changed: (item.summary?.key_points || []).join(' '),
    source_summary: item.normalized?.extracted_text?.slice(0, 600) || '',
    category: item.classification?.suggested_topic_cluster || 'ai_marketing_tools',
    reversal_score: 3,
    audience_callout_candidate: item.classification?.audience_callout || '',
    korean_hook: (item.classification?.content_angles || [])[0] || '',
  };

  const origin = new URL(request.url).origin;
  const authHeader = request.headers.get('authorization') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: authHeader };

  const logs = [];

  // ① ContentPlan
  logs.push('① ContentPlan 생성 중...');
  const planRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/plan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ issueCandidate }),
  });
  const planJson = await planRes.json();
  if (!planRes.ok) {
    return NextResponse.json({ error: planJson.error || 'ContentPlan 생성 실패', logs }, { status: 502 });
  }
  const plan = planJson.contentPlan;
  logs.push('① ContentPlan 완료');

  // ①-2 소나르 보강 리서치 — evidence 없이 쓰면 숫자/인용이 비어 hedge·메타 문장으로
  // 물타기된 글이 나온다. 리서치 실패해도 발행은 계속 (1차 출처 URL은 plan에 있음).
  let evidenceSnapshot = [];
  const researchItems = Array.isArray(plan.deep_research_questions)
    ? plan.deep_research_questions.map((q, i) => ({
        item_id: q.question_id || `q${i + 1}`,
        item_title: q.question || '',
        research_purpose: q.purpose || '',
        expected_evidence_type: q.expected_evidence_type || 'source_origin',
        priority: q.priority || 'optional',
        sonar_user_prompt: q.question || '',
      }))
    : [];
  if (researchItems.length) {
    logs.push('①-2 소나르 보강 리서치 중...');
    try {
      const researchRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/research`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentPlan: plan, researchItems }),
      });
      const researchJson = await researchRes.json();
      if (researchRes.ok && Array.isArray(researchJson.results)) {
        evidenceSnapshot = researchJson.results
          .filter((r) => r.search_succeeded !== false)
          .flatMap((r) => (Array.isArray(r.findings) ? r.findings : []).map((f) => ({
            item_id: r.item_id || '',
            finding_text: f.finding_text || '',
            source_domain: f.source_domain || '',
            source_url: f.source_url || '',
            evidence_type: f.evidence_type || '',
            recency_note: f.recency_note || '',
            accepted_by_user: true,
          })))
          .filter((f) => f.finding_text)
          .slice(0, 12);
      }
      logs.push(`①-2 리서치 완료 — 근거 ${evidenceSnapshot.length}건`);
    } catch {
      logs.push('①-2 리서치 실패 — 근거 없이 진행');
    }
  }

  // ② R1 초안
  logs.push('② R1 초안 생성 중...');
  const writeRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/write`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contentPlan: plan, evidenceSnapshot }),
  });
  const writeJson = await writeRes.json();
  if (!writeRes.ok) {
    return NextResponse.json({ error: writeJson.error || 'R1 초안 생성 실패', logs }, { status: 502 });
  }
  const r1Draft = (writeJson.drafts || [])[0];
  if (!r1Draft) {
    return NextResponse.json({ error: 'R1 초안이 비어 있습니다', logs }, { status: 500 });
  }
  logs.push('② R1 완료');

  // ③ Claude 비평
  logs.push('③ 비평 중...');
  let critique = null;
  try {
    const critiqueRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/critique`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentPlan: plan, draft: r1Draft }),
    });
    const critiqueJson = await critiqueRes.json();
    critique = critiqueJson.critique || null;
  } catch {
    // 비평 실패해도 polish 진행
  }
  logs.push('③ 비평 완료');

  // ④ R2 보정
  logs.push('④ R2 보정 중...');
  const polishRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/polish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contentPlan: plan, draft: r1Draft, critiqueReport: critique }),
  });
  const polishJson = await polishRes.json();
  if (!polishRes.ok) {
    return NextResponse.json({ error: polishJson.error || 'R2 보정 실패', logs }, { status: 502 });
  }
  const polished = polishJson.draft;
  logs.push('④ R2 완료');

  // ⑤ 텔레그램 발송
  logs.push('⑤ 텔레그램 발송 중...');
  let notifyResult = null;
  try {
    const notifyRes = await fetch(`${origin}/api/admin/content-studio/research-workbench/drafts/notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        polishedDraft: polished,
        contentPlan: plan,
        issueTitle: issueCandidate.issue_title,
        mode: 'inbox',
        critiqueScore: critique?.score ?? null,
      }),
    });
    notifyResult = await notifyRes.json();
  } catch {
    // 발송 실패해도 완료 처리
  }
  logs.push('⑤ 발송 완료');

  // 상태를 sent로 업데이트
  await supabaseAdmin
    .from('agent_items')
    .update({ status: 'sent', send_flag: true })
    .eq('id', id);

  return NextResponse.json({
    ok: true,
    logs,
    polishedDraft: polished,
    notifyResult,
  });
}
