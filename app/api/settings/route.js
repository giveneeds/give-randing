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
      .select('*')
      .single();

    if (error) throw error;

    // data 자체가 { id: 1, brand: {}, seo: {}, ... } 형태의 객체입니다.
    // DUMMY_SETTINGS 처리를 위해 null인 값들은 fallback 할 수 있으나 일단 data 자체를 내려줍니다.
    return NextResponse.json({ settings: data });
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
    // 예를 들어 key가 'brand'고 value가 객체면,
    // UPDATE landing_settings SET brand = value WHERE id = 1
    const { key, value } = body;

    const { data, error } = await supabase
      .from('landing_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ setting: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
