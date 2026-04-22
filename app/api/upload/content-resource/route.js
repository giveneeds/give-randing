import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = ['pdf','doc','docx','xls','xlsx','ppt','pptx','hwp','hwpx','zip','txt','csv'];
const ALLOWED_PARENT = new Set(['magazine', 'campaign']);

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage 미설정: SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const parentType = String(formData.get('parent_type') || '');
    const parentId = String(formData.get('parent_id') || '');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }
    if (!ALLOWED_PARENT.has(parentType) || !parentId) {
      return NextResponse.json({ error: 'parent_type / parent_id 가 유효하지 않습니다.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 50MB 이하여야 합니다.' }, { status: 400 });
    }

    const origName = file.name || 'file';
    const ext = (origName.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (.${ext}) 허용: ${ALLOWED_EXT.join(', ')}` },
        { status: 400 },
      );
    }

    const safeExt = ext.slice(0, 5);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
    const folder = parentType === 'magazine' ? 'magazines' : 'campaigns';
    const path = `${folder}/${parentId}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('content-resources')
      .upload(path, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      path,
      file_name: origName,
      file_size: file.size,
      file_type: file.type || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || '업로드 실패' }, { status: 500 });
  }
}
