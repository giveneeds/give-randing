'use client';

const STORAGE_KEY = 'giveneeds.auth.next';
const DEFAULT_REDIRECT = '/';
const AUTH_PATH_PREFIXES = ['/login', '/signup', '/auth/'];

function isAuthPath(path) {
  if (typeof path !== 'string') return false;
  return AUTH_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

function normalizePath(path) {
  if (typeof path !== 'string') return DEFAULT_REDIRECT;
  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith('/')) return DEFAULT_REDIRECT;
  if (trimmed.startsWith('//')) return DEFAULT_REDIRECT;
  return trimmed;
}

// 현재 페이지(pathname + search) 를 추론. 로그인/콜백 페이지에서는 호출자가 무한 루프에 빠지지 않게 '/' 로.
export function inferCurrentPath() {
  if (typeof window === 'undefined') return DEFAULT_REDIRECT;
  const path = `${window.location.pathname}${window.location.search || ''}`;
  return isAuthPath(path) ? DEFAULT_REDIRECT : path;
}

// 직전 페이지(referrer) 가 같은 오리진이면 그 경로를 반환. 그렇지 않거나 인증 페이지면 null.
export function inferReferrerPath() {
  if (typeof window === 'undefined') return null;
  try {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    if (url.origin !== window.location.origin) return null;
    const path = `${url.pathname}${url.search || ''}`;
    if (isAuthPath(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function getSafeAuthRedirect(path, fallback = DEFAULT_REDIRECT) {
  const normalizedFallback = normalizePath(fallback);
  if (typeof path !== 'string') return normalizedFallback;
  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return normalizedFallback;
  }
  return trimmed;
}

export function saveAuthRedirect(path) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, getSafeAuthRedirect(path));
  } catch {}
}

export function readAuthRedirect(fallback = DEFAULT_REDIRECT) {
  if (typeof window === 'undefined') return getSafeAuthRedirect(fallback);
  try {
    return getSafeAuthRedirect(window.localStorage.getItem(STORAGE_KEY), fallback);
  } catch {
    return getSafeAuthRedirect(fallback);
  }
}

export function clearAuthRedirect() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
