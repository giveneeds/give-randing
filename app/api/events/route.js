import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';

export async function POST(request) {
  try {
    if (isDummyMode) return NextResponse.json({ success: true });

    const body = await request.json();
    const { anonymous_id, session_id, event_type, event_data, page_url } = body;

    if (!anonymous_id || !event_type) {
      return NextResponse.json({ error: 'anonymous_id and event_type required' }, { status: 400 });
    }

    const { error } = await supabase.from('lead_events').insert([{
      anonymous_id,
      session_id: session_id || null,
      event_type,
      event_data: event_data || {},
      page_url: page_url || '',
    }]);

    if (error) {
      console.error('[events] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    if (isDummyMode) return NextResponse.json({ events: [] });

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const anonymousId = searchParams.get('anonymous_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabase.from('lead_events').select('*');

    if (leadId) query = query.eq('lead_id', leadId);
    else if (anonymousId) query = query.eq('anonymous_id', anonymousId);
    else return NextResponse.json({ error: 'lead_id or anonymous_id required' }, { status: 400 });

    query = query.order('created_at', { ascending: false }).limit(limit);
    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
