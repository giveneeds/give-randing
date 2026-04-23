import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: '본문이 비어있습니다.' }, { status: 400 });
    }

    // HTML 태그 제거 후 최대 3000자
    const plainText = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    const prompt = `다음 매거진 본문에 어울리는 한국어 제목을 5개 제안해주세요.
조건:
- 각 제목은 최대 40자 이내
- 클릭을 유도하는 매력적인 제목
- B2B 마케팅/비즈니스 매거진 톤앤매너
- 한국어로 작성
- JSON 배열 형식으로만 응답: ["제목1", "제목2", "제목3", "제목4", "제목5"]

본문:
${plainText}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Gemini API 오류: ' + errText }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let titles;
    try {
      titles = JSON.parse(text);
    } catch {
      // 실패 시 라인 단위로 파싱
      titles = text.split('\n').map((l) => l.replace(/^[-*\d."'\s]+/, '').trim()).filter(Boolean).slice(0, 5);
    }

    return NextResponse.json({ titles: Array.isArray(titles) ? titles.slice(0, 5) : [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
