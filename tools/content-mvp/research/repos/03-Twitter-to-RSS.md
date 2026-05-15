# Twitter-to-RSS (ElizaOS plugin)

- 원본: https://github.com/Dexploarer/Twitter-to-RSS
- 분석일: 2026-05-13
- 후보 사유: 트위터 수집 → RSS 변환

> ✅ **MIT 라이선스** (Copyright (c) 2025 ElizaOS).
> ⚠️ **ElizaOS 프레임워크 플러그인**이라 단독 사용 어려움. 핵심 로직만 발췌해 우리 프로젝트에 옮겨야 함.

---

## 1. 한 줄 설명
ElizaOS 플러그인 형태로, 트위터 계정으로 **로그인하여** 지정한 Twitter List(들)의 트윗을 비공식 라이브러리(`agent-twitter-client`)로 긁어와 RSS 2.0 XML로 변환하고 HTTP 서버로 제공하는 약 1,100줄 규모의 TypeScript 프로젝트.

## 2. 핵심 목적
- **Twitter API 키 없이** 트위터 List를 모니터링하고 RSS 피드 생성.
- 트위터 ToS상 회색지대 (계정 로그인 기반 스크래핑) — 무료지만 차단·계정 정지 위험.
- ElizaOS 에이전트가 채팅 명령("Update my RSS feed")으로 수집을 트리거하고 상태를 조회할 수 있게 함.

## 3. 주요 기능 목록
- 환경변수에 등록한 Twitter **List ID 목록** 폴링 (계정 핸들이 아니라 List 단위).
- `agent-twitter-client`의 `Scraper.login(username, password, email)`으로 인증, `fetchListTweets(listId, maxTweets)`로 트윗 수집.
- 처리한 트윗 ID를 `processed_tweets.json`에 캐싱해 중복 제거.
- 옵션: 리트윗 필터, 답글 필터, 최소 글자수, 스레드 전체 수집(`FETCH_TWEET_THREADS`).
- `fast-xml-parser`의 `XMLBuilder`로 RSS 2.0 XML 빌드 후 `rss-feeds/twitter_lists.xml`에 저장.
- Express 기반 HTTP 서버: `GET /rss`, `GET /status`, `POST /update`, `GET /health`.
- Bearer 토큰(`RSS_API_TOKEN`)으로 API 보호 (옵션).
- `setInterval`로 30분 주기 스케줄러 (기본).
- ElizaOS 통합: `UPDATE_RSS_FEED`, `GET_RSS_STATUS` Action / `TWITTER_LIST_PROVIDER` Provider / 두 개 Service.
- 프록시(`PROXY_URL`) 지원.

## 4. 입력 데이터 형식
**환경변수 (`.env`)**:
```
TWITTER_USERNAME=...
TWITTER_PASSWORD=...
TWITTER_EMAIL=...
TWITTER_LISTS=1234567890,9876543210      # Twitter List ID 콤마 구분
OPENAI_API_KEY=...                       # ElizaOS 코어가 요구 (기능과 무관)
RSS_UPDATE_INTERVAL=30                   # 분 단위
MAX_TWEETS_PER_LIST=50
FILTER_RETWEETS=false
FILTER_REPLIES=false
FETCH_TWEET_THREADS=false
RSS_API_TOKEN=...                        # 옵션
RSS_SERVER_PORT=3001
PROXY_URL=...                            # 옵션
```
- List ID는 `https://twitter.com/i/lists/<ID>` URL에서 숫자 부분.
- **계정 핸들 → List ID 변환은 제공 안 함**. 사용자가 트위터에서 직접 List 만들고 ID 복사해야 함.

## 5. 출력 데이터 형식
- **파일**: `./rss-feeds/twitter_lists.xml` (RSS 2.0 XML).
- **메모리·캐시**: `./rss-feeds/processed_tweets.json` (처리된 트윗 ID `string[]`).
- **HTTP**:
  - `GET /rss` → RSS XML body, `Content-Type: application/rss+xml`.
  - `GET /status` → JSON (감시 중인 List 목록·간격·파일 크기·서버 uptime).
  - `POST /update` → JSON (수집 트리거 결과: `{success, totalTweets, rssPath}`).
  - `GET /health` → JSON 헬스체크.
- **트윗 정규화 모델** (`TweetData` 인터페이스, `twitterRSSService.ts:33-58`):
  ```ts
  {
    id, text,
    author: {username, name, verified},
    createdAt: Date, url,
    isRetweet, isReply, replyToTweetId,
    retweetedTweet, quotedTweet,
    media: [{type:'image', url}],
    metrics: {likes, retweets, replies},
    thread?: TweetData[]
  }
  ```
- **RSS 항목**: `title: "@username: <앞 100자>..."`, `description: 본문 + 미디어 카운트 + 좋아요/리트윗/답글 + 스레드 답글`, `pubDate: tweet.createdAt.toUTCString()`, `guid: tweet.id`.

## 6. 실행 흐름 (단계별)
1. **부팅** (`src/index.ts` → ElizaOS character/project 정의 → `src/plugin.ts` 등록).
2. ElizaOS 런타임이 `TwitterRSSService.start(runtime)` 호출.
3. `initialize()`:
   - 환경변수에서 자격증명 로드. 없으면 limited 모드.
   - `Scraper.login()` 호출. 성공 시 `processed_tweets.json` 로드 → `startScheduler()`.
   - 실패 시 프록시·레이트리밋·IP 차단 가이드를 경고 로그로 출력하지만 **서비스는 계속 살아 있음** (이후 호출은 throw).
4. **스케줄러**:
   - 부팅 5초 후 1차 실행, 이후 `RSS_UPDATE_INTERVAL`분마다 `processAllLists()`.
5. **`processAllLists()`** (한 사이클):
   1. 각 List에 대해 `fetchListTweets(listId, max)`.
   2. 캐시에 없는 트윗만 골라 옵션 필터(`FETCH_TWEET_THREADS`이면 스레드 전체 다시 fetch).
   3. `transformTweet`으로 평탄화, `applyFilters`로 retweet/reply/length 검사.
   4. 트윗을 `processedTweetIds.add()`.
   5. List 사이 2초 sleep (rate limit 회피).
6. 모든 List 트윗 합쳐 `createdAt` 내림차순 정렬 후 `MAX_RSS_ENTRIES`(기본 500)로 자름.
7. `generateRSSFeed` → `buildRSSXML` → `saveRSSFeed` → `saveProcessedTweetIds`.
8. **RSSServerService**가 Express로 `/rss` 등을 동시 서빙.

## 7. 폴더 구조와 각 파일 역할
```
.
├── LICENSE                              # MIT
├── README.md                            # 240줄, env·HTTP·문제해결 가이드
├── CHANGELOG.md, TODO.md                # (분석 미상세, 불명확)
├── package.json                         # @elizaos/core, agent-twitter-client, express 등
├── tsconfig.{json,build.json}           # TS 설정
├── tsup.config.ts                       # 번들러 설정 (분석 미상세)
├── vitest.config.ts                     # 테스트 러너
├── src/
│   ├── index.ts                         # ElizaOS Character + Project 정의 진입점
│   ├── plugin.ts                        # ElizaOS 플러그인 매니페스트 (Actions/Providers/Services 등록)
│   ├── providers/twitterList.ts         # ElizaOS Provider: 모니터링 중 List 컨텍스트 제공
│   ├── actions/updateRSS.ts             # ElizaOS Action: 수동 업데이트 트리거
│   ├── actions/getRSSStatus.ts          # ElizaOS Action: 상태 조회
│   └── services/
│       ├── twitterRSSService.ts         # 484줄, 핵심 — 로그인·수집·필터·RSS 빌드·캐시
│       └── rssServerService.ts          # 182줄, Express 서버 (rss/status/update/health)
├── __tests__/                           # vitest 단위 테스트 13개
└── e2e/                                 # ElizaOS e2e 테스트 2개
```
- 핵심 로직은 `twitterRSSService.ts`에 거의 다 들어 있음 (484줄, 단일 파일).
- 나머지는 ElizaOS 프레임워크 어댑터·서버·테스트.

## 8. 외부 의존성 (API, 로그인, 쿠키, 브라우저 자동화, RSS 등)
- **`agent-twitter-client`** (npm `^0.0.18`): 비공식 트위터 스크래핑 라이브러리. **계정 로그인 필요**. 브라우저 자동화는 아니고 HTTP/GraphQL 요청을 직접 위조하는 방식 (코드를 직접 보지 않아 정확한 구현 방식은 불명확, 단 README가 "no API keys needed - uses web scraping"이라 명시).
- **`@elizaos/core`, `@elizaos/cli`, `@elizaos/plugin-openai`, `@elizaos/plugin-sql`**: ElizaOS 에이전트 프레임워크 (beta). 이 저장소는 **단독 실행이 아니라 ElizaOS 에이전트의 플러그인으로 동작**.
- **OpenAI API 키** (REQUIRED): ElizaOS 코어가 LLM 호출에 사용. RSS 기능 자체에는 불필요하지만 ElizaOS 부팅 조건.
- **`express`, `cors`**: HTTP 서버.
- **`fast-xml-parser`**: RSS XML 빌드.
- **`node-cron`**: 의존성에 있으나 실제 코드에서는 `setInterval` 사용 (불명확 — 다른 곳에서 쓰는지 추가 확인 필요).
- **프록시**: `PROXY_URL` 설정 시 트위터 연결에 사용 (로그만 출력, 실제 적용 코드는 `Scraper` 라이브러리 내부에 의존).
- **로그인 정보**: 평문 환경변수에 username/password/email 저장. 2FA 처리에 대한 코드는 없음 (불명확 — 라이브러리가 처리할 가능성).

## 9. 그대로 쓰면 좋은 점
- **트윗 → 정규화 모델 → RSS XML 변환 파이프라인이 한 파일(484줄)에 완결**. 발췌해 우리 코드에 옮기기 용이.
- **`processed_tweets.json` 기반 중복 제거 패턴**이 깔끔 (Set 기반, 부팅 시 로드, 종료 시 저장).
- **HTTP API + 스케줄러 + 캐시**가 한 묶음으로 패키징되어 있어 운영용 구조를 그대로 참고 가능.
- **MIT 라이선스** → 그대로 차용 합법.
- 환경변수 가짓수가 많아 **튜닝 포인트(필터·간격·길이)가 명시적**.

## 10. 그대로 쓰면 위험한 점
- **계정 로그인 기반 스크래핑** (`agent-twitter-client`) → 트위터 ToS 위반 가능성. 부계정 정지 위험. **GitHub Actions의 클라우드 IP에서는 거의 확실히 차단** (READE의 troubleshooting이 "IP 차단" 경고를 명시할 정도).
- **2FA 미지원으로 추정** — 운영 안정성 떨어짐.
- **Twitter List ID 입력 강제** — 우리 시나리오(특정 계정 10개 추적)에는 어색. List를 미리 만들고 계정을 추가해두는 사전 작업 필요.
- **ElizaOS 프레임워크 강결합**:
  - `Service`, `IAgentRuntime`, `runtime.getSetting()`, `runtime.getService()` 등 ElizaOS API에 의존.
  - 단독 실행하려면 어댑터를 다 들어내야 함 (실제로 핵심 로직은 `runtime` 의존 부분만 잘라내면 동작 가능).
- **OpenAI API 키 필수** (ElizaOS 부팅 조건). 우리는 LLM 단계를 별도로 갈 거면 이 의존이 헛돈 비용.
- **로컬 파일 캐시·로컬 파일 출력**(`./rss-feeds/`) → GitHub Actions에서 휘발. 02번 저장소와 동일한 문제.
- **`setInterval` 데몬 모델** → cron 1-shot과 안 맞음. 02번과 동일.
- **에러 시 silently continue**: List 한 개 실패해도 다음으로 넘어가서 운영자가 알아채기 어려움. 모니터링은 `/status` 폴링이 유일.
- **노출 비밀번호**: `.env`에 평문. 시크릿 매니저 통합 없음.
- **트위터 측 변화에 매우 취약**: 작년 이후 트위터(X)가 비공식 클라이언트를 적극 차단 중. `agent-twitter-client ^0.0.18`은 매우 초기 버전이라 안정성 불명확.

## 11. 가져갈 만한 핵심 패턴 3~5개
1. **트윗 정규화 모델(`TweetData`) + `transformTweet()` 함수** (`twitterRSSService.ts:33-58, 272-306`): raw 응답을 평탄한 dict로 만드는 패턴이 깔끔. 우리 수집기에서도 플랫폼별 raw → 공통 `Post` 모델 변환 어댑터로 그대로 차용.
2. **처리된 ID Set 기반 중복 제거** (`loadProcessedTweetIds`/`saveProcessedTweetIds`, `twitterRSSService.ts:174-196`): 02번 저장소의 채널별 `string[]` 캐시와 동일한 아이디어를 글로벌 Set으로 확장한 버전. 우리는 Supabase 테이블의 `(platform, post_id)` UNIQUE 제약으로 대체 가능.
3. **`applyFilters` 파이프라인** (`twitterRSSService.ts:308-325`): 리트윗/답글/최소 길이를 옵션으로 분리. 우리 AI 요약 전 1차 필터링(스팸/짧은 글/광고 등) 단계에 동일 패턴 적용.
4. **`/health` + `/status` 엔드포인트 분리**: 헬스체크는 비인증, 상태는 인증 토큰 필수. 우리 어드민에서 수집 잡 상태 확인할 때 동일하게 분리하면 모니터링 도구(UptimeRobot 등) 연결 쉬움.
5. **List별 사이 2초 sleep** (`twitterRSSService.ts:461`): 단순하지만 효과적인 rate limit 완화. 우리도 계정별 호출 사이에 jitter 포함 sleep 도입.

## 12. 버려도 되는 부분 3~5개
1. **ElizaOS 프레임워크 전체** (`@elizaos/core`, `@elizaos/cli`, `@elizaos/plugin-*`, `Service` 상속, `runtime.getSetting()`, Actions/Providers): 우리는 ElizaOS를 안 씀. 핵심 로직만 `class TwitterRSSCollector`로 추출.
2. **`agent-twitter-client` 라이브러리 자체**: 비공식·계정 로그인 기반 → ToS·차단 리스크. 대안 평가 필요(아래 대안 섹션 참조). 다만 학습/실험용으로 잠깐 써보는 건 가능.
3. **Express HTTP 서버(`rssServerService.ts`) 전체**: 우리는 RSS 파일을 외부에 노출할 필요 없음(다이제스트로 직접 발송). RSS 빌드 결과는 그냥 메모리에서 다음 단계로 넘기면 됨.
4. **로컬 파일 출력 (`./rss-feeds/twitter_lists.xml`, `processed_tweets.json`)**: Actions 환경 휘발. Supabase 테이블/JSONB로 교체.
5. **OpenAI API 키 강제**: ElizaOS 부팅 조건일 뿐 RSS 기능과 무관. ElizaOS를 떼면 이 의존도 사라짐.

---

## 우리 파이프라인 관점 요약

- **이 저장소가 채워주는 빈 칸**:
  1. **트위터 수집기의 raw 응답 → 정규화 모델** 변환 어댑터 패턴 (저장소 02엔 RSS가 이미 정규형이라 이 단계가 없었음).
  2. **`applyFilters` 같은 콘텐츠 1차 필터링** 단계 (AI 요약 비용 절감용 사전 필터).
  3. **글로벌 처리 ID Set 기반 중복 제거** (저장소 02의 채널별 캐시보다 우리 시나리오에 더 맞음 — 우리는 플랫폼 통합).

- **이 저장소의 결정적 한계**:
  - **트위터 자체가 가장 어려운 플랫폼**. 공식 RSS도 없고(2023년 `twitrss.me` 등 다 죽음), 비공식 API는 차단·계정 정지 위험.
  - 정직하게 말하면 **이 저장소대로 GH Actions에서 매일 돌리면 며칠 안에 정지**. 인스타와 동일한 운명.

- **트위터 수집에 대한 진짜 선택지** (이 저장소 채택 여부와 별개로 정리):
  | 옵션 | 비용 | 차단 위험 | 우리 시나리오(계정 10개·하루 1회) |
  |---|---|---|---|
  | 이 저장소 + GH Actions | 무료 | **매우 높음** | 학습용으로만 |
  | 이 저장소 + VPS + 프록시 + 부계정 | $5~30/월 | 중간 | 가능, 운영 부담 큼 |
  | **Nitter 인스턴스 RSS** (운영 중인 곳) | 무료 | 중간 (인스턴스가 죽으면 끝) | **가성비 1위** — 후속 분석 권장 |
  | **Apify Twitter actor** | $5~20/월 | 낮음 | 안정적 |
  | **공식 X API Basic** | $200/월 | 0 | 과한 비용 |

- **결론**: 이 저장소는 **트윗 정규화 모델·필터 파이프라인·중복 제거 패턴**만 발췌하고, 수집 자체는 **Nitter RSS** 또는 **Apify Twitter actor**로 가는 게 합리적. 학습/실험으로는 `agent-twitter-client` 직접 시도 가능.
