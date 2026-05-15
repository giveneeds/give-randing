// 동적 렌더링·로그인 게이트·강한 봇 차단이 걸려 있어 MVP 정책상 우회하지 않는 도메인.
// 시드에 포함되면 경고만 띄우고 skip 한다.
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /(^|\.)naver\.com$/i, // 네이버 블로그/카페/포스트 — JS 동적 로딩 + 차단
  /(^|\.)blog\.naver\.com$/i,
  /(^|\.)cafe\.naver\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)threads\.net$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)linkedin\.com$/i,
  /(^|\.)youtube\.com$/i,
];

export interface UrlFilterResult {
  blocked: boolean;
  reason?: string;
  host: string;
}

// URL이 차단 도메인에 속하는지, 그리고 호스트 정보를 반환.
// URL 파싱 실패도 차단 처리 (잘못된 시드 방어).
export function checkUrl(rawUrl: string): UrlFilterResult {
  let host: string;
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    return { blocked: true, reason: 'URL 파싱 실패', host: '' };
  }

  const matched = BLOCKED_HOST_PATTERNS.find((pattern) => pattern.test(host));
  if (matched) {
    return { blocked: true, reason: `차단 도메인 (${host})`, host };
  }

  return { blocked: false, host };
}
