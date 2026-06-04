import { NextResponse } from 'next/server';

// 원문 기사 추출도 외부 페이지 fetch라 느린 사이트에선 기본 타임아웃을 넘길 수 있다. webhook 패턴과 동일하게 한도 상향.
export const runtime = 'nodejs';
export const maxDuration = 300;

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function matchFirst(html, re) {
  const match = String(html || '').match(re);
  return match?.[1] ? stripTags(match[1]) : '';
}

function normalizeForMatch(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractReadableBlocks(html) {
  return [...String(html || '').matchAll(/<(p|li|blockquote|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripTags(match[2]))
    .filter((text) => text.length >= 25)
    .filter((text) => !isBoilerplateBlock(text));
}

function isBoilerplateBlock(text) {
  return [
    /^Skip to main content/i,
    /^An official website/i,
    /^Here'?s how you know/i,
    /^The \.gov means/i,
    /^The site is secure/i,
    /^Menu Main Menu/i,
    /^Search or browse/i,
    /^Looking for legal documents/i,
    /^Search the Legal Library/i,
    /^Find legal resources/i,
    /^Breadcrumb/i,
    /^Share This Page/i,
    /^Return to top/i,
  ].some((pattern) => pattern.test(String(text || '').trim()));
}

function findReleaseStartIndex(blocks) {
  const releasePatterns = [
    /^The Federal Trade Commission has\b/i,
    /^The Federal Trade Commission (today|announced|filed|sued|charged|ordered|approved)\b/i,
    /^The FTC (today|announced|filed|sued|charged|ordered|approved)\b/i,
    /^Federal Trade Commission (today|announced|filed|sued|charged|ordered|approved)\b/i,
    /^Today,? the\b/i,
    /^On [A-Z][a-z]+ \d{1,2}/i,
    /has (sued|filed|announced|charged|taken action|sent|reached|ordered|approved)/i,
    /today (sued|filed|announced|charged|took action)/i,
  ];
  const index = blocks.findIndex((block) => releasePatterns.some((pattern) => pattern.test(block)));
  return index >= 0 ? index : -1;
}

function cutFromTitle(blocks, title) {
  if (!blocks.length) return '';
  const titleHead = String(title || '').split('|')[0].trim();
  const normalizedTitle = normalizeForMatch(titleHead).slice(0, 80);
  const releaseStartIndex = findReleaseStartIndex(blocks);
  const titleStartIndex = blocks.findIndex((block) => {
    const normalizedBlock = normalizeForMatch(block);
    return (
      normalizedTitle && (
        normalizedBlock.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedBlock.slice(0, 80))
      )
    ) || /^For Release$/i.test(block);
  });
  const startIndex = releaseStartIndex >= 0 ? releaseStartIndex : titleStartIndex;

  const slice = startIndex >= 0 ? blocks.slice(startIndex) : blocks;
  const stopIndex = slice.findIndex((block, index) => (
    index > 2 && /^(Contact Information|Related Cases|Topics|Return to top|Footer|Follow us|Media Contact|Staff Contact)/i.test(block)
  ));
  return (stopIndex >= 0 ? slice.slice(0, stopIndex) : slice).join('\n').slice(0, 18000);
}

function extractArticleText(html, title = '') {
  const body = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const articleMatches = [...body.matchAll(/<article[\s\S]*?<\/article>/gi)].map((match) => match[0]);
  const mainMatches = [...body.matchAll(/<main[\s\S]*?<\/main>/gi)].map((match) => match[0]);
  const candidates = [...mainMatches, ...articleMatches, body]
    .map((candidate) => extractReadableBlocks(candidate))
    .filter((blocks) => blocks.length);

  const bestBlocks = candidates
    .sort((a, b) => b.join('\n').length - a.join('\n').length)[0] || [];
  const fromTitle = cutFromTitle(bestBlocks, title);

  return fromTitle || bestBlocks.join('\n').slice(0, 18000);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const articleUrl = String(body.articleUrl || '').trim();
    let url = null;
    try {
      url = new URL(articleUrl);
    } catch {
      return NextResponse.json({ error: '유효한 기사 URL이 필요합니다.' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'http 또는 https URL만 읽을 수 있습니다.' }, { status: 400 });
    }

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `원문을 읽지 못했습니다. HTTP ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
      || matchFirst(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const description = matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
      || matchFirst(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const articleText = extractArticleText(html, title);

    if (!articleText) {
      return NextResponse.json({ error: '원문 본문 텍스트를 추출하지 못했습니다.' }, { status: 422 });
    }

    return NextResponse.json({
      sourceArticle: {
        url: url.toString(),
        source_domain: url.hostname.replace(/^www\./, ''),
        title,
        description,
        article_text: articleText,
        preview: articleText.slice(0, 1200),
        char_count: articleText.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '기사 원문 읽기 실패' }, { status: 500 });
  }
}
