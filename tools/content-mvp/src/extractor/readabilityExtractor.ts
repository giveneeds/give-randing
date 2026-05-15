import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { RawDocument, ExtractedDoc } from '../types/index.js';
import { extractHeadings } from './headingsExtractor.js';
import { extractMetaDescription, extractPublishedAt } from './metadataExtractor.js';

// Readability + jsdom으로 본문 정제, headings/meta는 원본 DOM에서 별도 추출.
// (Readability는 본문에 집중하므로 헤딩 순서·meta는 별도 경로가 필요)
export function extractDocument(raw: RawDocument): ExtractedDoc {
  // url 옵션이 없으면 Readability가 상대 링크를 잘 못 풀 수 있어 source_url을 함께 넘긴다.
  const dom = new JSDOM(raw.raw_html, { url: raw.source_url });

  // headings/meta는 원본 DOM에서 먼저 추출 (Readability가 DOM을 변형하기 전에).
  const headings = extractHeadings(dom);
  const meta_description = extractMetaDescription(dom);
  const published_at = extractPublishedAt(dom);

  // Readability는 dom.window.document를 수정하기 때문에 두 번째 DOM을 만들거나
  // headings/meta 추출 이후에 호출해야 안전.
  const readabilityDom = new JSDOM(raw.raw_html, { url: raw.source_url });
  const reader = new Readability(readabilityDom.window.document);
  const article = reader.parse();

  const title = (article?.title ?? readabilityDom.window.document.title ?? '').trim();
  const extracted_text = (article?.textContent ?? '').replace(/\s+/g, ' ').trim();

  return {
    ...raw,
    title,
    extracted_text,
    headings,
    meta_description,
    published_at,
  };
}
