'use client';

/**
 * BrandLoader — "G" 로고를 마스크로 사용한 진행 채움형 로더(masked logo progress loader).
 *
 * 동작 방식:
 *  - 회색 베이스의 G 로고가 보이고, 같은 G 모양 마스크 안에서 파란색 레이어가
 *    아래 → 위로 반복적으로 차오릅니다 (indeterminate).
 *  - SVG <mask>와 CSS keyframes만으로 동작 → JS 의존 X, 가볍습니다.
 *
 * Props:
 *  - size: 로고 픽셀 크기 (기본 72)
 *  - fullscreen: true면 화면 전체에 중앙 정렬 + 배경 처리
 *  - label: 로고 아래 문구 (기본 "LOADING")
 *  - className: 외부에서 override
 */
export default function BrandLoader({
  size = 72,
  fullscreen = false,
  label = 'LOADING',
  className = '',
}) {
  const inner = (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="로딩 중"
    >
      <div
        style={{ width: size, height: size }}
        className="relative"
      >
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* G 모양을 마스크로 — 흰색 영역만 보임 */}
            <mask id="brand-loader-g-mask">
              <rect width="100" height="100" fill="black" />
              <text
                x="50"
                y="50"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="Inter, system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="86"
                fill="white"
              >
                G
              </text>
            </mask>
          </defs>

          {/* 회색 베이스 */}
          <rect width="100" height="100" fill="#e5e7eb" mask="url(#brand-loader-g-mask)" />
          {/* 파란색이 아래→위로 차오르는 레이어 */}
          <g mask="url(#brand-loader-g-mask)">
            <rect
              x="0"
              width="100"
              height="100"
              fill="#2563eb"
              className="brand-loader-fill"
            />
          </g>
        </svg>
      </div>

      {label && (
        <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
          {label}
        </span>
      )}

      <style jsx>{`
        :global(.brand-loader-fill) {
          transform: translateY(100%);
          transform-origin: center bottom;
          animation: brand-loader-rise 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes brand-loader-rise {
          0% {
            transform: translateY(100%);
          }
          60% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(-100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.brand-loader-fill) {
            animation-duration: 3s;
          }
        }
      `}</style>
    </div>
  );

  if (!fullscreen) return inner;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
      {inner}
    </div>
  );
}
