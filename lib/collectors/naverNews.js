// 네이버 검색 API — 뉴스 수집기.
// 일 25,000건 무료. 서버 사이드 전용.

const ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';

function stripHtmlEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')         // <b> 등 강조 태그 제거
    .replace(/\s+/g, ' ').trim();
}

function parsePubDate(rfc822) {
  if (!rfc822) return null;
  const d = new Date(rfc822);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// 네이버 뉴스 1건의 URL/originallink 에서 호스트명 추출.
function domainOf(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

/**
 * @param {string} keyword 검색어 (예: "B2B 마케팅")
 * @param {{display?:number, sort?:'sim'|'date'}} opts
 * @returns {Promise<Array<{post_url, post_id, posted_at, raw_data, normalized, source:'naver_news', source_account}>>}
 */
export async function collectNaverNews(keyword, opts = {}) {
  const display = Math.min(opts.display ?? 10, 100);
  const sort = opts.sort ?? 'date';

  const cid = process.env.NAVER_SEARCH_CLIENT_ID;
  const csec = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!cid || !csec) throw new Error('NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 미설정');

  const url = `${ENDPOINT}?query=${encodeURIComponent(keyword)}&display=${display}&sort=${sort}`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': cid,
      'X-Naver-Client-Secret': csec,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Naver API ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const items = json.items || [];

  return items.map((it) => {
    const cleanTitle = stripHtmlEntities(it.title);
    const cleanDesc = stripHtmlEntities(it.description);
    const link = it.link || it.originallink;
    const publisherDomain = domainOf(it.originallink || link);

    return {
      source: 'naver_news',
      source_account: publisherDomain,
      // 같은 originallink는 같은 기사 — post_id 기준
      post_id: `naver:${it.originallink || link}`.slice(0, 200),
      post_url: link,
      posted_at: parsePubDate(it.pubDate),
      raw_data: {
        source_url: link,
        originallink: it.originallink || null,
        domain: publisherDomain,
        fetched_at: new Date().toISOString(),
        keyword,
      },
      normalized: {
        title: cleanTitle,
        extracted_text: cleanDesc,
        headings: [],
        meta_description: cleanDesc,
        published_at: parsePubDate(it.pubDate),
      },
    };
  });
}
