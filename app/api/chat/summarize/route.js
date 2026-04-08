import { NextResponse } from 'next/server';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUMMARY_PROMPT = `당신은 기브니즈 어드민을 위한 고객 요약 작성자입니다.
아래 대화 기록을 바탕으로 다음 4개 섹션을 한국어 Markdown으로 간결하게 작성하세요.

## 고객 페르소나
- 추정 업종, 규모, 운영 성숙도

## 핵심 고민
- 가장 크게 호소한 문제 1~3가지 (구체적으로)

## 추천된 기브니즈 상품
- 대화 중 언급되거나 적합해 보이는 상품명 + 왜

## 다음 액션
- 어드민 또는 영업 담당자가 취할 다음 행동 제안 1~3개

[규칙]
- 각 섹션은 3줄 이내.
- 추측은 "보이는 편", "가능성" 등으로 완화.
- 사용자가 실제 말하지 않은 수치/사실을 꾸며내지 말 것.
- 개인정보(이메일, 전화) 노출 금지.
- Markdown만 출력.`;

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    const { supabase: userSupabase, user } = await createSupabaseFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { sessionId } = await request.json().catch(() => ({}));
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId가 필요합니다.' }, { status: 400 });
    }

    // 세션 소유 확인 — 어드민 권한은 별도 미구현, 일단 본인 세션만 요약
    // (어드민 페이지에서 호출 시에도 로그인 사용자는 어드민 계정이므로
    //  향후 role 체크를 추가할 수 있음)
    const { data: session, error: sErr } = await userSupabase
      .from('chat_sessions')
      .select('id,user_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 메시지 조회 — 본인 세션이면 userSupabase로 RLS 통과
    const { data: messages, error: mErr } = await userSupabase
      .from('chat_messages')
      .select('role,content,created_at,step')
      .eq('session_uuid', sessionId)
      .order('created_at', { ascending: true });
    if (mErr) throw mErr;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: '메시지가 없습니다.' }, { status: 404 });
    }

    const transcript = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: transcript.slice(0, 12000) },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Summarize OpenAI error:', res.status, errText);
      return NextResponse.json(
        { error: `OpenAI 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || '';

    // DB 업데이트 — 본인 세션만 가능 (RLS). 어드민도 현재는 자신의 계정 한정.
    const { error: uErr } = await userSupabase
      .from('chat_sessions')
      .update({
        ai_summary: summary,
        ai_summary_updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    if (uErr) console.warn('summary update failed:', uErr.message);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('summarize error:', err);
    return NextResponse.json({ error: err?.message || '서버 오류' }, { status: 500 });
  }
}
