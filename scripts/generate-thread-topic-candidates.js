#!/usr/bin/env node
/*
 * LEGACY: Threads audit 문서를 기둥별 주제 후보로 변환한다.
 *
 * 현재 운영 플로우에서 Threads/Apify는 주제 발굴용이 아니라 주차별 말투·후킹
 * 코퍼스로만 사용한다. 이 스크립트는 과거 산출물 비교가 필요할 때만
 * --legacy-topic-output 플래그로 수동 실행한다.
 *
 * 사용:
 * - node scripts/generate-thread-topic-candidates.js --legacy-topic-output
 * - node scripts/generate-thread-topic-candidates.js --legacy-topic-output --audit docs/reference-data/file.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_PILLARS = path.join(ROOT, 'config', 'content-pillars.json');
const REF_DIR = path.join(ROOT, 'docs', 'reference-data');

function parseArgs(argv) {
  const args = {
    audit: null,
    pillars: DEFAULT_PILLARS,
    outDir: path.join(ROOT, 'docs', 'topic-candidates'),
    date: todayKst(),
    legacyTopicOutput: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--audit') args.audit = path.resolve(argv[++i]);
    else if (arg === '--pillars') args.pillars = path.resolve(argv[++i]);
    else if (arg === '--out-dir') args.outDir = path.resolve(argv[++i]);
    else if (arg === '--date') args.date = argv[++i];
    else if (arg === '--legacy-topic-output') args.legacyTopicOutput = true;
  }
  return args;
}

function todayKst() {
  return new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function latestAuditFile() {
  const files = fs.readdirSync(REF_DIR)
    .filter((f) => /^threads-popular-post-audit-.*\.md$/.test(f))
    .sort();
  if (files.length === 0) throw new Error('Threads audit 파일이 없습니다.');
  return path.join(REF_DIR, files[files.length - 1]);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractRows(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/<br>/g, ' '));
      return {
        rank: Number(cells[0]),
        keyword: cells[1],
        author: cells[2],
        firstLines: cells[3],
        metrics: cells[4],
        format: cells[5],
        painPoint: cells[6],
        executionFeel: cells[7],
        url: cells[8],
      };
    });
}

function inferPillar(row, pillars) {
  const text = `${row.keyword} ${row.firstLines} ${row.painPoint} ${row.format}`.toLowerCase();
  if (/자료|리스트|체크리스트|저장|10개만|인사이트 채널|모음/.test(text)) return 'do_today';
  if (/대박 나는 계정|어제도 올리고 오늘도|요즘|바이럴|스레드/.test(text)) return 'current_observation';
  if (/구글 마케팅 라이브|ai|검색|메타|플랫폼|숏폼/.test(text)) return 'trend_plain';
  if (/소재|후킹|콘텐츠 기획|상세페이지|카드뉴스/.test(text)) return 'content_showcase';
  if (/광고비|대행|업체|보고서|성과|돈/.test(text)) return 'cost_before_spend';
  const scores = Object.entries(pillars.pillars).map(([key, value]) => {
    const keywordScore = (value.threadKeywords || []).reduce((acc, keyword) => (
      text.includes(String(keyword).toLowerCase()) ? acc + 2 : acc
    ), 0);
    const roleWords = String(value.label + ' ' + value.role).split(/\s+/).filter((w) => w.length >= 2);
    const roleScore = roleWords.reduce((acc, word) => (text.includes(word.toLowerCase()) ? acc + 1 : acc), 0);
    return [key, keywordScore + roleScore];
  }).sort((a, b) => b[1] - a[1]);
  return scores[0]?.[1] > 0 ? scores[0][0] : 'current_observation';
}

function isRelevantRow(row) {
  const text = `${row.firstLines} ${row.painPoint}`.toLowerCase();
  if (/(민주화|목숨받친|지옥간다|저질양아치|희롱)/.test(text)) return false;
  if (!row.firstLines || row.firstLines === '-') return false;
  return true;
}

function buildTopic(row, pillarKey, pillars) {
  const first = row.firstLines.replace(/^["']|["']$/g, '');
  const pain = row.painPoint && row.painPoint !== '-' ? row.painPoint : '';
  const label = pillars.pillars[pillarKey]?.label || pillarKey;
  const base = `${first} ${pain}`;

  if (/저장|10개만|인사이트 채널|모음|챕터/.test(base)) {
    return '사장님이 저장해두고 따라 할 마케팅 루틴 만들기';
  }
  if (/1,000만 원 광고비|광고비.*낫|광고비 안쓰고|광고비 안 쓰고/.test(base)) {
    return '광고비를 더 쓰기 전에 다른 유입 길부터 보는 법';
  }
  if (/대박 나는 계정|어제도 올리고 오늘도|매일/.test(base)) {
    return '요즘 잘 되는 계정들이 완벽함보다 자주 보이는 이유';
  }
  if (/구글 마케팅 라이브|AI|검색|메타/.test(base)) {
    return '큰 플랫폼 발표를 사장님 일로 바꿔 읽는 법';
  }
  if (/스토어.*마케팅 회사|대행|업체|사기|믿/.test(base)) {
    return '마케팅 연락이 많이 올 때 먼저 걸러볼 질문';
  }
  if (/홍보는 대체|답답|어떻게 하는/.test(base)) {
    return '마케팅이 막막할 때 제일 먼저 정리할 한 가지';
  }
  if (/상위노출|플레이스/.test(base)) {
    return '상위노출보다 먼저 봐야 할 선택 이유';
  }

  if (pillarKey === 'cost_before_spend') {
    return `${row.keyword || '마케팅'}에 돈 쓰기 전에 먼저 확인할 것`;
  }
  if (pillarKey === 'do_today') {
    return `오늘 바로 바꿔볼 ${row.keyword || '마케팅'} 한 가지`;
  }
  if (pillarKey === 'trend_plain') {
    return `요즘 ${row.keyword || '마케팅'} 흐름에서 사장님이 봐야 할 것`;
  }
  if (pillarKey === 'content_showcase') {
    return `우리 업체가 더 잘 보이게 만드는 ${row.keyword || '콘텐츠'} 소재`;
  }
  return base.length > 8 ? `요즘 사람들이 반응하는 ${row.keyword || '마케팅'} 방식` : label;
}

function inferResearchNeed(row, pillarKey) {
  const text = `${row.firstLines} ${row.painPoint} ${row.keyword}`.toLowerCase();
  const hasSpecificSignal = /(발표|공개|업데이트|파트너십|무료|도구|ai|google|gemini|capcut|claude|meta|구글|메타|클로드|캡컷)/i.test(text);
  const hasPracticalClue = /(방법|체크|정리|10개|도구|소재|제목|리뷰|광고|사진|편집|생성|분석)/.test(text);
  const hasOnlyVibe = /(첫 스레드|잘부탁|두근두근|스치니)/.test(text);

  if (hasOnlyVibe) {
    return {
      level: 'high',
      reason: '반응 신호는 있지만 내용 근거가 약함',
      suggestedSources: ['Threads 추가 관찰', 'X 빠른 이슈'],
    };
  }
  if (pillarKey === 'trend_plain' && !hasSpecificSignal) {
    return {
      level: 'high',
      reason: '흐름 해석형인데 구체 발표/변화 신호가 부족함',
      suggestedSources: ['뉴스/공식문서', 'X 빠른 이슈'],
    };
  }
  if (!hasPracticalClue) {
    return {
      level: 'medium',
      reason: '실행 예시를 만들 근거가 부족함',
      suggestedSources: ['Reddit 사례', '내부 KB'],
    };
  }
  if (hasSpecificSignal) {
    return {
      level: 'medium',
      reason: '툴/플랫폼 이슈는 사실 확인이 필요함',
      suggestedSources: ['공식문서/뉴스', 'X 빠른 이슈'],
    };
  }
  return {
    level: 'low',
    reason: 'Threads 신호만으로 관찰형 초안 가능',
    suggestedSources: ['내부 KB'],
  };
}

function buildMarkdown({ date, auditFile, rows, pillars }) {
  const candidates = rows.filter(isRelevantRow).slice(0, 8).map((row, index) => {
    const pillarKey = inferPillar(row, pillars);
    const pillar = pillars.pillars[pillarKey];
    const topic = buildTopic(row, pillarKey, pillars);
    const goal = row.format.includes('자료') || row.executionFeel.includes('즉시') ? 'save' : (row.format.includes('질문') ? 'comment' : 'viewpoint');
    const ending = goal === 'save' ? 'save' : (goal === 'comment' ? 'question' : 'none');
    const researchNeed = inferResearchNeed(row, pillarKey);
    return {
      index: index + 1,
      topic,
      pillarKey,
      pillarLabel: pillar?.label || pillarKey,
      goal,
      ending,
      sourceSignal: `${row.keyword} · ${row.format} · ${row.metrics}`,
      whyNow: row.painPoint || row.firstLines,
      researchNeed,
      url: row.url,
    };
  });

  const rowsMd = candidates.map((c) => (
    `| ${c.index} | ${escapeCell(c.topic)} | ${escapeCell(c.pillarLabel)} | ${c.goal} | ${c.ending} | ${escapeCell(c.researchNeed.level)} | ${escapeCell(c.researchNeed.reason)} | ${escapeCell(c.whyNow)} | ${escapeCell(c.sourceSignal)} | ${escapeCell(c.url)} |`
  )).join('\n');

  return `# Threads 주제 후보 ${date}

원본 audit: \`${path.relative(ROOT, auditFile)}\`

이 문서는 Threads 수집 데이터를 바로 글로 쓰지 않고, 기브니즈 관점의 주제 후보로 한 번 변환한 기록이다. 후보는 확정 원고가 아니라 기획 회의용 중간 산출물이다.

| # | 주제 후보 | 기둥 | 목표 | 마무리 | 보강 | 보강 이유 | 왜 지금 | 수집 신호 | URL |
|---|---|---|---|---|---|---|---|---|---|
${rowsMd || '| - | 후보 없음 | - | - | - | - | - | - | - | - |'}

## 사용 규칙

- 이 후보를 그대로 제목으로 복사하지 않는다.
- 하나를 선택한 뒤 Reddit/X/뉴스/공식문서/내부 KB 중 필요한 소스로만 보강한다.
- Threads 원문은 말투와 반응 패턴 참고용이며, 내용을 그대로 차용하지 않는다.
- 보강이 \`high\` 인 후보는 바로 단정형 원고로 쓰지 않는다.
- 보강이 \`medium\` 인 후보는 최소 1개 소스로 사실/사례/도구 정보를 확인한다.
- 보강이 \`low\` 인 후보는 관찰형 또는 저장형 초안으로 바로 진행할 수 있다.
- 글 생성 시 \`content_pillar\`, \`content_goal\`, \`ending_type\`을 다시 검토한다.
`;
}

function escapeCell(value) {
  return String(value || '-').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').slice(0, 220);
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.legacyTopicOutput) {
    console.log(JSON.stringify({
      skipped: true,
      reason: 'Threads audit는 현재 주제 발굴용이 아니라 주차별 말투·후킹 코퍼스로만 사용합니다.',
      how_to_run_legacy: 'node scripts/generate-thread-topic-candidates.js --legacy-topic-output',
    }, null, 2));
    return;
  }
  const auditFile = args.audit || latestAuditFile();
  const audit = fs.readFileSync(auditFile, 'utf8');
  const pillars = readJson(args.pillars);
  const rows = extractRows(audit);
  const markdown = buildMarkdown({ date: args.date, auditFile, rows, pillars });
  fs.mkdirSync(args.outDir, { recursive: true });
  const outPath = path.join(args.outDir, `threads-topic-candidates-${args.date}.md`);
  fs.writeFileSync(outPath, markdown);
  console.log(JSON.stringify({ output: outPath, source_rows: rows.length }, null, 2));
}

main();
