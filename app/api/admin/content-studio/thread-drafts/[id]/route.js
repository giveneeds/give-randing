import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(['draft', 'reviewed', 'approved', 'published', 'rejected']);

// GET /api/admin/content-studio/thread-drafts/[id]
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('thread_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '드래프트를 찾을 수 없음' }, { status: 404 });

  // 주제명 + 원본 item 정보 같이.
  let theme = null;
  if (data.theme_id) {
    const { data: t } = await supabaseAdmin
      .from('content_themes')
      .select('id, name, target_persona, target_topic_cluster')
      .eq('id', data.theme_id).maybeSingle();
    theme = t;
  }
  let agentItem = null;
  if (data.agent_item_id) {
    const { data: ai } = await supabaseAdmin
      .from('agent_items')
      .select('id, source, post_url, normalized, classification, summary, translation')
      .eq('id', data.agent_item_id).maybeSingle();
    agentItem = ai;
  }
  return NextResponse.json({ row: { ...data, theme, agent_item: agentItem } });
}

// PATCH /api/admin/content-studio/thread-drafts/[id]
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  let body = {};
  try { body = await request.json(); } catch {}

  const update = {};
  if (typeof body.title === 'string') update.title = body.title;
  if (Array.isArray(body.posts)) {
    update.posts = body.posts.map((p, i) => ({
      index: typeof p.index === 'number' ? p.index : i + 1,
      body: typeof p.body === 'string' ? p.body : '',
      char_count: typeof p.body === 'string' ? p.body.length : 0,
    })).filter((p) => p.body);
  }
  if (typeof body.cta === 'string') update.cta = body.cta;
  if (Array.isArray(body.hashtags)) update.hashtags = body.hashtags.filter((x) => typeof x === 'string').slice(0, 10);
  if (typeof body.internal_notes === 'string') update.internal_notes = body.internal_notes;
  if (typeof body.status === 'string' && VALID_STATUSES.has(body.status)) {
    update.status = body.status;
    if (body.status === 'published' && !body.published_at) {
      update.published_at = new Date().toISOString();
    }
  }
  if (typeof body.published_url === 'string') update.published_url = body.published_url;
  if (typeof body.format_type === 'string') update.format_type = body.format_type;
  if (typeof body.hook_pattern === 'string') update.hook_pattern = body.hook_pattern;
  if (typeof body.tone_pattern === 'string') update.tone_pattern = body.tone_pattern;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('thread_drafts')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

// DELETE /api/admin/content-studio/thread-drafts/[id]
export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from('thread_drafts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
