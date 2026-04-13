import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

const BUDGET_LABELS = {
  under_100: '100만원 이하',
  '100_500': '100~500만원',
  '500_1000': '500~1000만원',
  over_1000: '1000만원 이상',
  undecided: '미정',
};

async function getKakaoAccessToken() {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KAKAO_REST_API_KEY,
      client_secret: process.env.KAKAO_CLIENT_SECRET,
      refresh_token: process.env.KAKAO_REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('카카오 토큰 갱신 실패: ' + JSON.stringify(data));
  return data.access_token;
}

async function sendKakaoWebhook(lead) {
  if (!process.env.KAKAO_REST_API_KEY || !process.env.KAKAO_REFRESH_TOKEN) return;

  const budgetText = BUDGET_LABELS[lead.budget] || lead.budget || '미입력';
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const text = [
    `🔔 새 문의가 접수되었습니다`,
    ``,
    `📌 ${lead.name} | ${lead.company_name || '회사명 미입력'}`,
    `📞 ${lead.phone || '연락처 없음'}`,
    `📧 ${lead.email || '이메일 없음'}`,
    `💰 예산: ${budgetText}`,
    lead.message ? `💬 ${lead.message.slice(0, 100)}${lead.message.length > 100 ? '...' : ''}` : '',
    ``,
    `📍 유입: ${lead.source_page || '직접'}`,
    `🕐 ${now}`,
  ].filter(Boolean).join('\n');

  const accessToken = await getKakaoAccessToken();

  await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text,
        link: { web_url: 'https://give-randing.vercel.app/admin/leads' },
      }),
    }),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, email, phone,
      campaign_id, magazine_id, agreements,
      // 신규 필드들
      company_name, website_url, inquiry_type,
      budget, message, category,
      lead_type, source_page, source_referrer, click_element,
      user_id
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
        user_id: user_id || null,
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

    // 카카오 채널 웹훅 알림 (비동기, 실패해도 리드 저장에 영향 없음)
    sendKakaoWebhook({ name, phone, email, company_name, budget, message, lead_type, source_page })
      .catch(err => console.error('Kakao webhook failed:', err));

    return NextResponse.json({ success: true, message: '리드가 성공적으로 등록되었습니다.' });
  } catch (error) {
    console.error('Lead Capture Error:', error);
    return NextResponse.json({ error: `서버 오류: ${error.message || '알 수 없는 오류'}` }, { status: 500 });
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

