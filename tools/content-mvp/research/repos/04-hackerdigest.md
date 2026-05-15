# hackerdigest (Upstash)

- 원본: https://github.com/upstash/hackerdigest
- 분석일: 2026-05-13
- 후보 사유: 해커뉴스 → AI 요약 → 다이제스트 (우리 파이프라인 뒷단 레퍼런스)

> ⚠️ **LICENSE 파일 없음** (README엔 "Community Project"라고만 명시). 패턴 참고용으로만 활용 권장.

---

## 1. 한 줄 설명
6시간마다 자동으로 Hacker News 상위 스토리를 가져와 본문과 댓글을 OpenAI로 요약한 뒤 Upstash Redis에 캐싱하고, Next.js 페이지에서 그 결과를 보여주는 약 660줄짜리 Next.js 14 앱.

## 2. 핵심 목적
- **콘텐츠 수집 → AI 요약 → 캐시 → 웹 노출** 파이프라인의 **풀스택 레퍼런스**.
- Upstash 제품군(Redis, QStash, Ratelimit) 사용 시연.
- "외부 cron 트리거 → API 엔드포인트가 수집·요약 사이클 1회 실행" 패턴 (서버리스 친화).

## 3. 주요 기능 목록
- **수집** (`src/services/hackernews.ts`): Hacker News 공식 Firebase REST API로 top story ID 목록 → 각 ID로 메타·댓글 fetch → 점수 정렬 → 최근 12시간 + 상위 N개로 자름.
- **링크 파싱** (`src/services/link-parser.ts`): 각 스토리의 외부 URL을 `fetch` → `node-html-parser`로 `<p>` 우선, 없으면 `<div>` fallback으로 본문 추출 → 공백 정리 → 4000자 단위 chunk.
- **요약** (`src/services/summarizer.ts`): OpenAI `gpt-3.5-turbo-instruct` 완성 API로 3가지 모드 호출:
  - `summarizeText` (제목 + 본문 → 2~3문장).
  - `summarizeChunk` (긴 본문 청크별 1차 요약 → map-reduce).
  - `summarizeComment` (댓글 1개 요약).
- **저장** (`src/commands/set.ts`, `get.ts`): 모든 요약 결과를 단일 Redis 키(`hackerdigest`)에 `{stories, lastFetched}` JSON으로 통째 저장/조회. TTL 없음 (덮어쓰기로 갱신).
- **트리거** (`src/app/api/summarize/route.ts`): `POST /api/summarize`. **Upstash QStash가 외부에서 cron 호출**, `verifySignatureAppRouter`로 서명 검증.
- **공개 API** (`src/app/api/stories/route.ts`): `GET /api/stories`. IP 기반 슬라이딩 윈도우 rate limit (10초당 10건).
- **UI** (`src/app/page.tsx`, components): 다음 갱신까지 카운트다운, 요약 카드 목록.

## 4. 입력 데이터 형식
- **외부 트리거**: `POST /api/summarize` (QStash가 정기 호출). Body 없음. 서명 헤더로 인증.
- **HN API 입력 (앱이 호출)**:
  - `GET https://hacker-news.firebaseio.com/v0/topstories.json` → `number[]`.
  - `GET https://hacker-news.firebaseio.com/v0/item/<id>.json` → 스토리/댓글 객체.
  - 인증·키 불필요.
- **환경변수**:
  ```
  OPENAI_API_KEY
  OPENAI_ORGANIZATION_API
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
  QSTASH_CURRENT_SIGNING_KEY
  QSTASH_NEXT_SIGNING_KEY
  ```
- **`/api/stories` 호출 입력**: 헤더 `x-forwarded-for`만 (rate limit 키 용도).

## 5. 출력 데이터 형식
- **Redis 단일 키 `hackerdigest`** (`commands/constants.ts:1`):
  ```ts
  {
    lastFetched: string,             // ISO date
    stories: Array<{
      author, score, title, url,
      numOfComments, commentUrl, postedDate,
      comments: Array<{ by, time, id, type, text } | null>,
      parsedContent: string | string[]   // AI 요약 결과
    } | null>
  }
  ```
  - 매 사이클 **전체 덮어쓰기**. 누적 X.
- **`POST /api/summarize` 응답**: `{ articles }` 또는 `{}` (400).
- **`GET /api/stories` 응답**: `{ stories }` 또는 `{ message: "You shall not pass!" }` (rate limit 초과).
- **외부 발송(이메일/슬랙) 출력은 없음**. README의 "Feature Pipeline"에 "Resend로 뉴스레터 발송" TODO만 있고 미구현.

## 6. 실행 흐름 (단계별)
1. **외부 cron** (Upstash QStash): 6시간마다 `POST /api/summarize` 호출, QStash 서명 헤더 첨부.
2. **`/api/summarize` 핸들러** (`route.ts`):
   1. `verifySignatureAppRouter`로 QStash 서명 검증 (실패 시 401).
   2. `getSummarizedArticles(15)` 호출.
3. **`getSummarizedArticles`** (`summarizer.ts:109`):
   1. `getContentsOfArticles(15)` 호출 → `fetchTopStoriesFromLast12Hours(15)` → HN ID 목록 → 병렬 `fetchStoryDetails` → 점수 정렬 → 상위 15 → 각각 `fetchTopThreeComments(kids[0..3])`.
   2. 각 스토리의 외부 URL을 `fetchInnerContent`로 본문 추출 → 4000자 chunk.
   3. 각 스토리에 대해 병렬로:
      - 본문이 단일 문자열이면 `summarizeText` 한 번.
      - 본문이 chunk 배열이면 `summarizeChunk` 병렬 → 합쳐서 `summarizeText` 한 번 더 (map-reduce).
      - 댓글 각각 `summarizeComment` 병렬.
4. **`setArticles(articles)`**: Redis `hackerdigest` 키에 통째로 set.
5. **사용자**: `GET /api/stories` 또는 페이지 접근 시 Redis에서 캐시된 결과 read.

## 7. 폴더 구조와 각 파일 역할
```
.
├── README.md                                    # 56줄, Upstash 제품 시연 강조
├── package.json                                 # 의존성 9개 (Upstash 3종, openai, ky, node-html-parser, next, react)
├── next.config.js, tsconfig.json, …             # Next.js 설정 (분석 미상세)
├── public/                                      # 정적 자원
└── src/
    ├── app/
    │   ├── layout.tsx, page.tsx, globals.css   # Next.js App Router UI
    │   ├── libs/
    │   │   ├── redis-client.ts                  # 16줄, Upstash Redis 클라이언트 팩토리
    │   │   └── requester.ts                     # 11줄, ky로 HN base URL 묶은 HTTP 클라이언트
    │   ├── actions/
    │   │   └── get-all-summarized-articles.ts   # 6줄, getArticles() 래핑한 Server Action
    │   ├── components/
    │   │   └── time-until-next.tsx              # 카운트다운 UI
    │   └── api/
    │       ├── summarize/route.ts               # 26줄, QStash 검증 + 수집·요약 트리거
    │       └── stories/route.ts                 # 23줄, GET + rate limit
    ├── commands/                                # Redis 어댑터 (get/set으로 분리)
    │   ├── constants.ts                         # 1줄, redisKey = "hackerdigest"
    │   ├── get.ts                               # 13줄
    │   └── set.ts                               # 9줄
    └── services/
        ├── hackernews.ts                        # 130줄, HN API 호출 + 시간 표시 헬퍼
        ├── link-parser.ts                       # 75줄, 외부 URL 본문 추출 + chunk
        └── summarizer.ts                        # 144줄, OpenAI 호출 3가지 모드
```
- TS 코드 약 660줄. **services / commands / app/api** 3계층 분리가 깔끔.

## 8. 외부 의존성 (API, 로그인, 쿠키, 브라우저 자동화, RSS 등)
- **Hacker News Firebase API** (`https://hacker-news.firebaseio.com/v0/`): **공식·무료·인증 불필요**. 트위터·인스타와 정반대로 안정적.
- **OpenAI API**: `gpt-3.5-turbo-instruct` (Completions 엔드포인트 — **레거시**, 사용 중단 예정). 키 + organization API 필요.
- **Upstash Redis** (REST API): `@upstash/redis` SDK. URL + Token 인증. 서버리스 친화 (HTTPS 기반, connection pool 없음).
- **Upstash QStash**: 메시지 큐 + cron-as-a-service. 우리 시나리오에서는 GitHub Actions cron으로 대체 가능. 두 개의 서명 키로 rotating verification.
- **Upstash Ratelimit**: Redis 기반 rate limiter. `slidingWindow(10, "10s")`.
- **`node-html-parser`**: cheerio보다 가벼운 HTML 파서. 본문 추출용.
- **`ky`**: fetch 래퍼 (axios 대안, 가벼움).
- **브라우저 자동화·로그인·쿠키 모두 없음**. 매우 깨끗.

## 9. 그대로 쓰면 좋은 점
- **services / commands / api 3계층 분리**가 명확. `services`는 외부 API 호출 로직, `commands`는 저장 어댑터, `api`는 트리거. 우리도 그대로 차용 가치 높음.
- **외부 cron(QStash) → API 엔드포인트 트리거 패턴**: GitHub Actions에서 `curl POST /api/run-collection` 한 줄로 동일하게 구현 가능. Vercel/Netlify serverless 배포 친화.
- **map-reduce 요약 패턴**(`summarizeChunk` → `summarizeText`): 긴 본문을 청크별 요약 후 재요약. 토큰 한도 우회의 정석.
- **Redis를 "콘텐츠 메모리"로 따로 분리**: 운영 DB(있다면)와 콘텐츠 캐시를 **물리적으로 분리**한 좋은 예. 사용자 질문("콘텐츠 부분만 다른 곳에")에 정확히 부합하는 패턴.
- **`redisClient()` 팩토리 + `commands/get.ts`·`set.ts` 분리**: 백엔드 교체 시 `commands/`만 갈아끼우면 됨. 의존성 역전이 깔끔.
- **요약을 3가지 모드(article/chunk/comment)로 분리**: 프롬프트가 짧고 명확. 우리도 "본문/댓글/스레드" 별 프롬프트 분리 채택 가능.

## 10. 그대로 쓰면 위험한 점
- **`gpt-3.5-turbo-instruct`는 레거시 모델**. OpenAI가 deprecation 진행 중. `gpt-4o-mini` 또는 Claude로 교체 필수.
- **단일 Redis 키 통째 덮어쓰기** (`set redisKey, {stories, lastFetched}`): 누적 안 됨, 이력 없음, 동시성 안전성 없음 (한 번에 한 쓰기만). 우리는 누적 보관·시계열 검수가 필요할 수 있음 → 단일 키로 부족.
- **에러 핸들링이 console.error로만**: 실패해도 다음 사이클까지 알 수 없음. 알람·재시도 없음.
- **본문 추출이 너무 단순**: `<p>` 또는 `<div>` 통째 합치기 → 광고·네비게이션·푸터 다 들어감. Readability 같은 정교한 추출기로 교체 필요 (이는 명시되지 않은 약점).
- **댓글 추출이 top 3 hardcoded** (`story.kids.slice(0, 3)`): 깊이 1 댓글만, 점수·답글 가중치 없음. 시그널이 약함.
- **`maxDuration = 300`** (5분): Vercel 환경 기준이며 GitHub Actions에서는 무의미. 다른 플랫폼 이식 시 의미 사라짐.
- **LICENSE 파일 없음**: README의 "Community Project" 문구만으론 법적 보호 약함. 패턴 참고용으로만.
- **rate limit이 stories 조회에만**: cron 트리거 자체엔 QStash 서명 검증이 있지만 본문 추출 중 외부 사이트 호출에는 rate limit 없음 → 타깃 사이트에 부담.
- **Redis JSON 사이즈 한계**: 모든 스토리·요약을 한 키에 다 넣으면 키 크기 빠르게 증가. Upstash 무료 티어는 키 크기 1MB 제한. 15개 정도면 안전하지만 우리가 50~200개 누적 보관하려면 부족.

## 11. 가져갈 만한 핵심 패턴 3~5개
1. **services / commands / api 3계층 구조** (`src/services/*`, `src/commands/*`, `src/app/api/*`): 우리 콘텐츠 자동화에 그대로 차용. `services/collectors/{twitter,threads,youtube}.ts`, `commands/posts.ts` (Supabase 어댑터), `app/api/cron/collect/route.ts` (트리거).
2. **외부 cron → API 엔드포인트 트리거 + 서명 검증** (`src/app/api/summarize/route.ts:26`, `verifySignatureAppRouter`): GitHub Actions에서 동일하게 `Authorization: Bearer <SHARED_SECRET>` 헤더 + Next.js 핸들러에서 timingSafeEqual 검증 패턴으로 그대로 적용.
3. **map-reduce 요약**(`summarizer.ts:74-107`): 긴 글은 chunk 단위 1차 요약 → 합쳐서 2차 요약. 우리도 긴 트위터 스레드·유튜브 자막에 동일하게 적용.
4. **`commands` 어댑터 분리** (`src/commands/get.ts`, `set.ts`, `constants.ts`): 저장 백엔드를 한 폴더에 격리. 우리가 나중에 Redis → Supabase 또는 그 반대로 바꿔도 영향 범위 최소.
5. **Upstash Ratelimit 슬라이딩 윈도우** (`src/app/api/stories/route.ts:8-13`): 우리 어드민 API 또는 외부에 공개할 다이제스트 API에 동일하게 적용 가능. Redis 한 줄로 분산 rate limit 가능.

## 12. 버려도 되는 부분 3~5개
1. **단일 Redis 키 통째 덮어쓰기 모델** (`set.ts`): 우리는 누적/이력/검수가 필요. 키를 분리(`post:<platform>:<id>`)하거나 Supabase 테이블로 가야 함.
2. **`gpt-3.5-turbo-instruct` + Completions API**: 레거시. `gpt-4o-mini` Chat Completions 또는 Claude `claude-haiku-4-5`로 교체.
3. **Upstash QStash 의존**: GitHub Actions cron으로 대체. 학습 가치는 있지만 별도 SaaS 추가 학습 비용.
4. **Next.js page 컴포넌트 (UI 부분)**: 우리는 어드민에서 검수하므로 별도 공개 페이지 불필요. `src/app/page.tsx`, `components/time-until-next.tsx` 등 UI는 통째로 폐기.
5. **`fetchInnerContent`의 단순 p/div 추출** (`link-parser.ts:11-33`): 광고·푸터 섞임. [Readability](https://github.com/mozilla/readability) 같은 라이브러리로 대체.

---

## 우리 파이프라인 관점 요약

### 이 저장소가 보여주는 핵심 메시지

**"수집·정규화·요약·캐시·노출"이라는 전체 파이프라인의 풀스택 미니어처.** 02번(유튜브 수집)이 수집만, 03번(트위터)이 수집+필터까지였다면, 04번은 **수집 → 본문 추출 → AI 요약 → 캐시 → API 노출**까지의 전 단계를 한 저장소에 시연.

### 이 저장소가 사용자의 "콘텐츠 부분만 다른 곳에 빼고 싶다"는 직관과 연결되는 지점

- **운영용 DB는 안 씀** — 이 앱은 사용자 인증·설정·이력 같은 운영 데이터가 없음. **콘텐츠만** Redis에 캐시.
- **Redis = "콘텐츠 메모리"**: 빠른 read, 통째로 덮어쓰는 단일 키. 시계열·이력 없음.
- **만약 운영 DB(Postgres)가 있었다면**: 이 앱은 **Redis(콘텐츠 캐시) + Postgres(운영)** 두 개를 같이 썼을 것임.
- → 사용자가 원하는 "콘텐츠는 다른 메모리에" 아키텍처가 실제로 구현된 예.

### 즉시 차용 가능한 부분

1. 3계층 디렉토리(`services`/`commands`/`api`).
2. 외부 cron → 내부 API 핸들러 트리거 + 서명 검증.
3. map-reduce AI 요약.
4. `commands/` 어댑터 분리 (저장 백엔드 교체 용이).

### 교체·확장 필요

| 원본 | 우리 버전 |
|---|---|
| Upstash QStash | GitHub Actions cron + Bearer 토큰 |
| 단일 Redis 키 통째 덮어쓰기 | Supabase 테이블 `collected_posts` + 누적 또는 Upstash Redis 키 분리(`post:<id>`) |
| HN Firebase API | 우리는 트위터·인스타·유튜브·Threads (이미 02·03번에서 다룸) |
| `gpt-3.5-turbo-instruct` | `gpt-4o-mini` 또는 `claude-haiku-4-5` |
| Next.js page UI | 어드민(`/admin/content-digest`)으로 통합 |
| 본문 추출 단순 p/div | Readability 또는 unfluff |
| Redis 단일 키 1MB 제한 | 누적/이력은 Supabase, 핫 캐시만 Redis |

### 이 저장소가 채워주는 빈 칸

- 지금까지 01·02·03이 **수집까지만** 다뤘다면, 04는 **요약·캐시·API 노출**까지 보여줌.
- "외부 cron이 API 한 엔드포인트를 깨우는" 서버리스 패턴 → **GitHub Actions cron + Next.js API Route 조합과 1:1 매칭**.
