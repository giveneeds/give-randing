import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STYLE_HINTS = {
  realistic: 'documentary-style photograph, natural lighting, candid moment, shot on Fujifilm, shallow depth of field, authentic and unstaged',
  minimal: 'minimalist composition, lots of negative space, soft diffused light, muted neutral palette, clean editorial aesthetic',
  editorial: 'sophisticated editorial photography, high-end magazine spread, considered composition, cinematic mood',
};

// AI 티 안 나게 하는 공통 negative/positive 키워드
const ANTI_AI_SUFFIX = 'photorealistic, subtle imperfections, natural grain, not CGI, not digital art, not illustration, avoid plastic skin';

async function generateOne(apiKey, fullPrompt) {
  const model = 'gemini-2.5-flash-image';
  const res = await fetch(
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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) throw new Error('NO_IMAGE');
  return imagePart.inlineData;
}

async function uploadToStorage({ mimeType, data }) {
  const buffer = Buffer.from(data, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `articles/${filename}`;
  const { error } = await supabaseAdmin.storage
    .from('magazine-images')
    .upload(path, buffer, { contentType: mimeType, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabaseAdmin.storage.from('magazine-images').getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

// 카테고리 기반 누적 선호도 조회 — 최근 5개 선택에서 style_tags 빈도 집계
async function getPreferenceBoost(category) {
  if (!category) return '';
  try {
    const { data } = await supabaseAdmin
      .from('ai_image_preferences')
      .select('style_tags')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!data || data.length < 3) return '';
    const counts = {};
    data.forEach((row) => {
      (row.style_tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
    return top.length > 0 ? top.join(', ') : '';
  } catch {
    return '';
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const { prompt, style = 'realistic', count = 1, category, paragraph_context } = await request.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: '이미지 설명(프롬프트)을 입력해주세요.' }, { status: 400 });
    }

    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 5);
    const styleHint = STYLE_HINTS[style] || STYLE_HINTS.realistic;
    const preferenceBoost = await getPreferenceBoost(category);

    // 사용자 입력을 최우선으로, 스타일/선호도는 참고 힌트로 뒤에 배치
    const parts = [
      prompt.trim(),
      paragraph_context ? `Context: ${paragraph_context.slice(0, 200)}` : '',
      `Style: ${styleHint}`,
      preferenceBoost ? `Preferred elements: ${preferenceBoost}` : '',
      ANTI_AI_SUFFIX,
    ].filter(Boolean);
    const fullPrompt = parts.join(' | ');

    // N장 병렬 생성
    const results = await Promise.allSettled(
      Array.from({ length: safeCount }, () => generateOne(apiKey, fullPrompt)),
    );

    const images = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        try {
          const uploaded = await uploadToStorage(r.value);
          images.push(uploaded);
        } catch (e) {
          console.error('[ai-image] upload fail:', e.message);
        }
      } else {
        console.error('[ai-image] gen fail:', r.reason?.message);
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: '이미지를 생성하지 못했습니다. 다른 프롬프트를 시도해보세요.' }, { status: 422 });
    }

    // 하위 호환: count=1이면 기존 { url, path } 형태로도 반환
    return NextResponse.json({
      images,
      url: images[0].url,
      path: images[0].path,
      promptUsed: fullPrompt,
    });
  } catch (err) {
    console.error('[ai-image] unexpected error:', err);
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
