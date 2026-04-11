import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_SETTINGS } from '@/lib/supabase';

// 카테고리 매핑: type → category
const TYPE_CATEGORY_MAP = {
  hero: 'BOTH', hook: 'BOTH', stats: 'BOTH', testimonials: 'BOTH',
  faq: 'BOTH', magazine: 'BOTH', ai_strategy: 'BOTH',
  product_detail: 'BOTH', identity: 'WEBSITE', resources: 'LANDING_PAGE',
  brand_stats: 'BOTH',
};

// GET: 설정 가져오기
export async function GET() {
  if (isDummyMode) {
    return NextResponse.json({ settings: DUMMY_SETTINGS });
  }

  try {
    // 1. 기본 설정 로딩
    const { data, error } = await supabase
      .from('landing_settings')
      .select('*')
      .single();

    if (error) throw error;

    // 2. section_library: landing_settings에 컬럼이 있으면 사용, 없으면 global_sections의 master_ 블록으로 자동 구성
    let sectionLibrary = data?.section_library;

    if (!sectionLibrary || !sectionLibrary.blocks || sectionLibrary.blocks.length === 0) {
      const { data: masterBlocks } = await supabase
        .from('global_sections')
        .select('id, title, type, content, subtitle')
        .like('id', 'master_%')
        .order('order_index');

      if (masterBlocks && masterBlocks.length > 0) {
        sectionLibrary = {
          blocks: masterBlocks.map(b => ({
            type: b.type,
            name: b.title,
            subtitle: b.subtitle || '',
            content: b.content || {},
            category: TYPE_CATEGORY_MAP[b.type] || 'BOTH',
          }))
        };
      } else {
        sectionLibrary = { blocks: [] };
      }
    }

    return NextResponse.json({ settings: { ...data, section_library: sectionLibrary } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 설정 업데이트
export async function PUT(request) {
  if (isDummyMode) {
    const body = await request.json();
    return NextResponse.json({ settings: body });
  }

  try {
    const body = await request.json();
    // body: { key: string, value: object }
    // 예를 들어 key가 'brand'고 value가 객체면,
    // UPDATE landing_settings SET brand = value WHERE id = 1
    const { key, value } = body;

    const { data, error } = await supabase
      .from('landing_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ setting: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
