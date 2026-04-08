import BrandLoader from '@/components/ui/BrandLoader';

/**
 * Next.js App Router 전역 라우트 전환 로딩 화면.
 * 페이지가 Suspense 경계에서 대기할 때 자동으로 표시됩니다.
 */
export default function Loading() {
  return <BrandLoader fullscreen size={84} />;
}
