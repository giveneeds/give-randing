import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { normalizePersona } from '@/lib/contentTaxonomy';

export const runtime = 'nodejs';

// PATCH /api/admin/content-studio/themes/[id] — 부분 수정
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  let body = {};
  try { body = await request.json(); } catch {}

  const update = {};
  if (typeof body.name === 'string') update.name = body.name;
  if (typeof body.description === 'string') update.description = body.description;
  const normalizedPersona = normalizePersona(body.target_persona);
  if (normalizedPersona !== 'unknown') update.target_persona = normalizedPersona;
  if (typeof body.target_topic_cluster === 'string' || body.target_topic_cluster === null) update.target_topic_cluster = body.target_topic_cluster;
  if (Array.isArray(body.research_keywords)) update.research_keywords = body.research_keywords.filter((x) => typeof x === 'string' && x.trim());
  if (Array.isArray(body.collection_source_ids)) update.collection_source_ids = body.collection_source_ids;
  if (Number.isFinite(body.cadence_days)) update.cadence_days = Math.max(1, body.cadence_days);
  if (typeof body.active === 'boolean') update.active = body.active;
  if (Number.isFinite(body.sort_order)) update.sort_order = body.sort_order;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('content_themes')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

// DELETE /api/admin/content-studio/themes/[id]
export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('content_themes')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
