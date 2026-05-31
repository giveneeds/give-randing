import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { isDummyMode } from '@/lib/supabase';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD = process.env.NODE_ENV !== 'production' && isDummyMode;

function safeFolder(value) {
  const folder = typeof value === 'string' ? value : 'uploads';
  return folder
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/') || 'uploads';
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error && !ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = safeFolder(formData.get('folder'));

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: '지원하지 않는 이미지 포맷입니다.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '이미지 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';

    if (!supabaseAdmin) {
      if (!ALLOW_LOCAL_DUMMY_ADMIN_UPLOAD) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }

      const localFile = `${Date.now()}-${randomUUID()}.${ext}`;
      const folderParts = folder.split('/').filter(Boolean);
      const localDir = path.join(process.cwd(), 'public', 'uploads', ...folderParts);
      await mkdir(localDir, { recursive: true });
      await writeFile(path.join(localDir, localFile), buffer);

      return NextResponse.json({ url: `/uploads/${[...folderParts, localFile].join('/')}` });
    }

    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('magazine-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from('magazine-images')
      .getPublicUrl(filename);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
