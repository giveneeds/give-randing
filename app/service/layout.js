// 서버 layout — /service 의 페이지별 고유 metadata(title·canonical) 주입.
// /service 페이지 본체는 client 컴포넌트라 metadata 를 export 할 수 없어, 여기서 담당한다.
// (/service/[slug] 는 자체 layout 에서 generateMetadata 로 override)

export const metadata = {
  title: '광고 대행사 기브니즈가 하는 일 — 바이럴·플레이스·퍼포먼스',
  description:
    '데이터 기반 종합 광고 대행사 기브니즈의 서비스. 바이럴 마케팅, 네이버 플레이스·리뷰 관리, 퍼포먼스 광고, 웹·AI 자동화까지 비즈니스에 맞는 마케팅 대행을 제공합니다.',
  alternates: { canonical: '/service' },
  openGraph: {
    title: '광고 대행사 기브니즈가 하는 일',
    description:
      '바이럴·네이버 플레이스·퍼포먼스 광고·AI까지, 데이터 기반 종합 광고 대행사 기브니즈의 서비스.',
    url: '/service',
  },
};

export default function ServiceLayout({ children }) {
  return children;
}
