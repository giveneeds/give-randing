import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const STYLE_PROMPTS = {
  realistic: '실사 사진, 고화질, 자연스러운 빛, 전문 사진작가 촬영, 8K, photorealistic, natural lighting, professional photography',
  minimal: '미니멀리즘, 깔끔한 배경, 단순한 구성, 화이트 스튜디오, 스칸디나비안 스타일, minimalist, clean white background, simple composition, Scandinavian design',
  editorial: '매거진 에디토리얼 스타일, 세련된, 고급스러운, 모던, editorial magazine style, sophisticated, luxury, modern aesthetic',
};

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const { prompt, style = 'realistic' } = await request.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: '이미지 설명(프롬프트)을 입력해주세요.' }, { status: 400 });
    }

    const styleHint = STYLE_PROMPTS[style] || STYLE_PROMPTS.realistic;
    const fullPrompt = `${prompt.trim()}, ${styleHint}`;

    // Gemini 이미지 생성 API 호출
    const model = 'gemini-2.5-flash-image';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[ai-image] Gemini API error:', errText);
      return NextResponse.json({ error: 'Gemini API 호출 실패: ' + errText }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart) {
      return NextResponse.json({ error: '이미지를 생성하지 못했습니다. 다른 프롬프트를 시도해보세요.' }, { status: 422 });
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `articles/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('magazine-images')
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: '이미지 저장 실패: ' + uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from('magazine-images').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (err) {
    console.error('[ai-image] unexpected error:', err);
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
