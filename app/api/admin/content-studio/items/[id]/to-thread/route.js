import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { convertItemToThreadDraft } from '@/lib/agent/convertItemToThreadDraft';

export const runtime = 'nodejs';
export const maxDuration = 120;

// POST /api/admin/content-studio/items/[id]/to-thread
// Body: { formatTypeHint?: 'single_post' | 'short_thread' }
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  let body = {};
  try { body = await request.json(); } catch {}

  try {
    const result = await convertItemToThreadDraft({
      itemId: id,
      formatTypeHint: body.formatTypeHint,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
