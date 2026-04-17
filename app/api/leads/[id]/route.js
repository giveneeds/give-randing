import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    if (isDummyMode) return NextResponse.json({ lead: null });

    const { id } = await params;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ lead: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    if (isDummyMode) return NextResponse.json({ success: true });

    const { id } = await params;
    const body = await request.json();

    const allowed = ['pipeline_stage', 'assigned_to', 'tags', 'status', 'updated_at'];
    const updateData = { updated_at: new Date().toISOString() };

    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
