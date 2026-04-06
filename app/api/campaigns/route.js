import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS } from '@/lib/supabase';

// In-memory state for dummy mode to persist changes locally
let inMemoryDummyCampaigns = null;

// GET: 캠페인 목록 조회 또는 특정 캠페인 조회
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (isDummyMode) {
    if (!inMemoryDummyCampaigns) {
      inMemoryDummyCampaigns = JSON.parse(JSON.stringify(DUMMY_CAMPAIGNS));
    }
    
    if (slug) {
      const campaign = inMemoryDummyCampaigns.find(c => c.slug === slug);
      if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ campaign });
    }

    return NextResponse.json({ campaigns: inMemoryDummyCampaigns });
  }

  try {
    if (slug) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return NextResponse.json({ campaign: data });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ campaigns: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 새 캠페인 추가
export async function POST(request) {
  if (isDummyMode) {
    const body = await request.json();
    const newCampaign = { 
      id: `cp-${Date.now().toString()}`, 
      ...body, 
      created_at: new Date().toISOString() 
    };
    if (inMemoryDummyCampaigns) {
      inMemoryDummyCampaigns.unshift(newCampaign);
    } else {
      inMemoryDummyCampaigns = [newCampaign, ...DUMMY_CAMPAIGNS];
    }
    return NextResponse.json({ campaign: newCampaign });
  }

  try {
    const body = await request.json();
    const newCampaign = {
      ...body,
      id: undefined // Let Supabase use default gen_random_uuid
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert(newCampaign)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 캠페인 수정 (Upsert)
export async function PUT(request) {
  if (isDummyMode) {
    const body = await request.json();
    if (inMemoryDummyCampaigns) {
      const index = inMemoryDummyCampaigns.findIndex(c => c.id === body.id || c.slug === body.slug);
      if (index !== -1) {
        inMemoryDummyCampaigns[index] = { ...inMemoryDummyCampaigns[index], ...body, updated_at: new Date().toISOString() };
      } else {
        inMemoryDummyCampaigns.unshift({ ...body, updated_at: new Date().toISOString() });
      }
    }
    return NextResponse.json({ campaign: body });
  }

  try {
    const body = await request.json();
    
    // We expect body to contain id if updating, but if it's an upsert on slug, need to handle
    const { error } = await supabase
      .from('campaigns')
      .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: 'slug' });

    if (error) throw error;
    return NextResponse.json({ success: true, campaign: body });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 캠페인 삭제
export async function DELETE(request) {
  if (isDummyMode) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (inMemoryDummyCampaigns) {
      inMemoryDummyCampaigns = inMemoryDummyCampaigns.filter(c => c.id !== id);
    }
    return NextResponse.json({ success: true });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
