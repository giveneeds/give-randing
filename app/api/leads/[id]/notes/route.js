import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    if (isDummyMode) return NextResponse.json({ notes: [] });

    const { id } = await params;
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ notes: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    if (isDummyMode) return NextResponse.json({ success: true });

    const { id } = await params;
    const { note_type = 'note', content, author = 'admin' } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lead_notes')
      .insert({ lead_id: id, note_type, content: content.trim(), author })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
