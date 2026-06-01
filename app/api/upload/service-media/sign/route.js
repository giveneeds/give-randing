import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { isDummyMode } from '@/lib/supabase';
import {
  createServiceVideoStoragePath,
  SERVICE_VIDEO_BUCKET,
  validateServiceVideoUploadInput,
} from '@/lib/serviceMediaUpload';

export const runtime = 'nodejs';

const ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD = process.env.NODE_ENV !== 'production' && isDummyMode;

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error && !ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const validated = validateServiceVideoUploadInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (!supabaseAdmin) {
    if (!ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD) {
      return NextResponse.json(
        { error: 'Storage 미설정: SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      localUpload: true,
      uploadUrl: '/api/upload',
      bucket: 'local',
      folder: validated.folder,
      pathPrefix: `${validated.folder}/videos`,
    });
  }

  const objectName = `${Date.now()}-${randomUUID()}.${validated.ext}`;
  const path = createServiceVideoStoragePath(validated, objectName);

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(SERVICE_VIDEO_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;

    const storagePath = data?.path || path;
    const { data: urlData } = supabaseAdmin.storage
      .from(SERVICE_VIDEO_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: storagePath,
      bucket: SERVICE_VIDEO_BUCKET,
      publicUrl: urlData.publicUrl,
      file_name: validated.fileName,
      file_type: validated.fileType,
      file_size: validated.fileSize,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || '영상 업로드 URL 발급에 실패했습니다.' },
      { status: 500 },
    );
  }
}
