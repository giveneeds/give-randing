const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// --- Load env from .env.local ---
let env = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.error('[update_navbar] .env.local not found — cannot continue.');
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('[update_navbar] NEXT_PUBLIC_SUPABASE_URL missing.');
  process.exit(1);
}
const writeKey = serviceKey || anonKey;
if (!writeKey) {
  console.error('[update_navbar] No Supabase key found (service role or anon).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, writeKey);

const NEW_NAVBAR = {
  links: [
    { label: 'we', url: '/#hero' },
    { label: 'do', url: '/service' },
    { label: 'foryou', url: '/for-you' },
    { label: '매거진', url: '/magazine' },
    { label: '문의하기', url: '/contact' }
  ],
  show_cta: true
};

async function run() {
  console.log('--- GIVENEEDS navbar update ---');
  console.log('Target row: landing_settings WHERE id=1');

  // 1) 사전 SELECT (백업용)
  const { data: before, error: beforeErr } = await supabase
    .from('landing_settings')
    .select('id, navbar')
    .eq('id', 1)
    .maybeSingle();

  if (beforeErr) {
    console.error('[update_navbar] SELECT 실패:', beforeErr);
    process.exit(1);
  }
  if (!before) {
    console.error('[update_navbar] id=1 row 가 존재하지 않습니다. seed_data.sql 을 먼저 실행하세요.');
    process.exit(1);
  }

  console.log('\n📦 현재 navbar (백업 복사해 두세요):');
  console.log(JSON.stringify(before.navbar, null, 2));

  // 2) UPDATE
  console.log('\n🔄 UPDATE 중...');
  const { data: after, error: updErr } = await supabase
    .from('landing_settings')
    .update({ navbar: NEW_NAVBAR })
    .eq('id', 1)
    .select('id, navbar')
    .single();

  if (updErr) {
    console.error('[update_navbar] UPDATE 실패:', updErr);
    process.exit(1);
  }

  // 3) 사후 검증
  console.log('\n✅ 업데이트 완료. 현재 값:');
  console.log(JSON.stringify(after.navbar, null, 2));
  console.log('\n실서비스 사이트에서 헤더 탭이 we / do / foryou / 매거진 / 문의하기 순서로 보이는지 확인하세요.');
}

run().catch((e) => {
  console.error('[update_navbar] 예외 발생:', e);
  process.exit(1);
});
