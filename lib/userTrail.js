// 사용자 행동 추적 — localStorage 전용 (디바이스 단위)
// 목적: 챗봇이 내부적으로만 참고할 "최근 관심사" 스냅샷 유지.
// 규칙: UI에 절대 노출 금지, 서버 프롬프트에만 전달.

import { isCurrentAdminOrPreviewPath } from '@/lib/adminPreviewPaths';

const KEY = 'gvnds.trail.v1';
const MAX_MAGAZINES = 5;
const MAX_SERVICES = 5;
const MAX_CTAS = 5;

function read() {
  if (typeof window === 'undefined') return emptyTrail();
  if (isCurrentAdminOrPreviewPath()) return emptyTrail();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyTrail();
    const parsed = JSON.parse(raw);
    return { ...emptyTrail(), ...parsed };
  } catch {
    return emptyTrail();
  }
}

function write(trail) {
  if (typeof window === 'undefined') return;
  if (isCurrentAdminOrPreviewPath()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    /* quota/private mode — 무시 */
  }
}

function emptyTrail() {
  return {
    recentMagazines: [],
    recentServices: [],
    recentCTAs: [],
    lastPath: null,
    updatedAt: null,
  };
}

function dedupePrepend(list, item, keyFn, max) {
  const filtered = list.filter((x) => keyFn(x) !== keyFn(item));
  return [item, ...filtered].slice(0, max);
}

export function getTrail() {
  return read();
}

export function appendMagazine({ slug, title, category } = {}) {
  if (!slug) return;
  const trail = read();
  trail.recentMagazines = dedupePrepend(
    trail.recentMagazines,
    { slug, title: title || '', category: category || '', ts: Date.now() },
    (m) => m.slug,
    MAX_MAGAZINES
  );
  trail.updatedAt = Date.now();
  write(trail);
}

export function appendService({ slug, title, category } = {}) {
  if (!slug) return;
  const trail = read();
  trail.recentServices = dedupePrepend(
    trail.recentServices,
    { slug, title: title || '', category: category || '', ts: Date.now() },
    (s) => s.slug,
    MAX_SERVICES
  );
  trail.updatedAt = Date.now();
  write(trail);
}

export function appendCTA({ label, page } = {}) {
  if (!label) return;
  const trail = read();
  trail.recentCTAs = dedupePrepend(
    trail.recentCTAs,
    { label, page: page || (typeof window !== 'undefined' ? window.location.pathname : ''), ts: Date.now() },
    (c) => `${c.label}@${c.page}`,
    MAX_CTAS
  );
  trail.updatedAt = Date.now();
  write(trail);
}

export function setLastPath(path) {
  if (!path) return;
  const trail = read();
  trail.lastPath = path;
  trail.updatedAt = Date.now();
  write(trail);
}

export function clearTrail() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
