import { NextResponse } from 'next/server';
import { supabase, isDummyMode } from '@/lib/supabase';
import { resolveServiceSlug } from '@/lib/serviceRoutes';

export async function GET(request, { params }) {
  try {
    if (isDummyMode) return NextResponse.json({ lead: null });

    const { id } = await params;
    // 1) 리드 본체 — join 없이 안전하게 fetch
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // 2) 캠페인/매거진/서비스는 외래키 join 안 쓰고 별도 fetch — 한쪽이 실패해도 본체 반환
    let campaign = null;
    let magazine = null;
    let service = null;

    if (data?.campaign_id) {
      const { data: cRow } = await supabase
        .from('campaigns')
        .select('id, slug, title')
        .eq('id', data.campaign_id)
        .maybeSingle();
      campaign = cRow || null;
    }

    if (data?.magazine_id) {
      const { data: mRow } = await supabase
        .from('magazines')
        .select('id, slug, title')
        .eq('id', data.magazine_id)
        .maybeSingle();
      magazine = mRow || null;
    }

    if (data?.service_id) {
      const { data: sRow } = await supabase
        .from('services')
        .select('id, slug, title')
        .eq('id', data.service_id)
        .maybeSingle();
      service = sRow || null;
    } else if (data?.service_slug) {
      const { data: serviceRows } = await supabase
        .from('services')
        .select('id, slug, title')
        .eq('is_active', true);
      const requested = resolveServiceSlug(data.service_slug);
      service = (serviceRows || []).find((row) => row.slug === data.service_slug || resolveServiceSlug(row.slug) === requested) || null;
    }

    return NextResponse.json({ lead: { ...data, campaign, magazine, service } });
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
