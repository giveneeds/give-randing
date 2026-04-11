// 글로벌 섹션 라이브러리에 'brand_stats' 마스터 블록을 등록합니다.
// 사용법: node setup_brand_stats_block.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
  console.error('.env.local not found');
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Registering master_brand_stats block ---');

  const block = {
    id: 'master_brand_stats',
    type: 'brand_stats',
    title: '브랜드 헤드라인 + 카운트업',
    subtitle: '[MASTER] BOTH',
    content: {
      eyebrow: 'GIVENEEDS',
      title_main: 'We are',
      title_dim: 'brand marketing agency',
      stats: [
        { value: 1024, suffix: '+', label: '누적 프로젝트', description: '1024+ 누적 프로젝트를 진행하였습니다.' },
        { value: 500, suffix: '+', label: '누적 광고주', description: '누적광고주는 500+ 입니다.' },
      ],
    },
    is_active: false,
    order_index: 9999,
  };

  const { error } = await supabase
    .from('global_sections')
    .upsert(block, { onConflict: 'id' });

  if (error) {
    console.error('❌ Failed to register:', error.message);
    process.exit(1);
  }
  console.log('✅ master_brand_stats registered into global_sections.');
  console.log('   → 어드민 > 홈 섹션 관리 > 새 섹션 추가 > 마스터 라이브러리에서 확인하세요.');
}

run();
