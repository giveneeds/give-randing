export const ADMIN_SERVICE_PREVIEW_PATH = '/admin-service-preview';

export function isAdminOrPreviewPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  return pathname.startsWith('/admin') || pathname.startsWith(ADMIN_SERVICE_PREVIEW_PATH);
}

export function isCurrentAdminOrPreviewPath() {
  if (typeof window === 'undefined') return false;
  return isAdminOrPreviewPath(window.location.pathname);
}
