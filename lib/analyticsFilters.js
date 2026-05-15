import { supabaseAdmin } from '@/lib/supabaseAdmin';

// 어드민(admin/superadmin)이 한 번이라도 로그인했던 anonymous_id 누적 집합.
// 같은 디바이스/브라우저에서 비로그인 상태로 들렀던 이력도 후행 제외하기 위함.
// 어드민이 새 디바이스에서 로그인하면 그 anon_id가 즉시 누적되므로,
// 다음 분석 조회부터 그 디바이스 활동은 일관되게 빠짐.

let cache = null;
let cachedAt = 0;
const TTL_MS = 60 * 1000; // 1분 — 새 어드민 디바이스 반영 지연 허용 가능 수준

export async function getAdminAnonIds() {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  if (!supabaseAdmin) return new Set();

  const { data: profs } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'superadmin']);

  const adminUserIds = (profs || []).map((p) => p.id);
  if (adminUserIds.length === 0) {
    cache = new Set();
    cachedAt = Date.now();
    return cache;
  }

  const { data: sessions } = await supabaseAdmin
    .from('lead_sessions')
    .select('anonymous_id')
    .in('user_id', adminUserIds);

  const set = new Set();
  for (const s of sessions || []) {
    if (s.anonymous_id) set.add(s.anonymous_id);
  }
  cache = set;
  cachedAt = Date.now();
  return cache;
}
