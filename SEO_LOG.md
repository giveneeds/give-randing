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

### 2026-06-29 20:14 · `081b45b`
- 한 일: 모바일 전용 경량 히어로를 분리하고 데스크탑 시네마틱 히어로는 데스크탑에서만 동적 로드되게 바꿨다. 홈 하단 섹션 렌더러는 스크롤 근접 시점 또는 8초 후 로드되게 늦췄고, GA4/Meta Pixel은 첫 스크롤·터치·클릭·키입력 이후 또는 10초 후 로드되게 조정했다. `사무실.png`는 원본을 유지하면서 추가 압축했고, 사용하지 않는 글로벌 CSS 일부를 제거했다.
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
