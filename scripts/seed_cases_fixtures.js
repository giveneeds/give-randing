// 고객 사례 픽스처 일괄 시딩 (3건)
//
// 동작:
//  - UPDATES: 기존 레코드의 특정 필드만 변경 (존재하지 않으면 경고)
//  - INSERTS: slug 충돌 체크 → 없을 때만 새로 생성 (있으면 건너뜀)
//
// 안전 정책 (AGENTS.md):
//  - SELECT 먼저 → 충돌 시 건너뜀
//  - 기존 데이터 블라인드 덮어쓰지 않음 (patch 방식)
//  - 재실행 시 idempotent
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/))[1].trim();
const sb = createClient(url, key);

// ─── 본문 (content_html) ─────────────────────────────
const BODY = {
  haemalgeum: `
<h2>배경</h2>
<p>동탄 신도시 확장과 함께 오픈한 심리상담 센터의 첫 지점입니다. 수요는 존재하지만 브랜드 인지도가 전무한 상황에서, 지역 기반 검색으로 센터를 찾는 잠재 내담자와 빠르게 연결될 필요가 있었습니다.</p>

<h2>접근 방식</h2>
<p>네이버 플레이스·블로그·지역 커뮤니티의 3개 축을 동시에 세팅하되, 상담 전문성을 해치지 않는 톤앤매너를 최우선으로 잡았습니다. "빠른 예약 전환"보다 "신뢰 가능한 전문가"라는 포지셔닝을 먼저 만들어 초기 문의 품질부터 관리했습니다.</p>

<h2>운영 포인트</h2>
<ul>
  <li>지역 키워드 기반 플레이스 최적화 — 동탄 심리상담·동탄 상담센터 등</li>
  <li>상담 주제별 블로그 콘텐츠 발행 — 일반인이 검색하는 고민 키워드 중심</li>
  <li>지역 맘카페·직장인 커뮤니티에서 자연스러운 평판 축적</li>
</ul>

<h2>성과</h2>
<p>지역 검색 상위 노출이 안정적으로 확장되었고, 일반 광고 대비 전환 품질이 높은 문의가 지속 유입되고 있습니다. 초기 운영 데이터를 바탕으로 상담 예약 페이지 UX 개선 단계로 진입했습니다.</p>
`.trim(),

  judorak: `
<h2>배경</h2>
<p>용산 직장인 상권에 오픈한 이자카야로, 주변 경쟁 점포가 많고 가격·컨셉이 유사한 환경에서 "한 번쯤 가봐야 할 곳"으로 자리매김할 필요가 있었습니다.</p>

<h2>접근 방식</h2>
<p>회식·2차·혼술 세 가지 방문 상황별 키워드를 분리 설계하고, 각 상황에 맞춘 리뷰·사진·메뉴판 노출을 강화했습니다. 플레이스 이미지 구성만으로도 "분위기 좋은 곳"이라는 첫인상을 만들도록 편집 기준을 조정했습니다.</p>

<h2>운영 포인트</h2>
<ul>
  <li>상황별 키워드 세팅: 용산 회식 / 용산 이자카야 / 용산 술집 추천</li>
  <li>시그니처 메뉴 3종 중심의 블로그 후기 콘텐츠 발행</li>
  <li>주말·평일 저녁 피크타임에 맞춘 실시간 후기 노출 운영</li>
</ul>

<h2>성과</h2>
<p>오픈 초기 대비 지역 검색 결과 상위 노출이 안정화되었고, 회식 예약과 신규 단골 전환이 고르게 발생하고 있습니다. 브랜드 확장(가맹 또는 2호점)을 검토할 수 있는 수준의 인지도를 확보했습니다.</p>
`.trim(),

  collins: `
<h2>배경</h2>
<p>국내에서 디자인·품질을 인정받은 인센스 브랜드가 해외 시장 진출을 준비하며, 광고가 아닌 자연스러운 입소문을 통해 첫 해외 고객층을 확보하고자 했습니다.</p>

<h2>접근 방식</h2>
<p>Instagram·TikTok·Pinterest 세 플랫폼의 라이프스타일·ASMR·홈 인테리어 커뮤니티를 타깃으로, 제품이 공간에 스며드는 장면 중심의 콘텐츠를 설계했습니다. "광고 느낌이 들지 않는 사용자 후기" 톤을 유지하며 해외 마이크로 인플루언서와 협업했습니다.</p>

<h2>운영 포인트</h2>
<ul>
  <li>플랫폼별 콘텐츠 포맷 분리 운영 — IG Reels / TikTok / Pinterest Pins</li>
  <li>영미권·동남아 라이프스타일 인플루언서 샘플 발송 후 자유 포스팅</li>
  <li>해외 해시태그·검색 트렌드 모니터링 및 콘텐츠 반복 노출 유도</li>
</ul>

<h2>성과</h2>
<p>해외 SNS 유입이 누적 확장되었고, 자사몰·글로벌 리테일 바이어의 자발적 문의로 연결되고 있습니다. 브랜드가 의도한 "조용한 한국 라이프스타일" 포지셔닝이 해외에서도 동일하게 전달되는 것을 확인했습니다.</p>
`.trim(),
};

// ─── 기존 레코드 부분 업데이트 ────────────────────────
// 카테고리 재정리: LOCAL → '검색노출', OVERSEAS VIRAL → '바이럴'
// 본문(content_html)도 함께 채움
const UPDATES = [
  {
    slug: 'haemalgeum-dongtan',
    patch: {
      category: '검색노출',
      result_summary: '검색 노출 확장',
      content_html: BODY.haemalgeum,
    },
  },
  {
    slug: 'judorak-yongsan',
    patch: {
      category: '검색노출',
      content_html: BODY.judorak,
    },
  },
  {
    slug: 'collins-incense',
    patch: {
      category: '바이럴',
      content_html: BODY.collins,
    },
  },
];

// ─── 신규 삽입 레코드 (없을 때만) ────────────────────
const INSERTS = [
  {
    slug: 'judorak-yongsan',
    title: '용산 주도락 지역 검색 노출 확장',
    client_name: '주도락 용산점',
    category: '검색노출',
    thumbnail_url: '',
    cover_url: '',
    excerpt: '용산 직장인 상권을 타깃으로 한 이자카야의 지역 검색 노출 확장 운영 사례입니다.',
    content_html: BODY.judorak,
    services: ['네이버 플레이스 최적화', '블로그 마케팅', '지역 키워드 세팅'],
    tags: ['이자카야', '용산', '지역검색', '외식업'],
    result_summary: '검색 노출 확장',
    is_featured: false,
    status: 'published',
    sort_order: 20,
  },
  {
    slug: 'collins-incense',
    title: '콜린스 인센스 해외 바이럴 확산',
    client_name: '콜린스 인센스',
    category: '바이럴',
    thumbnail_url: '',
    cover_url: '',
    excerpt: '국내 인센스 브랜드의 해외 시장 진입을 위한 바이럴 운영 사례입니다.',
    content_html: BODY.collins,
    services: ['해외 SNS 바이럴', '인플루언서 마케팅', '글로벌 콘텐츠'],
    tags: ['인센스', '라이프스타일', '해외', '바이럴'],
    result_summary: '해외 바이럴 확산',
    is_featured: false,
    status: 'published',
    sort_order: 30,
  },
];

(async () => {
  console.log('▶ UPDATES');
  for (const u of UPDATES) {
    const { data: existing, error: selErr } = await sb
      .from('case_studies')
      .select('id, slug')
      .eq('slug', u.slug)
      .maybeSingle();

    if (selErr) {
      console.error(`  ❌ ${u.slug}: 조회 실패 - ${selErr.message}`);
      continue;
    }
    if (!existing) {
      console.warn(`  ⚠ ${u.slug}: 레코드 없음 - 건너뜀 (INSERTS 단계에서 처리)`);
      continue;
    }

    const { error: updErr } = await sb
      .from('case_studies')
      .update(u.patch)
      .eq('slug', u.slug);

    if (updErr) {
      console.error(`  ❌ ${u.slug}: 업데이트 실패 - ${updErr.message}`);
    } else {
      const keys = Object.keys(u.patch).join(', ');
      console.log(`  ✓ ${u.slug}: patched {${keys}}`);
    }
  }

  console.log('\n▶ INSERTS');
  for (const rec of INSERTS) {
    const { data: existing, error: selErr } = await sb
      .from('case_studies')
      .select('id')
      .eq('slug', rec.slug);

    if (selErr) {
      console.error(`  ❌ ${rec.slug}: 조회 실패 - ${selErr.message}`);
      continue;
    }
    if (existing && existing.length > 0) {
      console.log(`  ⏭ ${rec.slug}: 이미 존재 - 건너뜀`);
      continue;
    }

    const { data, error: insErr } = await sb
      .from('case_studies')
      .insert(rec)
      .select('id, slug, title')
      .single();

    if (insErr) {
      console.error(`  ❌ ${rec.slug}: 삽입 실패 - ${insErr.message}`);
    } else {
      console.log(`  ✓ ${rec.slug}: id=${data.id}`);
    }
  }

  console.log('\n▶ 최종 상태');
  const { data: all } = await sb
    .from('case_studies')
    .select('slug, client_name, category, result_summary, is_featured, sort_order')
    .order('sort_order', { ascending: true });
  console.table(all);
})();
