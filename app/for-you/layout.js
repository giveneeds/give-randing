// 서버 layout — /for-you 의 페이지별 고유 metadata(title·canonical) 주입.
// 본문 페이지는 client 컴포넌트라 metadata 를 export 할 수 없어 여기서 담당한다.

export const metadata = {
  title: '광고 대행사 기브니즈 클라이언트 사례·포트폴리오',
  description:
    '데이터 기반 종합 광고 대행사 기브니즈가 진행한 바이럴·검색·퍼포먼스 마케팅 클라이언트 사례와 포트폴리오를 확인하세요.',
  alternates: { canonical: '/for-you' },
  openGraph: {
    title: '광고 대행사 기브니즈 클라이언트 사례',
    description: '기브니즈가 진행한 바이럴·검색·퍼포먼스 마케팅 사례 모음.',
    url: '/for-you',
  },
};

export default function ForYouLayout({ children }) {
  return children;
}
