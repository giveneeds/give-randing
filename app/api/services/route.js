import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 서비스 목록 조회 (활성화된 것 위주)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const all = searchParams.get('all') === 'true'; // 어드민 체크용

  try {
    let query = supabase
      .from('services')
      .select('*')
      .order('order_num', { ascending: true });

    if (!all) {
      query = query.eq('is_active', true);
    }

    if (slug) {
      query = query.eq('slug', slug).single();
    } else if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 신규 서비스 생성 (어드민용)
export async function POST(request) {
  try {
    const body = await request.json();
    
    // 필수 필드 체크
    if (!body.slug || !body.title || !body.category) {
      return NextResponse.json({ error: 'Slug, Title, and Category are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('services')
      .insert([
        {
          slug: body.slug,
          title: body.title,
          subtitle: body.subtitle,
          description: body.description,
          category: body.category,
          color: body.color || '#1E4181',
          icon: body.icon || 'Target',
          details: body.details || {},
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
