'use client';

import { usePathname } from 'next/navigation';
import GlobalFooter from './GlobalFooter';

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // 어드민 페이지 또는 관련 페이지에서는 푸터를 노출하지 않음
  if (pathname.startsWith('/admin')) {
    return null;
  }

  // API 라우트나 특수 페이지 필터링이 필요한 경우 추가 가능
  if (pathname.startsWith('/api')) {
    return null;
  }

  // 단독 랜딩 페이지 (자체 푸터 사용)
  if (pathname.startsWith('/428place')) {
    return null;
  }

  return <GlobalFooter />;
}
