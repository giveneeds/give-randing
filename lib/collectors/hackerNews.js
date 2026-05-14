// Hacker News Firebase API — 공식·무료·인증 불필요.
// 04번 저장소의 핵심 로직을 가져옴.
// 키워드 필터로 마케팅 관련 글만 추출.

const BASE = 'https://hacker-news.firebaseio.com/v0';

async function fetchTopStoryIds(limit = 100) {
  const res = await fetch(`${BASE}/topstories.json`);
  if (!res.ok) throw new Error(`HN topstories ${res.status}`);
  const ids = await res.json();
  return ids.slice(0, limit);
}

async function fetchStory(id) {
  const res = await fetch(`${BASE}/item/${id}.json`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * 키워드(콤마 구분 가능)로 HN top stories 중 title/url에 매치되는 글만 반환.
 *
 * @param {string} keywordList "marketing, growth, seo" 같은 콤마 구분 문자열
 * @param {{topN?:number, maxItems?:number, scoreMin?:number, windowHours?:number}} opts
 */
export async function collectHackerNews(keywordList, opts = {}) {
  const topN = opts.topN ?? 100;
  const maxItems = opts.maxItems ?? 15;
  const scoreMin = opts.scoreMin ?? 30;
  const windowHours = opts.windowHours ?? 48;

  const keywords = String(keywordList || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (keywords.length === 0) throw new Error('HN 키워드 누락');

  const cutoffMs = Date.now() - windowHours * 60 * 60 * 1000;

  const ids = await fetchTopStoryIds(topN);
  const stories = (await Promise.all(ids.map(fetchStory))).filter(Boolean);

  const matched = stories
    .filter((s) => s.type === 'story' && s.title)
    .filter((s) => (s.score ?? 0) >= scoreMin)
    .filter((s) => (s.time ?? 0) * 1000 >= cutoffMs)
    .filter((s) => {
      const hay = `${s.title || ''} ${s.url || ''}`.toLowerCase();
      return keywords.some((kw) => hay.includes(kw));
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxItems);

  return matched.map((s) => {
    const hnUrl = `https://news.ycombinator.com/item?id=${s.id}`;
    const finalUrl = s.url || hnUrl;
    return {
      source: 'hackernews',
      source_account: null,
      post_id: `hn:${s.id}`,
      post_url: finalUrl,
      posted_at: s.time ? new Date(s.time * 1000).toISOString() : null,
      raw_data: {
        source_url: finalUrl,
        hn_id: s.id,
        hn_url: hnUrl,
        score: s.score,
        by: s.by,
        descendants: s.descendants,
        fetched_at: new Date().toISOString(),
        keyword_list: keywordList,
      },
      normalized: {
        title: s.title,
        // HN 글 자체는 본문이 없거나 외부 URL — 본문 추출은 별도 (다른 세션의 Readability)
        // 현재는 title 만으로 요약 단서 제공
        extracted_text: '',
        headings: [s.title],
        meta_description: null,
        published_at: s.time ? new Date(s.time * 1000).toISOString() : null,
      },
    };
  });
}
