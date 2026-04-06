import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

import { DUMMY_SECTIONS } from './lib/supabase.js';

async function init() {
  console.log('Inserting fresh data based on Current Layout...');
  for (let i = 0; i < DUMMY_SECTIONS.length; i++) {
    const section = DUMMY_SECTIONS[i];
    const { id, type, title, subtitle, content, is_active } = section;
    const { error: insErr } = await supabase.from('global_sections').upsert({
      id,
      type,
      title,
      subtitle,
      content,
      is_active,
      order_index: i
    }, { onConflict: 'id' });
    if (insErr) {
        console.error(`Insert/Upsert Error for ${id}:`, insErr);
    } else {
        console.log(`Pushed ${id} at order_index ${i}`);
    }
  }
  
  // Clean up any remaining ones that are NOT in dummy
  const dummyIds = DUMMY_SECTIONS.map(s => s.id);
  const { data: all } = await supabase.from('global_sections').select('id');
  if (all) {
     for (const row of all) {
        if (!dummyIds.includes(row.id)) {
            await supabase.from('global_sections').delete().eq('id', row.id);
            console.log(`Deleted orphan section ${row.id}`);
        }
     }
  }
  console.log('Done!');
}
init();
