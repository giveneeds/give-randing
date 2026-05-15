// 봇/링크 프리뷰 + 어드민 마커 쿠키를 트래커·이벤트 API에서 공통으로 차단하기 위한 헬퍼.
// 클라이언트(Tracker)와 서버(events 라우트) 둘 다 import.

const BOT_UA_RE = /bot|crawler|spider|crawl|kakao|slack|discord|twitter|facebook|google|bing|baidu|yandex|duckduck|preview|unfurl|whatsapp|telegram|linkedin|embed|prerender|headless|phantom|puppeteer|playwright|lighthouse|chrome-lighthouse/i;

export const ADMIN_TAG_COOKIE = 'gvnds.admin_tag';

export function isBotUserAgent(ua) {
  if (!ua) return false;
  return BOT_UA_RE.test(ua);
}

// 클라이언트 전용 — document.cookie 에서 admin 마커 확인.
export function hasAdminTagCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${ADMIN_TAG_COOKIE}=1`);
}
