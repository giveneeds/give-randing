'use client';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function ClientLogosSection({ title, subtitle, content }) {
  const items = (content?.items || []).filter(item => item.image_url);

  // 아이템을 3줄로 분배
  const rowSize = Math.max(Math.ceil(items.length / 3), 1);
  const row1 = items.slice(0, rowSize);
  const row2 = items.slice(rowSize, rowSize * 2);
  const row3 = items.slice(rowSize * 2);

  // 마퀴가 끊김 없이 루프되도록 최소 8개 이상 채워서 2배 복사
  function fill(arr, min = 8) {
    if (!arr.length) return [];
    const times = Math.ceil(min / arr.length);
    const filled = Array.from({ length: times }, () => arr).flat();
    return [...filled, ...filled]; // 2배 복사 → translateX(-50%)로 루프
  }

  const displayTitle = title || 'Our Client or Partners';
  const displaySubtitle = subtitle || '기브니즈와 함께 고민을 해결해보세요.';

  const hasItems = items.length > 0;

  const rows = [
    { items: fill(row1), dir: 'left' },
    { items: fill(row2.length ? row2 : row1), dir: 'right' },
    { items: fill(row3.length ? row3 : row1), dir: 'left' },
  ];

  return (
    <section className="py-24 md:py-32 bg-zinc-950 overflow-hidden">
      {/* 헤더 */}
      <div className="text-center mb-16 px-4">
        <div className="inline-flex flex-col items-center mb-6">
          {[
            { text: 'Our',      bold: false },
            { text: 'Client',   bold: true  },
            { text: 'or',       bold: false },
            { text: 'Partners', bold: true  },
          ].map((line, i) => (
            <span
              key={i}
              className={`block leading-[1.0] ${
                line.bold
                  ? 'font-black italic text-white text-[clamp(2.8rem,8vw,6.5rem)] tracking-[-0.02em]'
                  : 'font-light text-zinc-500 text-[clamp(1.6rem,5vw,4rem)] tracking-[0.05em]'
              }`}
            >
              {line.text}
            </span>
          ))}
        </div>
        <p className="text-sm md:text-base text-zinc-500 font-medium">
          {displaySubtitle}
        </p>
      </div>

      {/* 로고 마퀴 3열 */}
      {hasItems ? (
        <div className="space-y-4">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="overflow-hidden">
              <div className={row.dir === 'left' ? 'marquee-track-left' : 'marquee-track-right'}>
                {row.items.map((item, i) => (
                  <LogoCard key={i} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-700 text-sm font-medium">
          어드민에서 클라이언트 로고를 추가해주세요.
        </div>
      )}
    </section>
  );
}

function LogoCard({ item }) {
  const logoHeight = item.logo_height || 40;
  const cardHeight = logoHeight + 40; // 상하 패딩 20씩

  return (
    <div
      className="shrink-0 bg-white rounded-2xl flex items-center justify-center mx-2 border border-zinc-100 shadow-sm"
      style={{
        width: `${Math.max(logoHeight * 3.5, 160)}px`,
        height: `${cardHeight}px`,
        padding: '0 24px',
      }}
    >
      <OptimizedImage
        src={item.image_url}
        alt={item.name || '클라이언트 로고'}
        fill={false}
        width={Math.max(logoHeight * 3, 120)}
        height={logoHeight}
        style={{
          height: `${logoHeight}px`,
          width: 'auto',
          maxWidth: `${Math.max(logoHeight * 3, 120)}px`,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
