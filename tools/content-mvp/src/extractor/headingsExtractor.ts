import type { JSDOM } from 'jsdom';

// h1~h3 텍스트를 문서 등장 순서대로 추출.
// 너무 짧은 헤딩(<5자)은 노이즈 가능성이 커서 제외한다.
export function extractHeadings(dom: JSDOM): string[] {
  const nodeList = dom.window.document.querySelectorAll('h1, h2, h3');
  const result: string[] = [];
  nodeList.forEach((node) => {
    const text = (node.textContent ?? '').trim().replace(/\s+/g, ' ');
    if (text.length >= 5) {
      result.push(text);
    }
  });
  return result;
}
