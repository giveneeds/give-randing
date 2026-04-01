import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_MAGAZINES } from '@/lib/supabase';

// GET: 매거진 목록 또는 상세 조회
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');

  try {
    if (isDummyMode) {
      if (slug) {
        const mag = DUMMY_MAGAZINES.find(m => m.slug === slug);
        return NextResponse.json({ magazine: mag });
      }
      return NextResponse.json({ magazines: DUMMY_MAGAZINES });
    }

    let query = supabase.from('magazines').select('*');
    if (id) query = query.eq('id', id).single();
    else if (slug) query = query.eq('slug', slug).single();
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(id || slug ? { magazine: data } : { magazines: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 새 매거진 생성
export async function POST(request) {
  try {
    const body = await request.json();
    if (isDummyMode) {
      const newMag = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      return NextResponse.json({ magazine: newMag });
    }

    const { data, error } = await supabase.from('magazines').insert([body]).select().single();
    if (error) throw error;
    return NextResponse.json({ magazine: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 매거진 수정
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (isDummyMode) return NextResponse.json({ magazine: body });

    const { data, error } = await supabase
      .from('magazines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ magazine: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 매거진 삭제
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
