import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');

  try {
    if (isDummyMode) {
      if (slug) return NextResponse.json({ magazine: DUMMY_MAGAZINES.find(m => m.slug === slug) });
      if (id) return NextResponse.json({ magazine: DUMMY_MAGAZINES.find(m => m.id === id) });
      let result = [...DUMMY_MAGAZINES];
      if (category) result = result.filter(m => m.category === category);
      result.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
      return NextResponse.json({ magazines: result });
    }

    let query = supabase.from('magazines').select('*');
    if (id) query = query.eq('id', id).single();
    else if (slug) query = query.eq('slug', slug).single();
    else {
      if (category) query = query.eq('category', category);
      query = query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(id || slug ? { magazine: data } : { magazines: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
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
    if (isDummyMode) return NextResponse.json({ magazine: body });
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
