import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_CAMPAIGNS } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// RLS 우회용 — 쓰기 작업은 service role 키 사용. 없으면 anon으로 폴백.
const db = supabaseAdmin || supabase;

export const dynamic = 'force-dynamic';

// In-memory state for dummy mode to persist changes locally
let inMemoryDummyCampaigns = null;

// GET: 캠페인 목록 조회 또는 특정 캠페인 조회
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const isAdmin = searchParams.get('admin') === 'true';

  if (isDummyMode) {
    if (!inMemoryDummyCampaigns) {
      inMemoryDummyCampaigns = JSON.parse(JSON.stringify(DUMMY_CAMPAIGNS));
    }
    
    if (slug) {
      const campaign = inMemoryDummyCampaigns.find(c => c.slug === slug);
      if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (!isAdmin && campaign.status !== 'published') return NextResponse.json({ error: 'Not published' }, { status: 403 });
      return NextResponse.json({ campaign });
    }

    let result = [...inMemoryDummyCampaigns];
    if (!isAdmin) result = result.filter(c => c.status === 'published');
    return NextResponse.json({ campaigns: result });
  }

  try {
    if (slug) {
      let query = supabase.from('campaigns').select('*').eq('slug', slug);
      if (!isAdmin) query = query.eq('status', 'published');
      
      const { data, error } = await query.single();
      if (error) return NextResponse.json({ error: 'Not found or not published' }, { status: 404 });
      return NextResponse.json({ campaign: data });
    }

    let query = supabase.from('campaigns').select('*');
    if (!isAdmin) query = query.eq('status', 'published');
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
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

    const { data, error } = await db
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

// PUT: 캠페인 수정 (명시적 update — slug 충돌로 다른 캠페인 덮어쓰는 사고 방지)
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

    if (!body.id) {
      return NextResponse.json(
        { error: '캠페인 id가 누락되었습니다. 새 캠페인은 POST 로 생성하세요.' },
        { status: 400 }
      );
    }

    // 사전검사: 같은 slug 가 다른 캠페인에 이미 존재하면 거부
    if (body.slug) {
      const { data: slugConflict, error: selErr } = await db
        .from('campaigns')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', body.id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (slugConflict) {
        return NextResponse.json(
          { error: `동일 slug "${body.slug}" 가 이미 다른 캠페인에 사용 중입니다. 다른 slug 를 입력해 주세요.` },
          { status: 409 }
        );
      }
    }

    const updatePayload = { ...body, updated_at: new Date().toISOString() };
    delete updatePayload.id; // WHERE 절에서만 사용

    const { data, error } = await db
      .from('campaigns')
      .update(updatePayload)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, campaign: data });
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

    const { error } = await db
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
