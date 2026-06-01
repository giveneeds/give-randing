import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mergeServiceDetailsForSave } from '@/lib/serviceDetailBlocks';

const ALLOWED_PATCH_FIELDS = new Set([
  'slug',
  'title',
  'subtitle',
  'description',
  'category',
  'color',
  'icon',
  'details',
  'order_num',
  'is_active',
]);

const READ_ONLY_PATCH_FIELDS = new Set(['id', 'created_at', 'updated_at']);

// PATCH: 서비스 정보 수정 (어드민용)
export async function PATCH(request, { params }) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const rawBody = await request.json();
    const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
      ? Object.fromEntries(
        Object.entries(rawBody).filter(([key]) => !READ_ONLY_PATCH_FIELDS.has(key))
      )
      : {};
    const unknownFields = Object.keys(body).filter((key) => !ALLOWED_PATCH_FIELDS.has(key));

    if (unknownFields.length > 0) {
      return NextResponse.json(
        { error: `허용되지 않은 필드가 포함되어 있습니다: ${unknownFields.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'slug')
      && body.slug
      && body.slug !== existing.slug
    ) {
      return NextResponse.json(
        { error: '기존 상품의 slug는 이 API에서 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    const patch = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field) && field !== 'details' && field !== 'slug') {
        patch[field] = body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'details')) {
      const { details, errors } = mergeServiceDetailsForSave(existing.details, body.details);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: '상품 상세 블록 데이터가 올바르지 않습니다.', details: errors },
          { status: 400 }
        );
      }
      patch.details = details;
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error(`Error updating service ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 서비스 삭제 (어드민용)
export async function DELETE(request, { params }) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error(`Error deleting service ${id}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
