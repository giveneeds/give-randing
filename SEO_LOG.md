# 🔍 SEO 작업 로그

> 기브니즈 SEO/성능 개선 작업의 **진행상황 기록 전용** 문서. 할 일 목록·작업 분배 아님.
> **커밋할 때마다 맨 위에 항목 하나** 추가한다 (최신순).
> 핵심: "**무엇을, 왜(무엇을 막거나 해결하려고) 바꿨는지**"를 남겨서,
> 나중에 같은 부분을 다시 건드릴 때 그 의도를 알고 판단할 수 있게 한다. (누가 했는지는 안 적음)
>
> 형식:
> ```
> ### YYYY-MM-DD HH:MM · `커밋해시`
> - 한 일: 무엇을 바꿨는지
> - 목적/이유: 왜 이렇게 했는지, 무엇을 막거나 해결하려는 변경인지
> - 대상: 파일/영역
> - 검증: build / 배포확인 등
> ```

---

### 2026-07-01 17:15 · `6e82886`
- 한 일: 전역 `<head>`에 출력되는 네이버 사이트 소유확인 meta 값을 `www.giveneeds.co.kr` 속성용 신규 토큰으로 교체했다.
- 목적/이유: 네이버 서치어드바이저에서 표준 도메인인 `https://www.giveneeds.co.kr`을 별도 사이트로 등록하고 소유확인을 완료할 수 있게 하기 위함. 기존 non-www 속성만으로는 `www` canonical/sitemap/RSS 관리와 맞지 않는 문제를 해결한다.
- 대상: app/layout.js
- 검증: npx eslint app/layout.js ✅, npm run build ✅, 로컬 HTML에서 `<meta name="naver-site-verification" content="bfab3f9a0111f88d7edec185c607dee9e3f5d2d2"/>` 출력 확인 ✅

### 2026-07-01 16:16 · `27ade70`
- 한 일: 상품 상세 페이지의 표준 URL을 `/service/{slug}`에서 `/{slug}` 1뎁스 구조로 옮기고, 하이픈이 있던 상품 slug를 모두 하이픈 없는 형태로 정규화했다. 기존 `/service/{slug}` 및 하이픈 포함 1뎁스 주소는 308 리다이렉트로 새 표준 주소에 연결했다. 서비스 상세 메타데이터, canonical, og:url, sitemap, Service JSON-LD를 새 1뎁스 주소 기준으로 생성하고, 어드민 서비스/솔루션 관리 화면에서 SEO Title, Page H1, Meta Description, Keywords, OG, 구조화 데이터, index/follow/sitemap 여부를 직접 수정할 수 있게 했다.
- 목적/이유: 경쟁 페이지처럼 개별 상품 페이지를 검색 의도가 선명한 1뎁스 랜딩 페이지로 만들면서, 기존 주소의 SEO 신호와 공유 링크가 끊기지 않도록 하기 위함. 또한 상품별 설명문·검색 결과 제목·공유 미리보기 문구를 코드 수정 없이 관리자가 직접 보완할 수 있게 하기 위함.
- 대상: app/[slug]/page.js, app/service/[slug]/*, app/service/page.js, app/sitemap.js, proxy.js, app/admin/services/page.js, app/api/services/route.js, app/api/leads/*, app/admin/leads/*, components/service/ServicePreviewSurface.js, components/service/ServiceDetailTracker.js, lib/serviceRoutes.js, lib/serviceSeo.js, lib/supabase.js, Supabase services.slug 데이터
- 검증: DB 변경 전 services 테이블 백업(`.tmp/services-before-root-slug-migration-2026-07-01T07-09-19-734Z.json`) 및 slug 충돌 사전 확인 ✅, git diff --check ✅, 변경 파일 대상 ESLint ✅, npm run build ✅, 로컬/프로덕션에서 `/placemarketing` 200·`/place-marketing` 308·`/service/place-marketing` 308·sitemap 새 URL 반영·canonical/og:url 새 URL 반영·기존 slug API 조회 호환 확인 ✅

### 2026-06-30 · `ec72d3c`
- 한 일: 어드민 사이드바에서 콘텐츠 스튜디오 메뉴 제거. 퍼널 방문자 분석 페이지에 UTM 키워드·채널·레퍼러 표시 기능 추가.
- 목적/이유: 콘텐츠 스튜디오는 사용하지 않아 메뉴 노출 제거. 임준혁·김동언·강민진 등 특정 리드의 유입 경로와 검색 키워드를 퍼널에서 바로 확인할 수 있도록 개선.
- 대상: `components/admin/Sidebar.js`, `app/admin/funnel/user/page.js`, `app/admin/funnel/visitor/[anonymousId]/page.js`, `app/api/analytics/visitors/route.js`, `app/api/analytics/visitor/[anonymousId]/route.js`
- 검증: git push → Vercel 자동 배포

### 2026-06-29 21:19 · `768214f`
- 한 일: 모바일 첫 화면에서 GIVENEEDS 타이틀과 다음 검색 카드가 한 화면에 눌려 보이던 구성을 다시 분리했다. 첫 화면은 메인 타이틀/설명/스크롤 안내까지만 보이게 하고, 검색 카드형 두 번째 타이틀은 다음 화면 아래로 내려서 표시한다. GIVENEEDS 영문 타이틀은 중앙 정렬과 폭 제한을 적용해 좌우 글자 잘림을 막았다.
- 목적/이유: 모바일 PageSpeed 최적화 과정에서 히어로 높이를 한 화면 안에 압축하면서 메인 타이틀과 다음 카드가 합쳐져 보이고, 큰 영문 타이틀이 좌우로 치우쳐 일부 글자가 잘리는 문제를 해결하기 위함.
- 대상: components/landing/MobileCinematicHeader.js
- 검증: npx eslint components/landing/MobileCinematicHeader.js ✅, npm run build ✅, 390px 모바일 로컬 스모크 체크에서 타이틀 좌우 잘림 없음/검색 카드 첫 화면 아래 시작 확인 ✅

### 2026-06-29 20:14 · `2cc2262`
- 한 일: 모바일 전용 경량 히어로를 분리하고 데스크탑 시네마틱 히어로는 데스크탑에서만 동적 로드되게 바꿨다. 홈 하단 섹션 렌더러는 화면에 진입하는 시점 또는 8초 후 로드되게 늦췄고, GA4/Meta Pixel은 첫 스크롤·터치·클릭·키입력 이후 또는 10초 후 로드되게 조정했다. `사무실.png`는 원본을 유지하면서 추가 압축했고, 사용하지 않는 글로벌 CSS 일부를 제거했다.
- 목적/이유: 모바일 PageSpeed에서 남은 병목이 자사 JS 실행, forced reflow, Facebook/GTM 초기 실행, 렌더 블로킹 CSS였기 때문에 모바일 첫 화면의 JS/레이아웃 부담을 줄이기 위함. 단, 4차 이미지 작업은 사용자 지시에 따라 제거/대체 없이 원본 이미지 압축만 수행했다.
- 대상: components/landing/CinematicHeader.js, components/landing/DesktopCinematicHeader.js, components/landing/MobileCinematicHeader.js, components/landing/DeferredHomeSections.js, app/HomePageClient.js, components/GoogleAnalytics.js, components/MetaPixel.js, lib/useThirdPartyGate.js, app/globals.css, public/사무실.png
- 검증: git diff --check ✅, npx eslint <변경 JS 파일 목록> ✅, npm run build ✅, 로컬 모바일/데스크탑 홈 화면 스모크 체크 ✅

### 2026-06-29 19:47 · `d5a129b`
- 한 일: 유튜브 임베드를 썸네일 클릭 후 로드 방식으로 바꾸고, GA4/Meta Pixel 초기 로드를 늦췄다. 홈 첫 화면은 데이터 로딩 전에도 히어로가 바로 보이게 바꾸고, 히어로 애니메이션의 blur/긴 스크롤 부담을 줄였다. `사무실.png` 원본도 경량화했다.
- 목적/이유: PageSpeed 재측정에서 남은 병목이 이미지보다 YouTube, Facebook, GTM, 자사 JS 실행, 히어로 render delay였기 때문에 첫 화면 로딩과 모바일 TBT/LCP 지연을 줄이기 위함. 서비스 참고 이미지는 성능 최적화 유지 상태에서 잘림 위험을 낮추도록 contain으로 조정했다.
- 대상: components/ui/LazyYouTubeEmbed.js, components/landing/VideoSection.js, components/service/ProductDetailRenderer.js, components/GoogleAnalytics.js, components/MetaPixel.js, app/HomePageClient.js, components/landing/CinematicHeader.js, components/landing/BrandStatsSection.js, components/service/ServicePreviewSurface.js, public/사무실.png
- 검증: git diff --check ✅, npx eslint <변경 파일 목록> ✅, npm run build ✅

### 2026-06-29 17:55 · `b8eb426`
- 한 일: 공개 페이지의 주요 이미지 렌더링을 Next.js 이미지 최적화 경로로 전환하고, Supabase/Unsplash/자사 도메인 이미지만 최적화 대상으로 허용했다.
- 목적/이유: 모바일 PageSpeed에서 이미지 전송량이 약 8MB로 잡히고 LCP가 길어진 문제를 줄이기 위함. 원본 대형 이미지를 화면 크기에 맞지 않게 그대로 내려보내는 상황을 막는다.
- 대상: next.config.mjs, components/ui/OptimizedImage.js, app/428place/page.js, app/for-you/[slug]/page.js, app/magazine/*, components/landing/* 이미지 섹션, components/service/* 이미지 렌더러
- 검증: npx eslint <변경 파일 목록> ✅, npm run build ✅
