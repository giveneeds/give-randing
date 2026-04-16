import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: 134,
          fontWeight: 900,
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
