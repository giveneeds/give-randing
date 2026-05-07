// 기존 매거진의 한글 슬러그를 ASCII 슬러그로 일괄 변환
//
// 사용법:
//   node tools/fix-korean-slugs.js          # dry-run (변경 미리보기만)
//   node tools/fix-korean-slugs.js --apply  # 실제 DB 업데이트
//
// 주의: 슬러그가 바뀌면 기존 외부 링크/SEO에 영향이 있다.
//       발행되어 있는 글은 검색엔진/공유 링크가 끊길 수 있으니 주의.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
  const txt = fs.readFileSync('.env.local', 'utf8');
  txt.split('\n').forEach((line) => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  });
} catch {}

const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('환경 변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 또는 ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const APPLY = process.argv.includes('--apply');

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function hasNonAscii(s) {
  return /[^\x00-\x7f]/.test(String(s || ''));
}

(async () => {
  const { data: magazines, error } = await supabase
    .from('magazines')
    .select('id, title, slug, status');

  if (error) {
    console.error('조회 실패:', error.message);
    process.exit(1);
  }

  const targets = magazines.filter((m) => hasNonAscii(m.slug));
  if (targets.length === 0) {
    console.log('변환 대상 없음. 모든 슬러그가 ASCII입니다.');
    return;
  }

  const existingSlugs = new Set(magazines.filter((m) => !hasNonAscii(m.slug)).map((m) => m.slug));
  const planned = [];

  for (const m of targets) {
    let base = slugify(m.title) || `post-${Date.now()}-${m.id.slice(0, 6)}`;
    let candidate = base;
    let n = 2;
    while (existingSlugs.has(candidate)) candidate = `${base}-${n++}`;
    existingSlugs.add(candidate);
    planned.push({ id: m.id, title: m.title, oldSlug: m.slug, newSlug: candidate, status: m.status });
  }

  console.log(`\n[${APPLY ? 'APPLY' : 'DRY-RUN'}] 변환 대상 ${planned.length}건:\n`);
  for (const p of planned) {
    console.log(`  • [${p.status}] "${p.title}"`);
    console.log(`      ${p.oldSlug}  →  ${p.newSlug}`);
  }

  if (!APPLY) {
    console.log('\n실제 적용하려면: node tools/fix-korean-slugs.js --apply');
    return;
  }

  let ok = 0, fail = 0;
  for (const p of planned) {
    const { error: upErr } = await supabase
      .from('magazines')
      .update({ slug: p.newSlug })
      .eq('id', p.id);
    if (upErr) {
      fail++;
      console.error(`  ✗ ${p.id}: ${upErr.message}`);
    } else {
      ok++;
    }
  }
  console.log(`\n완료: 성공 ${ok}건, 실패 ${fail}건`);
})();
