import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

// 스타일 태그 추출 — 사용자 프롬프트와 스타일 키워드를 조합해 간단한 태그 배열 생성
function extractStyleTags(prompt, style) {
  const tags = [];
  const lower = (prompt || '').toLowerCase();
  if (lower.includes('밝은') || lower.includes('bright')) tags.push('bright tone');
  if (lower.includes('어두운') || lower.includes('dark') || lower.includes('moody')) tags.push('moody');
  if (lower.includes('인물') || lower.includes('사람') || lower.includes('person') || lower.includes('people')) {
    tags.push('with people');
  } else if (lower.includes('no person') || lower.includes('no people') || lower.includes('인물 없')) {
    tags.push('no people');
  }
  if (lower.includes('오피스') || lower.includes('office') || lower.includes('책상') || lower.includes('desk')) tags.push('office/desk');
  if (lower.includes('자연') || lower.includes('nature') || lower.includes('outdoor')) tags.push('nature/outdoor');
  if (lower.includes('미니멀') || lower.includes('minimal') || style === 'minimal') tags.push('minimal');
  if (style === 'realistic') tags.push('realistic');
  if (style === 'editorial') tags.push('editorial');
  return Array.from(new Set(tags));
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
    }
    const body = await request.json();
    const { category, prompt, style, selected_image_url, paragraph_context, user_id } = body;
    if (!prompt || !selected_image_url) {
      return NextResponse.json({ error: 'prompt, selected_image_url 필수' }, { status: 400 });
    }
    const style_tags = extractStyleTags(prompt, style);
    const { error } = await supabaseAdmin.from('ai_image_preferences').insert({
      user_id: user_id || null,
      category: category || null,
      prompt,
      style: style || null,
      style_tags,
      selected_image_url,
      paragraph_context: paragraph_context || null,
    });
    if (error) {
      // 테이블이 없는 경우에도 에디터 동작은 막지 않음
      console.warn('[ai-image-preferences] insert fail:', error.message);
      return NextResponse.json({ ok: false, warning: error.message });
    }
    return NextResponse.json({ ok: true, style_tags });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    let query = supabaseAdmin
      .from('ai_image_preferences')
      .select('id, category, style, style_tags, selected_image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ preferences: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}
