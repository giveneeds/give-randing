import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServicePath } from '@/lib/serviceRoutes';

const BUDGET_LABELS = {
  under_100: '100만원 이하',
  '100_500': '100~500만원',
  '500_1000': '500~1000만원',
  over_1000: '1000만원 이상',
  undecided: '미정',
};

async function getKakaoAccessToken(refreshToken) {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KAKAO_REST_API_KEY,
      client_secret: process.env.KAKAO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('카카오 토큰 갱신 실패: ' + JSON.stringify(data));
  return data.access_token;
}

async function sendKakaoMemo(accessToken, text) {
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
        link: { web_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giveneeds.co.kr'}/admin/leads` },
      }),
    }),
  });
}

async function sendKakaoWebhook(lead) {
  if (!process.env.KAKAO_REST_API_KEY) return;

  const budgetText = BUDGET_LABELS[lead.budget] || lead.budget || '미입력';
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const text = [
    `🔔 새 문의가 접수되었습니다`,
    ``,
    `📌 ${lead.name} | ${lead.company_name || '회사명 미입력'}`,
    `📞 ${lead.phone || '연락처 없음'}`,
    `📧 ${lead.email || '이메일 없음'}`,
    lead.service_slug ? `📦 상품: ${getServicePath(lead.service_slug)}` : '',
    `💰 예산: ${budgetText}`,
    lead.message ? `💬 ${lead.message.slice(0, 100)}${lead.message.length > 100 ? '...' : ''}` : '',
    ``,
    `📍 유입: ${lead.source_page || '직접'}`,
    `🕐 ${now}`,
  ].filter(Boolean).join('\n');

  const refreshTokens = [
    process.env.KAKAO_REFRESH_TOKEN,
    process.env.KAKAO_REFRESH_TOKEN_2,
  ].filter(Boolean);

  await Promise.all(
    refreshTokens.map(async (token) => {
      const accessToken = await getKakaoAccessToken(token);
      await sendKakaoMemo(accessToken, text);
    })
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, email, phone,
      campaign_id, magazine_id, service_id, service_slug, agreements,
      // 신규 필드들
      company_name, website_url, inquiry_type,
      budget, message, category,
      lead_type, source_page, source_referrer, click_element,
      // CRM 추적 필드
      anonymous_id, first_visit_url, last_touch_url,
      device_type, browser,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      channel_group,
    } = body;

    // 1. Validation
    if (!name || (!email && !phone)) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    let createdLeadId = null;

    // 2. Database Insert
    if (!isDummyMode) {
      const insertData = {
        name,
        email: email || null,
        phone: phone || null,
        campaign_id: campaign_id || null,
        magazine_id: magazine_id || null,
        service_id: service_id || null,
        service_slug: service_slug || null,
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
        // CRM 추적 필드
        anonymous_id: anonymous_id || null,
        first_visit_url: first_visit_url || null,
        last_touch_url: last_touch_url || null,
        device_type: device_type || null,
        browser: browser || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        channel_group: channel_group || null,
        pipeline_stage: 'new',
        created_at: new Date().toISOString()
      };

      const { data: leadRow, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;
      createdLeadId = leadRow?.id || null;

      // ID 스티칭: 익명 세션/이벤트를 이 리드에 소급 연결
      if (anonymous_id && leadRow?.id) {
        await Promise.all([
          supabase.from('lead_sessions').update({ lead_id: leadRow.id }).eq('anonymous_id', anonymous_id),
          supabase.from('lead_events').update({ lead_id: leadRow.id }).eq('anonymous_id', anonymous_id),
        ]).catch(e => console.error('ID stitching partial failure:', e));
      }
    }

    console.log('--- Lead Captured ---');
    console.log(`Name: ${name} | Type: ${lead_type} | Source: ${source_page}`);

    // 카카오 알람 (응답 전에 await — Vercel 서버리스는 응답 후 비동기 중단됨)
    await sendKakaoWebhook({ name, phone, email, company_name, budget, message, lead_type, source_page, service_slug })
      .catch(err => console.error('Kakao webhook failed:', err));

    // 3. 캠페인 basic 폼 + 활성 자료 보유 시 1회용 다운로드 토큰 발급
    //    ⚠️ lead_download_tokens 는 RLS 활성화 + 정책 미정의 — service role(admin) 필수
    //    content_resources 카운트도 일관성을 위해 admin 으로 통일
    let download_token = null;
    if (!isDummyMode && createdLeadId && campaign_id && lead_type !== 'campaign_kakao_oauth') {
      if (!supabaseAdmin) {
        console.warn('[leads] download token skipped: supabaseAdmin (service role) 미설정');
      } else {
        try {
          const { count: activeResourceCount, error: countErr } = await supabaseAdmin
            .from('content_resources')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign_id)
            .eq('is_enabled', true)
            .neq('display_on_form_submit', false);
          if (countErr) {
            console.warn('[leads] active resource count failed:', countErr.message);
          } else if ((activeResourceCount || 0) > 0) {
            const { data: tokenRow, error: tokenErr } = await supabaseAdmin
              .from('lead_download_tokens')
              .insert({
                lead_id: createdLeadId,
                campaign_id,
              })
              .select('token')
              .single();
            if (tokenErr) {
              console.warn('[leads] download token insert failed:', tokenErr.message);
            } else {
              download_token = tokenRow?.token || null;
            }
          }
        } catch (tokenIssueErr) {
          console.warn('[leads] download token issue skipped:', tokenIssueErr?.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '리드가 성공적으로 등록되었습니다.',
      ...(download_token ? { download_token } : {}),
    });
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
    const pipelineStage = searchParams.get('pipeline_stage');
    const channelGroup = searchParams.get('channel_group');
    const campaignId = searchParams.get('campaign_id');

    let query = supabase
      .from('leads')
      .select('*, campaign:campaigns(id, slug, title), service:services(id, slug, title)')
      .order('created_at', { ascending: false });

    if (leadType && leadType !== 'all') {
      query = query.eq('lead_type', leadType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (pipelineStage && pipelineStage !== 'all') {
      query = query.eq('pipeline_stage', pipelineStage);
    }
    if (channelGroup && channelGroup !== 'all') {
      query = query.eq('channel_group', channelGroup);
    }
    if (campaignId && campaignId !== 'all') {
      if (campaignId === 'none') {
        query = query.is('campaign_id', null);
      } else {
        query = query.eq('campaign_id', campaignId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ leads: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
