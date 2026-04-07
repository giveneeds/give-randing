import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 서버 런타임에서 service role 키 로드 여부만 확인 (값은 노출하지 않음)
export async function GET() {
  return NextResponse.json({
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    service_role_key_length: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    node_env: process.env.NODE_ENV,
  });
}
