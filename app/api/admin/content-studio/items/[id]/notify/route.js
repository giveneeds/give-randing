import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { sendInlineMessage, buildItemCard, buildItemButtons } from '@/lib/telegram';
import { translateToKorean } from '@/lib/llm';

export const runtime = 'nodejs';

const SELECT_COLS = 'id, job_id, source, source_account, post_id, post_url, posted_at, collected_at, normalized, classification, summary, translation, status, send_flag, reviewed_at, note, notified_at, notification_message_id, approved_via';

/**
 * POST /api/admin/content-studio/items/[id]/notify
 *
 * 해당 아이템을 모든 active 텔레그램 수신자에게 발송.
 * 번역이 없으면 먼저 translateToKorean 호출.
 *
 * 반환: { ok, row: 갱신된 item, delivered_count }
 */
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'service role 미설정' }, { status: 500 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN 미설정' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 });

  try {
    // 1) item 로드
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('agent_items')
      .select(SELECT_COLS)
      .eq('id', id)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return NextResponse.json({ error: '대상 없음' }, { status: 404 });

    // 2) active 수신자 로드
    const { data: recipients, error: rErr } = await supabaseAdmin
      .from('agent_telegram_recipients')
      .select('id, chat_id')
      .eq('active', true);
    if (rErr) throw rErr;
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: '활성 수신자가 없습니다. 텔레그램 탭에서 활성화하세요.' }, { status: 400 });
    }

    // 3) 번역이 없으면 lazy 번역
    let translation = item.translation;
    if (!translation) {
      try {
        translation = await translateToKorean({
          itemId: item.id,
          title: item.normalized?.title,
          text: item.normalized?.extracted_text,
          summary: item.summary?.one_line_summary,
        });
        await supabaseAdmin
          .from('agent_items')
          .update({ translation })
          .eq('id', id);
        item.translation = translation;
      } catch (e) {
        // 번역 실패해도 발송은 계속 진행. translation은 없음 상태 유지.
        console.error('번역 실패', e.message);
      }
    }

    // 4) 카드 빌드 후 각 수신자에게 발송
    const text = buildItemCard(item);
    const buttons = buildItemButtons(item.id);

    let lastMessageId = null;
    let delivered = 0;
    for (const r of recipients) {
      try {
        const result = await sendInlineMessage({
          chatId: r.chat_id,
          text,
          buttons,
        });
        lastMessageId = result?.message_id || lastMessageId;
        delivered += 1;
      } catch (e) {
        console.error(`텔레그램 발송 실패 chat=${r.chat_id}:`, e.message);
      }
    }

    if (delivered === 0) {
      return NextResponse.json({ error: '발송된 수신자가 없습니다 (Telegram API 실패)' }, { status: 500 });
    }

    // 5) notified_at, notification_message_id 갱신
    const { data: updated } = await supabaseAdmin
      .from('agent_items')
      .update({
        notified_at: new Date().toISOString(),
        notification_message_id: lastMessageId,
      })
      .eq('id', id)
      .select(SELECT_COLS)
      .maybeSingle();

    return NextResponse.json({ ok: true, row: updated || item, delivered_count: delivered });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
