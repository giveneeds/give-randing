import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const isAdmin = searchParams.get('admin') === 'true';

  try {
    if (isDummyMode) {
      if (slug) {
        const magazine = DUMMY_MAGAZINES.find(m => m.slug === slug);
        if (!magazine) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && magazine.status !== 'published') return NextResponse.json({ error: 'Not published' }, { status: 403 });
        return NextResponse.json({ magazine });
      }
      if (id) {
        const magazine = DUMMY_MAGAZINES.find(m => m.id === id);
        if (!magazine) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (!isAdmin && magazine.status !== 'published') return NextResponse.json({ error: 'Not published' }, { status: 403 });
        return NextResponse.json({ magazine });
      }
      let result = [...DUMMY_MAGAZINES];
      if (!isAdmin) result = result.filter(m => m.status === 'published');
      if (category) result = result.filter(m => m.category === category);
      result.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
      return NextResponse.json({ magazines: result });
    }

    let query = supabase.from('magazines').select('*');
    if (!isAdmin) query = query.eq('status', 'published');

    if (id) query = query.eq('id', id).single();
    else if (slug) query = query.eq('slug', slug).single();
    else {
      if (category) query = query.eq('category', category);
      query = query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Not found or not published' }, { status: 404 });
    return NextResponse.json(id || slug ? { magazine: data } : { magazines: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ASCII-only 슬러그. 한글은 URL 인코딩 시 깨짐/404 위험이 있어 제거한다.
// 결과가 비면 호출부에서 `post-${Date.now()}` 같은 폴백을 사용한다.
function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, '') // 비-ASCII (한글 포함) 제거
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function ensureUniqueSlug(base, excludeId = null) {
  const safeBase = base || 'post';
  if (isDummyMode) {
    const taken = new Set(DUMMY_MAGAZINES.filter(m => m.id !== excludeId).map(m => m.slug));
    let candidate = safeBase;
    let n = 2;
    while (taken.has(candidate)) candidate = `${safeBase}-${n++}`;
    return candidate;
  }
  let q = supabase.from('magazines').select('slug').like('slug', `${safeBase}%`);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) return safeBase;
  const taken = new Set((data || []).map(r => r.slug));
  let candidate = safeBase;
  let n = 2;
  while (taken.has(candidate)) candidate = `${safeBase}-${n++}`;
  return candidate;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const baseSlug = slugify(body.slug) || slugify(body.title) || `post-${Date.now()}`;
    body.slug = await ensureUniqueSlug(baseSlug);
    if (isDummyMode) return NextResponse.json({ magazine: { ...body, id: crypto.randomUUID() } });
    const { data, error } = await supabase.from('magazines').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json({ magazine: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const baseSlug = slugify(updateData.slug) || slugify(updateData.title) || `post-${Date.now()}`;
    updateData.slug = await ensureUniqueSlug(baseSlug, id);
    if (isDummyMode) return NextResponse.json({ magazine: { ...body, slug: updateData.slug } });
    const { data, error } = await supabase.from('magazines').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ magazine: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: 순서 일괄 업데이트
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { items } = body; // [{ id, sort_order }]
    
    if (isDummyMode) return NextResponse.json({ success: true });
    
    // 각 아이템의 sort_order를 개별 업데이트
    const promises = items.map(item => 
      supabase.from('magazines').update({ sort_order: item.sort_order }).eq('id', item.id)
    );
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw new Error(errors[0].error.message);
    
    return NextResponse.json({ success: true, updated: items.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  try {
    if (isDummyMode) return NextResponse.json({ success: true });
    const { error } = await supabase.from('magazines').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
