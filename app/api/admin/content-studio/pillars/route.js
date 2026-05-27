import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getContentPillars } from '@/lib/agent/contentPillarStrategy';

export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const pillars = getContentPillars();
  const distribution = await getRecentDraftDistribution();
  const docsTable = readPillarDocsTable();
  const rows = Object.entries(pillars).map(([key, value], index) => ({
    key,
    index: index + 1,
    label: value.label || key,
    role: value.role || '',
    weight: docsTable.get(key)?.weight || null,
    docsRole: docsTable.get(key)?.role || '',
    recentDraftCount: distribution.counts[key] || 0,
    recentDraftShare: distribution.total > 0 ? Math.round(((distribution.counts[key] || 0) / distribution.total) * 1000) / 10 : 0,
    threadKeywords: Array.isArray(value.threadKeywords) ? value.threadKeywords : [],
    researchAngles: Array.isArray(value.researchAngles) ? value.researchAngles : [],
  }));

  return NextResponse.json({
    version: '2026-05-22',
    mode: 'agent_scored_strategy_lanes',
    selectionOwner: 'agent',
    userVisibleInTelegram: true,
    recentWindowDays: 30,
    recentDraftTotal: distribution.total,
    docsSource: 'docs/content-logic/threads/04-pillars-and-treatments.md',
    scoreCriteria: [
      '타겟 적합도',
      '리서치 소스와의 연결성',
      '발행 가치',
      '브랜드 일관성',
      '뻔한 조언으로 흐를 위험',
    ],
    telegramFields: [
      '선택된 콘텐츠 기둥',
      '기둥 선택 이유',
      '타겟 적합도',
      '주요 리서치 출처',
      '작성 방향',
    ],
    rows,
  });
}

async function getRecentDraftDistribution() {
  if (!supabaseAdmin) return { total: 0, counts: {}, error: 'service_role_missing' };
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('thread_drafts')
    .select('content_pillar, created_at')
    .gte('created_at', since);
  if (error) return { total: 0, counts: {}, error: error.message };
  const counts = {};
  for (const row of data || []) {
    const key = row.content_pillar || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return { total: (data || []).length, counts };
}

function readPillarDocsTable() {
  const map = new Map();
  try {
    const file = path.join(process.cwd(), 'docs', 'content-logic', 'threads', '04-pillars-and-treatments.md');
    const body = fs.readFileSync(file, 'utf8');
    const rowRe = /^\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|\s*(\d+%)\s*\|\s*(.+?)\s*\|$/gm;
    let match;
    while ((match = rowRe.exec(body))) {
      map.set(match[2], {
        label: match[1].trim(),
        weight: match[3].trim(),
        role: match[4].trim(),
      });
    }
  } catch {
    // 문서가 없어도 API 자체는 동작해야 한다.
  }
  return map;
}
