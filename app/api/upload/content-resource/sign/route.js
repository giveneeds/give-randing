import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

/**
 * POST /api/upload/content-resource/sign
 *
 * 클라이언트가 Supabase Storage 로 파일을 직접 업로드할 수 있도록 1회용 signed
 * upload URL 을 발급한다.
 *
 * 왜 이 경로가 필요한가:
 *   Vercel Serverless Function 은 요청 본문을 4.5MB 로 강제 제한한다.
 *   파일을 백엔드 경유(/api/upload/content-resource)로 보내면 4.5MB 이상 파일이
 *   업로드 직전 Vercel reverse proxy 단에서 평문 "Request Entity Too Large" 로
 *   거부된다 (이게 클라이언트에서 "Unexpected token 'R'" JSON 파싱 에러로 보임).
 *
 *   이 라우트는 파일 본문을 받지 않고 signed URL 만 발급하므로 Vercel 한도와
 *   무관하다. 클라이언트는 받은 URL 로 Supabase Storage 도메인에 직접 PUT 하여
 *   Vercel 을 완전히 우회한다.
 *
 * 요청 body (JSON):
 *   - parent_type: 'magazine' | 'campaign'
 *   - parent_id:   UUID
 *   - file_name:   원본 파일명 (확장자 추출용)
 *
 * 응답:
 *   - signedUrl:   클라이언트가 PUT 할 대상 URL
 *   - token:       Supabase 가 URL 검증에 사용하는 토큰 (URL 에 포함되어 있으나 별도 노출)
 *   - path:        Storage 내부 경로 (메타데이터 저장 시 사용)
 *   - file_name:   원본 파일명
 *   - bucket:      버킷명 (참고용)
 */

export const runtime = 'nodejs';

const ALLOWED_EXT = ['pdf','doc','docx','xls','xlsx','ppt','pptx','hwp','hwpx','zip','txt','csv'];
const ALLOWED_PARENT = new Set(['magazine', 'campaign']);
const BUCKET = 'content-resources';

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Storage 미설정: SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.' },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const parentType = String(body.parent_type || '');
  const parentId = String(body.parent_id || '');
  const fileName = String(body.file_name || 'file');

  if (!ALLOWED_PARENT.has(parentType) || !parentId) {
    return NextResponse.json(
      { error: 'parent_type / parent_id 가 유효하지 않습니다.' },
      { status: 400 },
    );
  }

  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!ext || !ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: `지원하지 않는 파일 형식입니다. (.${ext || '없음'}) 허용: ${ALLOWED_EXT.join(', ')}` },
      { status: 400 },
    );
  }

  const safeExt = ext.slice(0, 5);
  const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
  const folder = parentType === 'magazine' ? 'magazines' : 'campaigns';
  const path = `${folder}/${parentId}/${objectName}`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path || path,
      file_name: fileName,
      bucket: BUCKET,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'signed URL 발급 실패' },
      { status: 500 },
    );
  }
}
