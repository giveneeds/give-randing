import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runResearchForTheme } from '@/lib/research/runResearchForTheme';

export const runtime = 'nodejs';
// Tavily + LLM 호출 — 30~60초 정도 걸릴 수 있음.
export const maxDuration = 120;

// POST /api/admin/content-studio/themes/[id]/run-research
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const result = await runResearchForTheme({ themeId: id });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
