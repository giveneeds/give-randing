// ─────────────────────────────────────────────────────────────
// 어드민 권한 분리 SSOT
// admin = 콘텐츠 운영 (매거진/사례/리드/퍼널 등)
// superadmin = 시스템 구조 변경 (sections/campaigns/설정/권한)
// ─────────────────────────────────────────────────────────────

// superadmin 만 접근 가능한 경로 (prefix 매치)
export const SUPERADMIN_ONLY_PATHS = [
  '/admin/sections',
  '/admin/service',      // 단수 — 서비스 페이지 수정 (solutions 페이지는 /admin/services 복수)
  '/admin/campaigns',
  '/admin/settings',     // 시스템 설정 + 관리자 계정 (settings/admins 포함)
];

export function isSuperadminOnlyPath(pathname) {
  if (!pathname) return false;
  return SUPERADMIN_ONLY_PATHS.some(p => {
    // 정확히 일치하거나 하위 경로인 경우
    // '/admin/service'는 '/admin/services'(복수)와 충돌하지 않도록 끝 경계 체크
    if (pathname === p) return true;
    return pathname.startsWith(p + '/');
  });
}

export function canAccessPath(pathname, role) {
  if (role === 'superadmin') return true;
  if (role !== 'admin') return false;
  return !isSuperadminOnlyPath(pathname);
}

export function isSuperadmin(role) {
  return role === 'superadmin';
}
