'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function KakaoTokenContent() {
  const params = useSearchParams();
  const code = params.get('code');
  const error = params.get('error');

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>오류: {error}</div>
      )}
      {code ? (
        <>
          <p style={{ marginBottom: 8, fontWeight: 'bold' }}>code 값 (아래 전체 복사):</p>
          <textarea
            readOnly
            value={code}
            onClick={e => e.target.select()}
            style={{ width: '100%', padding: 12, fontSize: 13, minHeight: 80, wordBreak: 'break-all' }}
          />
        </>
      ) : (
        <p>code 파라미터가 없습니다.</p>
      )}
    </div>
  );
}

export default function KakaoTokenPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>로딩 중...</div>}>
      <KakaoTokenContent />
    </Suspense>
  );
}
