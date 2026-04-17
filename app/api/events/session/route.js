import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function POST(request) {
  try {
    if (isDummyMode) {
      return NextResponse.json({ session_id: crypto.randomUUID() });
    }

    const body = await request.json();
    const {
      anonymous_id,
      first_url,
      landing_url,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      channel_group,
      device_type,
      browser,
      user_id,
      kakao_name,
      kakao_phone,
    } = body;

    if (!anonymous_id) {
      return NextResponse.json({ error: 'anonymous_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lead_sessions')
      .insert([{
        anonymous_id,
        first_url: first_url || '',
        landing_url: landing_url || '',
        referrer: referrer || '',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        channel_group: channel_group || 'direct',
        device_type: device_type || null,
        browser: browser || null,
        user_id: user_id || null,
        kakao_name: kakao_name || null,
        kakao_phone: kakao_phone || null,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('[events/session] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session_id: data.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
