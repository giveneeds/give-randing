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

### 2026-06-29 17:55 · `b8eb426`
- 한 일: 공개 페이지의 주요 이미지 렌더링을 Next.js 이미지 최적화 경로로 전환하고, Supabase/Unsplash/자사 도메인 이미지만 최적화 대상으로 허용했다.
- 목적/이유: 모바일 PageSpeed에서 이미지 전송량이 약 8MB로 잡히고 LCP가 길어진 문제를 줄이기 위함. 원본 대형 이미지를 화면 크기에 맞지 않게 그대로 내려보내는 상황을 막는다.
- 대상: next.config.mjs, components/ui/OptimizedImage.js, app/428place/page.js, app/for-you/[slug]/page.js, app/magazine/*, components/landing/* 이미지 섹션, components/service/* 이미지 렌더러
- 검증: npx eslint <변경 파일 목록> ✅, npm run build ✅
