'use client';

const STORAGE_KEY = 'giveneeds.auth.next';
const DEFAULT_REDIRECT = '/chat';

function normalizePath(path) {
  if (typeof path !== 'string') return DEFAULT_REDIRECT;
  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith('/')) return DEFAULT_REDIRECT;
  if (trimmed.startsWith('//')) return DEFAULT_REDIRECT;
  return trimmed;
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
