import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';

// GET: 설정 가져오기
export async function GET() {
  if (isDummyMode) {
    return NextResponse.json({ settings: DUMMY_SETTINGS });
  }

  try {
    const { data, error } = await supabase
      .from('landing_settings')
      .select('*');

    if (error) throw error;

    // key-value 형태를 객체로 변환
    const settings = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 설정 업데이트
export async function PUT(request) {
  if (isDummyMode) {
    const body = await request.json();
    return NextResponse.json({ settings: body });
  }

  try {
    const body = await request.json();
    // body: { key: string, value: object }
    const { key, value } = body;

    const { data, error } = await supabase
      .from('landing_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ setting: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
