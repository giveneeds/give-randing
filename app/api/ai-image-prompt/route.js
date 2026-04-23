import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 문단 원문을 이미지 생성용 "시각적 장면 묘사" 프롬프트로 변환
export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const { paragraph, category } = await request.json();
    if (!paragraph?.trim()) {
      return NextResponse.json({ error: '문단 텍스트가 필요합니다.' }, { status: 400 });
    }

    const text = paragraph.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);

    const instruction = `너는 매거진 에디터를 위해 글 문단을 읽고 그에 어울리는 "이미지 생성용 시각적 장면 묘사"를 만드는 조력자야.

규칙:
- 문단의 주제/분위기를 대표할 수 있는 구체적이고 시각적인 장면 1가지로 요약
- 사물·공간·풍경·텍스처 중심으로 묘사. 인물(얼굴/손/몸)은 쓰지 말 것
- 이미지 안에 텍스트·말풍선·차트·UI·카드뉴스 같은 요소는 쓰지 말 것
- 한국어 2~3문장 또는 영어 1~2문장, 총 40단어 이내
- 원문 문장을 그대로 옮기지 말고 시각적 요소로 재해석 (예: "광고가 멈추면 사라진다" → "불 꺼진 상점 간판, 저녁 거리의 빈 입구")
- 추상 개념(비용, 성장, 검색, 마케팅 등)은 상징적 사물로 치환 (예: 매출 → 영수증·계산기·분석 노트북 화면, 검색 → 모니터 위 돋보기·정돈된 책상)

카테고리 힌트: ${category || '일반 비즈니스'}

문단:
"""
${text}
"""

응답 형식: 설명 없이 최종 프롬프트 한 줄만 출력.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Gemini 오류: ' + errText }, { status: 502 });
    }

    const data = await res.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const prompt = output.replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0];

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트 생성 실패' }, { status: 422 });
    }
    return NextResponse.json({ prompt });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
