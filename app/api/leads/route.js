import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, campaign_id, magazine_id, agreements } = body;

    // 1. Validation
    if (!name || (!email && !phone)) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 2. Database Insert
    if (!isDummyMode) {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name,
          email,
          phone,
          campaign_id,
          magazine_id,
          agreements,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
    }

    // 3. Automation Trigger (Webhook Mockup)
    // - 카카오 알림톡 또는 이메일 자동 발송 트리거
    console.log('--- Lead Automation Triggered ---');
    console.log(`Target: ${email || phone}`);
    console.log(`Campaign Context: ${campaign_id || magazine_id}`);
    
    // TODO: 연동 업체(Solapi, Stibee 등) API 호출 로직 추가 예정
    
    return NextResponse.json({ success: true, message: '리드가 성공적으로 등록되었습니다.' });
  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request) {
  // Admin auth check would go here
  if (isDummyMode) {
    return NextResponse.json({ leads: [] });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*, campaigns(title), magazines(title)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ leads: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
