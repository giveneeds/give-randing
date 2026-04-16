import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize: 380,
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
