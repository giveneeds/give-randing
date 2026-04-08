import { createClient } from '@supabase/supabase-js';

/**
 * 서버 라우트 전용 — 요청에 담긴 Bearer 토큰으로 Supabase 클라이언트를 만들어
 * 사용자의 RLS 정책을 그대로 적용받도록 한다.
 * 반환: { supabase, user, token }
 * 인증 실패 시 user=null.
 */
export async function createSupabaseFromRequest(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { supabase: null, user: null, token: null };

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return { supabase: createClient(url, key), user: null, token: null };
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data } = await supabase.auth.getUser();
    return { supabase, user: data?.user || null, token };
  } catch {
    return { supabase, user: null, token };
  }
}
