import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const isAdmin = searchParams.get('admin') === 'true';

  try {
    if (isDummyMode) {
      // 고객 사례는 샘플 데이터 없이 빈 배열로 시작
      if (slug || id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ cases: [] });
    }

    let query = supabase.from('case_studies').select('*');
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
    return NextResponse.json(id || slug ? { case: data } : { cases: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (isDummyMode) return NextResponse.json({ case: { ...body, id: crypto.randomUUID() } });
    const { data, error } = await supabase.from('case_studies').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json({ case: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (isDummyMode) return NextResponse.json({ case: body });
    const { data, error } = await supabase.from('case_studies').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ case: data });
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

    const promises = items.map((item) =>
      supabase.from('case_studies').update({ sort_order: item.sort_order }).eq('id', item.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
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
    const { error } = await supabase.from('case_studies').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
