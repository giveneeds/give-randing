import { DUMMY_SECTIONS } from './lib/supabase.js';

let sql = `INSERT INTO global_sections (id, type, title, subtitle, content, is_active, order_index) VALUES \n`;

const values = DUMMY_SECTIONS.map((sec, i) => {
    return `('${sec.id}', '${sec.type}', '${sec.title}', '${sec.subtitle}', '${JSON.stringify(sec.content).replace(/'/g, "''")}', ${sec.is_active}, ${i})`;
});

sql += values.join(',\n') + ';';

import fs from 'fs';
fs.writeFileSync('insert.sql', sql);
