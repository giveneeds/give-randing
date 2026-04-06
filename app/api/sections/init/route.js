import { NextResponse } from 'next/server';
import { supabase, isDummyMode, DUMMY_SECTIONS } from '@/lib/supabase';

export async function GET() {
  if (isDummyMode) return NextResponse.json({ error: 'Dummy mode' });

  try {
    for (let i = 0; i < DUMMY_SECTIONS.length; i++) {
        const section = DUMMY_SECTIONS[i];
        const { id, type, title, subtitle, content, is_active } = section;
        await supabase.from('global_sections').upsert({
            id, type, title, subtitle, content, is_active, order_index: i
        }, { onConflict: 'id' });
    }

    const dummyIds = DUMMY_SECTIONS.map(s => s.id);
    const { data: all } = await supabase.from('global_sections').select('id');
    if (all) {
        for (const row of all) {
            if (!dummyIds.includes(row.id)) {
                await supabase.from('global_sections').delete().eq('id', row.id);
            }
        }
    }
    return NextResponse.json({ success: true, count: DUMMY_SECTIONS.length });
  } catch(e) {
    return NextResponse.json({ error: e.message });
  }
}
