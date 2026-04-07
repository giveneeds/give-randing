import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH: 서비스 정보 수정 (어드민용)
export async function PATCH(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('services')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error(`Error updating service ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 서비스 삭제 (어드민용)
export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error(`Error deleting service ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
