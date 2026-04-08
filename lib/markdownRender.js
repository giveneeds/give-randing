'use client';
/**
 * 서비스 상세/에디터 공용 마크다운 렌더러
 * - **bold** / *italic* / 줄 시작 `> 인용` / `- 불릿` / `1. 번호` / `**제목**`(헤딩)
 * - 줄바꿈은 빈 줄 기준으로 문단 분리
 */

function renderInline(text, keyPrefix = '') {
  if (typeof text !== 'string') return text;
  // 1) **bold**
  // 2) *italic* (단, **는 위에서 처리)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={k} className="font-extrabold text-zinc-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={k} className="italic text-zinc-700 dark:text-zinc-300">{part.slice(1, -1)}</em>;
    }
    return part.replace(/[`~]/g, '');
  });
}

function normalize(text) {
  if (typeof text !== 'string') return '';
  let t = text.replace(/\r\n/g, '\n');
  // 단독 대시 라인(---, --, -)은 구분선으로 쓰이므로 아래 불릿 정규화에 휘말리지 않게 임시 보호
  t = t.replace(/^[ \t]*(-{1,})[ \t]*$/gm, '\u0000HR$1\u0000');
  // 인라인으로 붙어있는 마커들을 줄 시작으로 분리 (DB 데이터가 한 줄로 들어온 경우 대비)
  t = t.replace(/\s+>\s+/g, '\n\n> ');
  t = t.replace(/\s+-\s+(?=\S)/g, '\n- ');
  // 구분선 복원 — 앞뒤로 빈 줄을 강제해 반드시 독립 블록이 되도록
  t = t.replace(/\s*\u0000HR(-{1,})\u0000\s*/g, '\n\n$1\n\n');
  // **소제목** 이 문장 중간이면 앞뒤 빈 줄
  t = t.replace(/\s+(\*\*[^*\n]+\*\*)\s+/g, '\n\n$1\n\n');
  // 다중 공백 정리
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/**
 * MarkdownContent — 줄글 → 구조화된 JSX
 *
 * @param {string} text
 * @param {string} variant - 'default' (zinc-600) | 'dark' (white on dark bg) | 'compact' (작은 폰트 + 빡빡한 spacing)
 */
export default function MarkdownContent({ text, variant = 'default' }) {
  if (!text) return null;

  const isDark = variant === 'dark';
  const isCompact = variant === 'compact';

  const bodyCls = isDark
    ? 'text-zinc-200'
    : 'text-zinc-600 dark:text-zinc-300';
  const headingCls = isDark
    ? 'text-white'
    : 'text-zinc-900 dark:text-white';
  const quoteBg = isDark
    ? 'border-white/40 bg-white/5 text-zinc-100'
    : 'border-zinc-900 bg-zinc-50 text-zinc-800 dark:border-white dark:bg-white/5 dark:text-zinc-200';

  const normalized = normalize(text);
  // 빈 줄 기준 블록 분리 → 블록 안에서 다시 줄 단위 처리
  const blocks = normalized.split(/\n{2,}/);

  return (
    <div className={`${isCompact ? 'text-xs' : 'text-sm md:text-[15px]'} ${bodyCls} font-medium leading-relaxed space-y-${isCompact ? '3' : '4'}`}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        // 블록 전체가 구분선 — 한 줄이 `-`, `--`, `---` 등 대시만으로 구성
        if (lines.length === 1 && /^-{1,}$/.test(lines[0])) {
          return (
            <hr
              key={bi}
              className={`my-6 border-0 h-px ${isDark ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}
            />
          );
        }

        // 블록 전체가 이미지 한 줄: ![alt](url)
        if (lines.length === 1) {
          const img = lines[0].match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
          if (img) {
            return (
              <figure key={bi} className="my-2">
                <img
                  src={img[2]}
                  alt={img[1] || ''}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
                  loading="lazy"
                />
                {img[1] && (
                  <figcaption className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 text-center font-medium">
                    {img[1]}
                  </figcaption>
                )}
              </figure>
            );
          }
        }

        // 블록 전체가 헤딩 (**제목**) 한 줄
        if (lines.length === 1) {
          const m = lines[0].match(/^\*\*([^*]+)\*\*$/);
          if (m) {
            return (
              <h4
                key={bi}
                className={`font-black ${headingCls} ${isCompact ? 'text-[13px]' : 'text-base md:text-lg'} tracking-tight leading-snug pt-2`}
              >
                {m[1]}
              </h4>
            );
          }
        }

        // 블록 전체가 인용 (>로 시작하는 줄들)
        if (lines.every(l => l.startsWith('> '))) {
          return (
            <blockquote
              key={bi}
              className={`border-l-4 ${quoteBg} pl-4 pr-4 py-3 rounded-r-lg space-y-1 font-bold leading-relaxed`}
            >
              {lines.map((l, li) => (
                <div key={li}>{renderInline(l.substring(2), `${bi}-${li}`)}</div>
              ))}
            </blockquote>
          );
        }

        // 블록 전체가 불릿 또는 번호 리스트
        const isBullet = lines.every(l => /^[-•]\s+/.test(l));
        const isNumbered = lines.every(l => /^\d+[.)]\s+/.test(l));
        if (isBullet || isNumbered) {
          const ListTag = isNumbered ? 'ol' : 'ul';
          return (
            <ListTag key={bi} className={`${isNumbered ? 'list-decimal' : ''} pl-1 space-y-2`}>
              {lines.map((l, li) => {
                const content = l.replace(/^[-•]\s+/, '').replace(/^\d+[.)]\s+/, '');
                return (
                  <li key={li} className="flex gap-3 leading-relaxed">
                    {!isNumbered && <span className="text-zinc-300 dark:text-zinc-600 mt-1.5 leading-none flex-shrink-0">●</span>}
                    {isNumbered && <span className="font-black text-zinc-900 dark:text-white tabular-nums flex-shrink-0">{li + 1}.</span>}
                    <span className="flex-1">{renderInline(content, `${bi}-${li}`)}</span>
                  </li>
                );
              })}
            </ListTag>
          );
        }

        // 그 외 — 일반 문단(블록 내 줄바꿈은 <br/>로)
        return (
          <p key={bi} className="leading-relaxed break-keep">
            {lines.map((l, li) => {
              // 단독 대시 라인이 블록 내부에 남아있는 경우 hr로 폴백
              if (/^-{1,}$/.test(l)) {
                return (
                  <span
                    key={li}
                    className={`block my-4 h-px ${isDark ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                    aria-hidden="true"
                  />
                );
              }
              // 줄 안에서 헤딩/인용/불릿이 섞인 경우(드물지만) 분기
              const headMatch = l.match(/^\*\*([^*]+)\*\*$/);
              if (headMatch) {
                return (
                  <strong key={li} className={`block font-black ${headingCls} ${isCompact ? 'text-[13px]' : 'text-base'} tracking-tight mt-1 mb-1`}>
                    {headMatch[1]}
                  </strong>
                );
              }
              if (l.startsWith('> ')) {
                return (
                  <span key={li} className={`block border-l-4 ${quoteBg} pl-3 pr-3 py-2 my-1 rounded-r font-bold`}>
                    {renderInline(l.substring(2), `${bi}-${li}`)}
                  </span>
                );
              }
              if (/^[-•]\s+/.test(l)) {
                return (
                  <span key={li} className="block pl-4 relative my-0.5">
                    <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-zinc-400" />
                    {renderInline(l.replace(/^[-•]\s+/, ''), `${bi}-${li}`)}
                  </span>
                );
              }
              return (
                <span key={li}>
                  {renderInline(l, `${bi}-${li}`)}
                  {li < lines.length - 1 && <br />}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
