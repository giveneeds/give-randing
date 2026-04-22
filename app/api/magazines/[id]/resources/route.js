import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseFromRequest } from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET  /api/magazines/[id]/resources
 *   - 공개: is_enabled=true 만
 *   - admin=true 쿼리스트링 + 어드민 인증: 전체
 */
export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'magazine id 누락' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const isAdminRequest = searchParams.get('admin') === 'true';

  try {
    if (isAdminRequest) {
      const auth = await requireAdmin(request);
      if (auth.error) return auth.error;
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
      }
      const { data, error } = await supabaseAdmin
        .from('content_resources')
        .select('*')
        .eq('magazine_id', id)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ resources: data || [] });
    }

    // 공개 조회 — anon 클라이언트 + RLS (is_enabled=true 자동 필터)
    const { supabase } = await createSupabaseFromRequest(request);
    if (!supabase) return NextResponse.json({ resources: [] });
    const { data, error } = await supabase
      .from('content_resources')
      .select('id,title,description,file_name,file_size,file_type,sort_order')
      .eq('magazine_id', id)
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ resources: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || '조회 실패' }, { status: 500 });
  }
}

/**
 * POST /api/magazines/[id]/resources
 * body: { title, description?, file_url, file_name, file_size, file_type }
 * 업로드 완료 후 메타데이터 저장.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'magazine id 누락' }, { status: 400 });

  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, description, file_url, file_name, file_size, file_type, is_enabled } = body || {};
    if (!title || !file_url || !file_name) {
      return NextResponse.json({ error: 'title / file_url / file_name 은 필수입니다.' }, { status: 400 });
    }

    // sort_order = MAX + 1
    const { data: maxRow } = await supabaseAdmin
      .from('content_resources')
      .select('sort_order')
      .eq('magazine_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('content_resources')
      .insert({
        magazine_id: id,
        title,
        description: description || null,
        file_url,
        file_name,
        file_size: file_size ?? null,
        file_type: file_type ?? null,
        sort_order: nextOrder,
        is_enabled: is_enabled ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ resource: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || '생성 실패' }, { status: 500 });
  }
}
