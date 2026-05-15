# 콘텐츠 자동화 수집 — 오픈소스 후보 INDEX

기브니즈 콘텐츠 자동화 파이프라인의 **1단계(수집)** 도구 후보 저장소 목록.

- 분석 워크플로우: [/Users/jungwook/.claude/plans/jolly-herding-jellyfish.md](../../../.claude/plans/jolly-herding-jellyfish.md)
- 저장소별 분석: [repos/](repos/)
- 최종 종합 리포트: [SYNTHESIS.md](SYNTHESIS.md) *(모든 분석 완료 후 작성)*

---

## 파이프라인 맥락

```
[계정/소스 등록]
    ↓
[수집] ← 유튜브 RSS / Threads 파싱 / 인스타(학습용) / 해커뉴스 API
    ↓                                                  ★ 트위터는 보류
[GitHub Actions 매일 자동 실행] ← cron: 0 6 * * *
    ↓
[AI 요약 필터링] ← OpenAI gpt-4o-mini 또는 Claude haiku-4-5
    ↓
[이메일(Resend) / 슬랙(Webhook) 다이제스트 발송]
```

## 수집 대상 소스 (확정)

| 소스 | 입력 단위 | 방식 | 위험도 | 참조 저장소 |
|---|---|---|---|---|
| 유튜브 | 채널 ID | 공식 RSS | 없음 | [02](repos/02-youtube-tracker.md) |
| Threads | 계정명 | 비로그인 페이지 파싱 | 낮음 | [01](repos/01-instagram_threads_scraper.md) |
| 인스타그램 | 계정명 | instagrapi (학습용) | 높음 | [01](repos/01-instagram_threads_scraper.md) |
| **해커뉴스** | **없음 (전역 트렌딩)** | **공식 무료 API** | **없음** | [04](repos/04-hackerdigest.md) |
| 트위터 | — | 보류 | — | [03](repos/03-Twitter-to-RSS.md) |

---

## 후보 저장소 목록

| # | 저장소 | 후보 사유 | 한 줄 평 | 채택 후보 |
|---|---|---|---|---|
| [01](repos/01-instagram_threads_scraper.md) | [Ghodawalaaman/instagram_threads_scraper](https://github.com/Ghodawalaaman/instagram_threads_scraper) | 인스타그램/스레드 게시물 스크래퍼 | Threads 비로그인 파싱 4단계 레시피는 차용, IG 로그인 수집은 폐기. 라이선스 없음. | 보류 (패턴만) |
| [02](repos/02-youtube-tracker.md) | [thevops/youtube-tracker](https://github.com/thevops/youtube-tracker) | 유튜브 채널 모니터링 | YouTube RSS + 첫 실행 도배 방지 + 캐시 어댑터 패턴 그대로 채택. 데몬→cron, Raindrop→Supabase로 교체. MIT. | **예** (구조 차용) |
| [03](repos/03-Twitter-to-RSS.md) | [Dexploarer/Twitter-to-RSS](https://github.com/Dexploarer/Twitter-to-RSS) | 트위터 수집 → RSS 변환 | 트윗 정규화·필터·중복제거 패턴은 차용, 수집은 Nitter/Apify 권장. ElizaOS 의존·계정 로그인 위험. MIT. | 보류 (패턴만) |
| [04](repos/04-hackerdigest.md) | [upstash/hackerdigest](https://github.com/upstash/hackerdigest) | 해커뉴스 → AI 요약 → 다이제스트 | 수집·요약·캐시·노출 풀스택 미니어처. 3계층 구조·외부 cron→API·map-reduce 요약·commands 어댑터 차용. Redis 단일 키 모델은 폐기. LICENSE 없음. | **예** (아키텍처 차용) |
| [05](repos/05-awesome-content-marketing.md) | [brandonhimpfen/awesome-content-marketing](https://github.com/brandonhimpfen/awesome-content-marketing) | 마케팅 콘텐츠 큐레이션 리스트 | **코드 없음** — Awesome List 형식의 외부 링크 목록. 차용할 코드 패턴 0개. 발송 단계 SaaS(Buffer/Resend/Substack) 검토용 북마크. | 아니오 |

> 새 저장소 분석이 끝날 때마다 행을 추가합니다. 채택 후보 컬럼은 `예 / 아니오 / 보류` 중 하나.

---

## 작업 규칙 (요약)

- 한 번에 **1개 저장소만** 분석 (정확도 우선).
- 저장소 코드에 **실제 있는 것만** 작성. 추측 금지. 불명확하면 "불명확" 표기.
- 분석 결과는 [repos/NN-&lt;repo-slug&gt;.md](repos/) 에 12개 항목 형식으로 저장.
- 임시 clone은 [_clones/](_clones/)에 저장되며 `.gitignore` 처리됨.
- 본 세션은 `tools/content-mvp/research/` 외부 파일은 **읽기 전용** (다른 세션 충돌 방지).
