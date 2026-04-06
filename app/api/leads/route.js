import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, email, phone,
      campaign_id, magazine_id, agreements,
      // 신규 필드들
      company_name, website_url, inquiry_type,
      budget, message, category,
      lead_type, source_page, source_referrer, click_element
    } = body;

    // 1. Validation
    if (!name || (!email && !phone)) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 2. Database Insert
    if (!isDummyMode) {
      const insertData = {
        name,
        email: email || null,
        phone: phone || null,
        campaign_id: campaign_id || null,
        magazine_id: magazine_id || null,
        agreements: agreements || null,
        // 유입 추적 필드
        company_name: company_name || null,
        website_url: website_url || null,
        inquiry_type: inquiry_type || 'general',
        budget: budget || null,
        message: message || null,
        category: category || null,
        lead_type: lead_type || 'organic',
        source_page: source_page || null,
        source_referrer: source_referrer || null,
        click_element: click_element || null,
        status: 'new',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
    }

    console.log('--- Lead Captured ---');
    console.log(`Name: ${name} | Type: ${lead_type} | Source: ${source_page}`);
    
    return NextResponse.json({ success: true, message: '리드가 성공적으로 등록되었습니다.' });
  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request) {
  if (isDummyMode) {
    return NextResponse.json({ leads: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leadType = searchParams.get('lead_type');
    const status = searchParams.get('status');

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadType && leadType !== 'all') {
      query = query.eq('lead_type', leadType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ leads: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

