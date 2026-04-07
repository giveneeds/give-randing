/**
 * 매거진 카테고리 마이그레이션
 *
 * 매핑:
 *   ANALYSIS    → CASE
 *   CASE STUDY  → CASE
 *   TREND       → TREND  (그대로 유지 — 새 시스템과 동일)
 *   INSIGHT     → ''     (미분류 → "모든 글" 뷰 매일 12시 랜덤 노출)
 *   STRATEGY    → ''     (미분류)
 *
 * 사용법:
 *   1. 미리보기:        node migrate_magazine_categories.js
 *   2. 실제 적용:        node migrate_magazine_categories.js --apply
 *   3. 백업은 자동으로 magazine_category_backup_<timestamp>.json 생성
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let env = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) env[key.trim()] = valueParts.join('=').trim();
  });
} catch (e) {
  console.warn('.env.local not found, trying process.env');
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// 카테고리 업데이트는 RLS 우회 필요 — service role 사용
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL/Key가 없습니다 (.env.local 확인)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPPING = {
  'ANALYSIS': 'CASE',
  'CASE STUDY': 'CASE',
  'TREND': 'TREND',
  'INSIGHT': '',
  'STRATEGY': '',
};

const APPLY = process.argv.includes('--apply');

(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  매거진 카테고리 마이그레이션');
  console.log(`  모드: ${APPLY ? '🔥 APPLY (실제 변경)' : '👀 PREVIEW (미리보기만)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1) 현재 상태 조회
  const { data: rows, error } = await supabase
    .from('magazines')
    .select('id, title, category')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📚 총 ${rows.length}개의 매거진 조회됨\n`);

  // 2) 변경 대상 분류
  const changes = [];
  const skipped = [];
  rows.forEach(r => {
    const before = r.category || '';
    if (before in MAPPING) {
      const after = MAPPING[before];
      if (before !== after) {
        changes.push({ id: r.id, title: r.title, before, after });
      } else {
        skipped.push({ id: r.id, title: r.title, before, reason: '동일 값 (변경 불필요)' });
      }
    } else {
      skipped.push({ id: r.id, title: r.title, before, reason: '매핑 대상 아님 (이미 새 값이거나 미지정)' });
    }
  });

  console.log(`✏️  변경 예정: ${changes.length}개`);
  console.log(`⏭️  건너뜀: ${skipped.length}개\n`);

  if (changes.length > 0) {
    console.log('━━ 변경 예정 목록 ━━');
    changes.forEach(c => {
      const afterLabel = c.after === '' ? '(미분류)' : c.after;
      console.log(`  ${c.before.padEnd(11)} → ${afterLabel.padEnd(11)}  ${c.title}`);
    });
    console.log('');
  }

  if (skipped.length > 0) {
    console.log('━━ 건너뛴 항목 ━━');
    skipped.forEach(s => {
      console.log(`  ${(s.before || '(빈값)').padEnd(11)}  ${s.title}  — ${s.reason}`);
    });
    console.log('');
  }

  // 3) 백업 저장
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `magazine_category_backup_${ts}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
  console.log(`💾 백업 저장: ${backupPath}\n`);

  if (!APPLY) {
    console.log('👀 PREVIEW 모드 — 실제 변경 없음');
    console.log('   적용하려면: node migrate_magazine_categories.js --apply\n');
    return;
  }

  if (changes.length === 0) {
    console.log('✅ 변경할 항목이 없습니다.');
    return;
  }

  // 4) 실제 업데이트
  console.log('🔥 변경 적용 중...\n');
  let success = 0;
  let failed = 0;
  for (const c of changes) {
    const { error: updateError } = await supabase
      .from('magazines')
      .update({ category: c.after })
      .eq('id', c.id);
    if (updateError) {
      console.error(`  ❌ ${c.title}: ${updateError.message}`);
      failed++;
    } else {
      success++;
    }
  }

  console.log(`\n✅ 성공: ${success} / ❌ 실패: ${failed}`);
  console.log(`💾 백업 위치: ${backupPath}`);
  console.log('   롤백이 필요하면 백업 파일로 복원 가능');
})();
