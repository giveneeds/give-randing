# awesome-content-marketing

- 원본: https://github.com/brandonhimpfen/awesome-content-marketing
- 분석일: 2026-05-13
- 후보 사유: 마케팅 콘텐츠 전환기 (사용자 표현)

> ⚠️ **이 저장소는 코드가 아니라 "Awesome List" 큐레이션 문서입니다.** 113줄짜리 README.md 1개 + 메타 파일(CONTRIBUTING, CHANGELOG, link checker)만 있고, 실행 가능한 코드는 없습니다.
> 12개 항목 템플릿은 적용 불가. 대신 **링크 목록에서 우리 파이프라인에 쓸 만한 도구·자료**만 골라 정리합니다.
>
> **라이선스**: CC BY-SA 4.0 (큐레이션 문서 자체).

---

## 실제 내용 요약

11개 카테고리, 각 3~5개 외부 링크:

1. General Resources — 마케팅 정의·블로그
2. Content Creation Tools — Canva, Grammarly, Jasper, Hemingway, Lumen5
3. Content Distribution Platforms — Medium, Substack, LinkedIn, Buffer, Hootsuite
4. SEO and Content Optimization — Yoast, SEMrush, Surfer SEO, Ahrefs, AnswerThePublic
5. Analytics and Tracking — Google Analytics, Hotjar, Chartbeat, ContentSquare, Crazy Egg
6. Content Marketing Strategies — HubSpot/CMI 가이드 글들
7. Best Practices and Guides — Moz, Mailchimp, Optimizely 가이드
8. Open-Source Tools — **Ghost, Hugo, Jekyll, Pelican, Netlify CMS**
9. Educational Resources — Coursera·HubSpot Academy 코스
10. Community and Forums — r/ContentMarketing, Inbound.org 등
11. Contributing / License

→ **대부분 유료 SaaS 외부 링크**이고, **우리가 차용할 코드 패턴은 0개**.

---

## 우리 파이프라인 관점에서 "조금이라도 쓸 만한" 5개

대부분 우리에게 부적합하지만, 그래도 다음 항목들은 **참고 가치가 있음**:

### ① Buffer / Hootsuite (Content Distribution)
- 우리 파이프라인의 **발송 단계**(이메일/슬랙/카톡) 대신 **SNS 자동 게시**까지 확장하고 싶다면 후보.
- 두 도구 모두 **API 제공** → 이미 우리 다이제스트 데이터가 있으면 "이번 주 베스트 콘텐츠 자동 X 게시" 같은 흐름 가능.
- **단점**: 둘 다 월 $15~99 SaaS. 우리 규모엔 과함.
- **대안**: 차라리 발송 단계는 자체 구축 (Resend·Slack webhook) → SaaS 의존 회피.

### ② Substack
- 다이제스트 발송을 **자체 메일 인프라 없이** 시작하려면 후보.
- 이메일 수신자 관리·발송·구독해지가 자동 제공.
- **단점**: 콘텐츠 소유권·디자인 자유도가 떨어짐. B2B 에이전시(기브니즈) 브랜딩과 안 맞음.
- **대안**: Resend + 자체 템플릿이 더 합리적.

### ③ Ghost (Open-Source CMS)
- **우리 매거진 백엔드의 잠재 대안**. 자체 호스팅 가능.
- 다만 **현재 우리는 이미 Next.js + Supabase로 매거진 구축**되어 있음 → 굳이 갈아탈 이유 없음.
- 참고만: Ghost는 콘텐츠 자동화 단계 결과를 받아 발행하는 백엔드로 쓸 수도 있지만, 우리는 이미 자체 매거진이 있어 불필요.

### ④ AnswerThePublic
- 키워드 발굴 도구. 우리 파이프라인의 **수집 대상 결정**(어떤 계정·어떤 키워드를 추적할지) 단계에 외부적으로 도움.
- 자동화에 끼울 만한 API는 없음 (유료 SaaS).
- **참고만**: 사람이 키워드 후보 만들 때 한 번씩 보는 용도.

### ⑤ HubSpot의 "Topic Clusters" 가이드 (#67 링크)
- 콘텐츠 IA 설계 시 참고 가치.
- 이미 기브니즈 매거진 IA 잡혀 있음 (memory의 `project_landing_ia_flow.md` 참고) → 추가 작업 불필요.

---

## 우리가 가져가지 **않을** 것 (대부분)

- **AI 글쓰기 SaaS** (Jasper, Hemingway, Grammarly): 우리는 이미 OpenAI/Claude 직접 호출할 거임.
- **디자인 SaaS** (Canva, Lumen5): 콘텐츠 자동화 범위 밖.
- **SEO 도구** (SEMrush, Ahrefs, Surfer): 월 $99~ 유료. 우리 단계엔 과함.
- **애널리틱스** (Google Analytics, Hotjar, Chartbeat): 다이제스트 발송 후 단계. 지금 다룰 영역 아님.
- **정적 사이트 생성기** (Hugo, Jekyll, Pelican): 우린 이미 Next.js.
- **교육·커뮤니티 링크**: 학습 자료. 코드와 무관.

---

## 결론

- **이 저장소에서 추출할 코드·아키텍처 패턴은 0개**.
- **참고 가치**가 있는 것: 발송 단계 확장 시 Buffer/Substack 검토, 매거진 백엔드 비교 시 Ghost 참고 정도.
- 사용자가 표현한 "마케팅 콘텐츠 **전환기**"는 이 저장소의 실제 내용과 다름. **자동 변환 도구가 아니라 도구 목록**.
- **채택 후보: 아니오** (단, 사이드 도구 검토용 북마크로 보관 가능).

---

## 우리 파이프라인의 "발송 단계" 결정에 도움 되는 미니 인사이트

이 큐레이션 리스트를 훑으며 확인된 사실:

- 발송용 SaaS의 양대 산맥: **이메일 = Mailchimp/Resend**, **SNS = Buffer/Hootsuite**.
- 두 카테고리 모두 **외부 SaaS** 또는 **자체 구축** 둘 중 하나.
- 우리 규모(주 1회 다이제스트, 수신자 10~수백 명 추정)에서는 **Resend 단일 통합이 가장 가성비** — 월 100건 무료, 이후 1000건당 $0.40.
- 슬랙은 webhook이 무료라 추가 비용 0.
- 카톡(채널) 발송은 한국 메신저 자동화 시장이 별도이므로 따로 검토 필요 (이 저장소엔 정보 없음).
