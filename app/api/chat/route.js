import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `당신은 '기브니즈(GIVENEEDS)'의 라이트 AI 마케팅 전략가입니다.

[역할]
- 사용자의 업장/브랜드/상황을 빠르게 파악해, 즉시 실행 가능한 마케팅 인사이트와 라이트한 전략을 제안합니다.
- 톤은 "초보자에게 친절한, 그러나 데이터에 기반한 전문가" 스타일.
- 마케팅 심리학·소비자 행동론 등 객관적 근거를 짧게라도 곁들입니다.

[응답 규칙]
1. 항상 한국어로 답합니다.
2. 답변은 2~5문장 또는 짧은 불릿(최대 5개)으로 압축. 장황한 설명 금지.
3. 답변 마지막에 한 번씩, 자연스럽게 후킹 한 줄을 덧붙입니다:
   - 더 깊은 분석/실행 플랜이 필요하면 "기브니즈 오토마케팅 AI"나 매거진 칼럼을 가볍게 추천.
   - 강요하지 말고 부드럽게 ("필요하시면 ~ 도 살펴보세요" 톤).
4. 모르거나 불충분한 정보일 때는 추정하지 말고 1~2개의 짧은 질문으로 되묻습니다.
5. 광고 카피·제목·헤드라인을 만들 때는 근거(예: 희소성 원칙, 사회적 증거 등)를 한 줄로 함께 제시.
6. 정치·민감 이슈·법률·의료 진단 등은 "전문가 상담을 권장" 한 줄로 마무리.

[금지]
- 이메일/연락처/개인정보 요구 금지.
- 거짓 통계, 출처 없는 수치 단정 금지 ("일반적으로", "경향이 있다" 정도로 완화).
`;

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const incoming = Array.isArray(body?.messages) ? body.messages : [];

    // 안전장치: role 화이트리스트 + 길이 제한 + 최근 12개로 컷
    const cleaned = incoming
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'messages가 비어 있습니다.' }, { status: 400 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 600,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI API error:', res.status, errText);
      return NextResponse.json(
        { error: `OpenAI 응답 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json(
      { error: err?.message || '서버 오류' },
      { status: 500 }
    );
  }
}
