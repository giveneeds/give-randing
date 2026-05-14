// 구글 뉴스 RSS — 무료, 무제한, API 키 불필요.
// 한국어 결과: ?hl=ko&gl=KR&ceid=KR:ko

const BASE = 'https://news.google.com/rss/search';

// 매우 가벼운 RSS 파서. rss-parser 의존성 없이 작은 정규식으로 처리.
// (Google News RSS 구조가 단순해서 가능)
function parseRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      if (!r) return null;
      return r[1]
        .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        .trim();
    };
    items.push({
      title: pick('title'),
      link: pick('link'),
      pubDate: pick('pubDate'),
      description: pick('description'),
      source: pick('source'),
      guid: pick('guid'),
    });
  }
  return items;
}

function stripHtml(s) {
  return s ? String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function parsePubDate(rfc822) {
  if (!rfc822) return null;
  const d = new Date(rfc822);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function domainOf(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

/**
 * @param {string} keyword
 * @param {{lang?:string, country?:string, max?:number}} opts
 */
export async function collectGoogleNewsRss(keyword, opts = {}) {
  const lang = opts.lang ?? 'ko';
  const country = opts.country ?? 'KR';
  const max = opts.max ?? 10;

  const url = `${BASE}?q=${encodeURIComponent(keyword)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GiveneedsBot/1.0)' },
  });
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  const xml = await res.text();
  const items = parseRss(xml).slice(0, max);

  return items.map((it) => {
    const cleanTitle = stripHtml(it.title);
    const cleanDesc = stripHtml(it.description);
    const link = it.link;
    const publisherDomain = it.source || domainOf(link);

    return {
      source: 'google_news',
      source_account: publisherDomain,
      post_id: `gnews:${it.guid || link}`.slice(0, 200),
      post_url: link,
      posted_at: parsePubDate(it.pubDate),
      raw_data: {
        source_url: link,
        domain: domainOf(link),
        publisher: it.source || null,
        fetched_at: new Date().toISOString(),
        keyword,
        lang,
        country,
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
