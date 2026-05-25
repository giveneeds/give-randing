#!/usr/bin/env node
// 오늘(KST) planning_sessions + thread_drafts 상태 한 줄 진단.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  const text = fs.readFileSync(p, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await sb
    .from('planning_sessions')
    .select('id, status, user_decision_raw, selected_item_id, thread_draft_id, error, created_at, decided_at, completed_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  console.log(`\n=== planning_sessions (최근 36h, ${sessions?.length || 0}건) ===`);
  for (const s of sessions || []) {
    const dur = s.completed_at && s.decided_at ? Math.round((new Date(s.completed_at) - new Date(s.decided_at)) / 1000) : null;
    console.log(`${s.id.slice(0, 8)} ${s.status.padEnd(15)} raw="${(s.user_decision_raw || '').slice(0, 20)}" item=${s.selected_item_id?.slice(0, 8) || '-'} draft=${s.thread_draft_id?.slice(0, 8) || '-'} ${dur ? dur + 's' : ''} ${s.error ? 'ERR: ' + s.error.slice(0, 80) : ''}`);
  }

  const { data: drafts } = await sb
    .from('thread_drafts')
    .select('id, title, status, planning_session_id, published_at, published_url, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  console.log(`\n=== thread_drafts (최근 36h, ${drafts?.length || 0}건) ===`);
  for (const d of drafts || []) {
    console.log(`${d.id.slice(0, 8)} ${d.status.padEnd(10)} session=${d.planning_session_id?.slice(0, 8) || '-'} pub=${d.published_at ? 'Y' : 'N'} url=${d.published_url ? d.published_url.slice(0, 40) : '-'} "${(d.title || '').slice(0, 50)}"`);
  }

  // 통계
  const byStatus = {};
  for (const s of sessions || []) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  console.log(`\n=== status 요약 ===`);
  console.log(JSON.stringify(byStatus, null, 2));
})();
