import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 서버 런타임에서 service role 키 로드 여부만 확인 (값은 노출하지 않음)
export async function GET() {
  // SUPA 로 시작하는 모든 env 이름 나열 (값은 노출하지 않음)
  const supaKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes('SUPA') || k.toUpperCase().includes('SERVICE_ROLE'))
    .map((k) => ({ name: k, length: (process.env[k] || '').length }));

  return NextResponse.json({
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    service_role_key_length: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    all_supa_keys: supaKeys,
  });
}
