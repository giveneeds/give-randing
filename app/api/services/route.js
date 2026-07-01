import { NextResponse } from 'next/server';
import { DUMMY_SERVICE_PRODUCTS, isDummyMode, supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mergeServiceDetailsForSave } from '@/lib/serviceDetailBlocks';
import { isReservedServiceSlug, normalizeServiceSlug, resolveServiceSlug } from '@/lib/serviceRoutes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function findByFlexibleSlug(services = [], slug = '') {
  const normalized = resolveServiceSlug(slug);
  return services.find((service) => service.slug === slug || resolveServiceSlug(service.slug) === normalized) || null;
}

// GET: 서비스 목록 조회 (활성화된 것 위주)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const all = searchParams.get('all') === 'true'; // 어드민 체크용
  const useLocalDummy = process.env.NODE_ENV !== 'production' && (isDummyMode || !supabase);

  try {
    if (useLocalDummy) {
      const services = DUMMY_SERVICE_PRODUCTS.map((service, index) => ({
        ...service,
        subtitle: service.subtitle || '',
        description: service.description || service.desc || '',
        icon: service.icon || 'Target',
        order_num: index,
        is_active: true,
        details: service.details || { status: 'published' },
      }));

      if (slug) {
        const found = findByFlexibleSlug(services.filter((service) => all || service.is_active), slug);
        if (!found) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        return NextResponse.json(found);
      }

      const filtered = category ? services.filter((service) => service.category === category) : services;
      return NextResponse.json(all ? filtered : filtered.filter((service) => service.is_active));
    }

    if (all) {
      const auth = await requireAdmin(request);
      if (auth.error) return auth.error;
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    let query = supabase
      .from('services')
      .select('*')
      .order('order_num', { ascending: true });

    if (!all) {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (slug) {
      const found = findByFlexibleSlug(Array.isArray(data) ? data : [], slug);
      if (!found) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      return NextResponse.json(found);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 신규 서비스 생성 (어드민용)
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { details, errors } = mergeServiceDetailsForSave({}, body.details || {});

    if (errors.length > 0) {
      return NextResponse.json(
        { error: '상품 상세 블록 데이터가 올바르지 않습니다.', details: errors },
        { status: 400 }
      );
    }
    
    // 필수 필드 체크
    const normalizedSlug = normalizeServiceSlug(body.slug);

    if (!normalizedSlug || !body.title || !body.category) {
      return NextResponse.json({ error: 'Slug, Title, and Category are required' }, { status: 400 });
    }
    if (isReservedServiceSlug(normalizedSlug)) {
      return NextResponse.json({ error: '예약된 URL은 상품 slug로 사용할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert([
        {
          slug: normalizedSlug,
          title: body.title,
          subtitle: body.subtitle,
          description: body.description,
          category: body.category,
          color: body.color || '#1E4181',
          icon: body.icon || 'Target',
          details,
          order_num: body.order_num || 0,
          is_active: body.is_active ?? true
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
