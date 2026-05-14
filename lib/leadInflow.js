// 리드의 유입 정보(referrer URL 등)를 사람이 읽기 좋게 변환
// /admin/leads/* 페이지들이 공통으로 사용한다.

const KNOWN_HOSTS = {
  'search.naver.com': '네이버 검색',
  'm.search.naver.com': '네이버 모바일 검색',
  'naver.com': '네이버',
  'www.naver.com': '네이버',
  'blog.naver.com': '네이버 블로그',
  'blog.naverblogwidget.com': '네이버 블로그 위젯',
  'cafe.naver.com': '네이버 카페',
  'shopping.naver.com': '네이버 쇼핑',
  'google.com': '구글 검색',
  'www.google.com': '구글 검색',
  'google.co.kr': '구글 검색',
  'instagram.com': '인스타그램',
  'm.instagram.com': '인스타그램',
  'facebook.com': '페이스북',
  'm.facebook.com': '페이스북 모바일',
  'l.facebook.com': '페이스북 링크',
  'youtube.com': '유튜브',
  'm.youtube.com': '유튜브 모바일',
  't.co': '트위터 / X',
  'twitter.com': '트위터 / X',
  'x.com': '트위터 / X',
  'kakao.com': '카카오',
  'pf.kakao.com': '카카오 채널',
  'open.kakao.com': '카카오 오픈채팅',
  'daum.net': '다음',
  'search.daum.net': '다음 검색',
  'bing.com': '빙 검색',
  'duckduckgo.com': '덕덕고',
};

export function prettyReferrer(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const label = KNOWN_HOSTS[u.hostname] || KNOWN_HOSTS[host] || host;
    return { label, host, url };
  } catch {
    return { label: url, host: url, url };
  }
}
