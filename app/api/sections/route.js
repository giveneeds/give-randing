import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_SECTIONS } from '@/lib/supabase';

// GET: 모든 활성 섹션 가져오기
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all'); // admin에서 전체 조회 시

  if (isDummyMode) {
    const sections = all ? DUMMY_SECTIONS : DUMMY_SECTIONS.filter(s => s.is_active);
    return NextResponse.json({ sections });
  }

  try {
    let query = supabase
      .from('landing_sections')
      .select('*')
      .order('order_index', { ascending: true });

    if (!all) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ sections: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 새 섹션 추가
export async function POST(request) {
  if (isDummyMode) {
    const body = await request.json();
    return NextResponse.json({ section: { id: Date.now().toString(), ...body, created_at: new Date().toISOString() } });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('landing_sections')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ section: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 섹션 수정
export async function PUT(request) {
  if (isDummyMode) {
    const body = await request.json();
    return NextResponse.json({ section: body });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('landing_sections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ section: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 섹션 삭제
export async function DELETE(request) {
  if (isDummyMode) {
    return NextResponse.json({ success: true });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabase
      .from('landing_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
