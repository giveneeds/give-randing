import type { JSDOM } from 'jsdom';

// meta_description: <meta name="description"> 우선, 없으면 og:description.
export function extractMetaDescription(dom: JSDOM): string | null {
  const doc = dom.window.document;
  const candidates = [
    doc.querySelector('meta[name="description"]'),
    doc.querySelector('meta[property="og:description"]'),
  ];
  for (const node of candidates) {
    const content = node?.getAttribute('content')?.trim();
    if (content && content.length > 0) {
      return content;
    }
  }
  return null;
}

// published_at: JSON-LD → og/article meta → <time datetime> 순서로 시도.
// 본문 정규식("2025년 3월")은 노이즈가 커서 MVP에서 의도적으로 제외.
export function extractPublishedAt(dom: JSDOM): string | null {
  const doc = dom.window.document;

  // 1. JSON-LD
  const ldNodes = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const node of ldNodes) {
    const text = node.textContent;
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const found = findDatePublishedInLd(parsed);
      if (found) return found;
    } catch {
      // 잘못된 JSON-LD는 무시.
    }
  }

  // 2. og/article 메타 태그
  const metaCandidates = [
    doc.querySelector('meta[property="article:published_time"]'),
    doc.querySelector('meta[property="og:updated_time"]'),
    doc.querySelector('meta[itemprop="datePublished"]'),
  ];
  for (const node of metaCandidates) {
    const content = node?.getAttribute('content')?.trim();
    if (content) return content;
  }

  // 3. <time datetime="...">
  const time = doc.querySelector('time[datetime]');
  const dt = time?.getAttribute('datetime')?.trim();
  if (dt) return dt;

  return null;
}

// JSON-LD 구조는 객체이거나 @graph 배열일 수 있어 재귀 탐색이 필요.
function findDatePublishedInLd(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findDatePublishedInLd(item);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const dp = obj.datePublished;
  if (typeof dp === 'string' && dp.length > 0) return dp;

  // @graph 안에 Article이 들어가는 패턴이 흔함.
  const graph = obj['@graph'];
  if (graph) {
    const found = findDatePublishedInLd(graph);
    if (found) return found;
  }
  return null;
}
