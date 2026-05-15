# instagram_threads_scraper

- 원본: https://github.com/Ghodawalaaman/instagram_threads_scraper
- 분석일: 2026-05-13
- 후보 사유: 인스타그램/스레드 게시물 스크래퍼

> ⚠️ **라이선스 파일 없음** — 저장소에 `LICENSE` 파일이 존재하지 않음. 그대로 코드를 가져다 쓸 경우 저작권 기본값(저작자 전용)이 적용될 수 있음. 패턴 참고용으로만 활용 권장.

---

## 1. 한 줄 설명
인스타그램 게시물 메타데이터와 Threads 게시물·답글을 각각 별도 파이썬 스크립트로 수집해 CSV로 저장하는 두 개의 단일 파일 스크래퍼.

## 2. 핵심 목적
- **Instagram**: 게시물 shortcode 목록을 입력받아 `instagrapi` 라이브러리로 로그인 후 게시물 메타(좋아요 수, 작성자)를 가져온다.
- **Threads**: 게시물 shortcode 목록을 입력받아 Playwright(헤드리스 Chromium)로 페이지에 접근, 페이지 HTML에 임베드된 JSON(`<script type="application/json" data-sjs>`)에서 메인 글과 답글을 파싱한다.

## 3. 주요 기능 목록
- `scrape_instagram.py`:
  - `instagrapi.Client.login(username, password)` 로그인 (코드에 자격증명이 **하드코딩 자리표시자**로 들어가 있음, `scrape_instagram.py:8`).
  - `posts.txt`에서 shortcode 목록 읽어 `random.shuffle` 후 상위 150개 처리.
  - `cl.media_pk_from_code(code) → cl.media_info(pk)` 호출.
  - `data.csv`에 `code,like_count,username,created_at` 누적 추가(append).
  - 예외 처리: `MediaNotFound`, `MediaUnavailable`, `ChallengeUnknownStep`, `PleaseWaitFewMinutes` (로그인 단계는 30분 sleep, 본문은 30초 sleep).
  - 요청 간 `time.sleep(1)`.
- `scrape_threads.py`:
  - `playwright.sync_api.sync_playwright`로 Chromium 헤드리스 실행.
  - `https://www.threads.net/t/{code}`에 접근, `[data-pressable-container=true]` 셀렉터 대기.
  - `script[type="application/json"][data-sjs]` 텍스트 전부 수집 → `"ScheduledServerJS"` & `"thread_items"` 포함 여부로 필터링 → `nested_lookup`으로 `thread_items` 키 탐색.
  - `jmespath` 표현식으로 텍스트·좋아요·작성자·이미지/비디오 URL 등 추출 (`scrape_threads.py:14-35`).
  - 메인 thread 1개 + replies 배열로 분리하여 `threads_data.csv`에 누적.
  - 요청 간 `time.sleep(random.randint(1,5))`.

## 4. 입력 데이터 형식
- `posts.txt`: 인스타그램 게시물 shortcode 한 줄에 하나 (공백/개행 구분). 샘플 114,650줄 포함.
- `threads_feed.txt`: Threads 게시물 shortcode 한 줄에 하나. 샘플 32,365줄 포함.
- shortcode 예: `C3FrqnMx6ca`, `C6mKlDbP0cJ`.
- **계정 목록(usernames) 입력은 없음** — 이 저장소는 "수집할 게시물 코드"를 이미 알고 있다고 가정한다. shortcode를 어디서 어떻게 얻는지에 대한 코드는 **없음** (불명확).

## 5. 출력 데이터 형식
- `data.csv` (Instagram): 헤더 한 줄 + 데이터 행
  ```
  code,like_count,username,created_at
  C3FrqnMx6ca,130405,nainasharmaofficially,1715071847.6867552
  ```
- `threads_data.csv` (Threads): 헤더 한 줄 + 데이터 행
  ```
  code,parent_code,like_count,username,text,created_at
  C65RuPBuov5,,38,ashley_winnn,Muscle Mommy 🪽,1715586331.810191
  C62a9tUMv4c,C6mKlDbP0cJ,37,iamclaudz,🤭🩶,1715586331.810203
  ```
  - `parent_code`가 비어 있으면 메인 글, 값이 있으면 그 코드의 답글.
- `created_at`은 ISO/UTC 타임스탬프가 아니라 **수집 시각의 `time.time()`** (Threads), Instagram도 동일. 게시물 자체의 작성 시각이 아님에 주의.
- 헤더가 코드에서 자동 출력되지 않음 — 샘플 CSV에 이미 헤더가 들어 있는 형태. (append 모드라서 신규 파일이면 헤더 없이 시작됨. 불명확: 헤더 자동 생성 로직 부재.)

## 6. 실행 흐름 (단계별)
**Instagram (`scrape_instagram.py`)**
1. `instagrapi.Client()` 생성 → `cl.login("username","password")` (하드코딩).
2. 로그인 실패(`PleaseWaitFewMinutes`) 시 30분 sleep 후 진행 (재시도 로직은 없고 그냥 진행해버림 — 사실상 실패).
3. `posts.txt` 로드 → `random.shuffle` → 앞 150개 슬라이스.
4. 각 코드에 대해 `media_pk_from_code → media_info` 호출, 예외별 처리.
5. 한 행씩 `data.csv`에 즉시 append, 1초 sleep.

**Threads (`scrape_threads.py`)**
1. `threads_feed.txt` 로드 → `random.shuffle` → 앞 50개 슬라이스.
2. 각 코드에 대해 Playwright Chromium으로 `threads.net/t/{code}` 방문.
3. `[data-pressable-container=true]` 렌더 대기 → 페이지 HTML에서 `script[data-sjs]` JSON 모두 수집.
4. 필터링·`nested_lookup`으로 `thread_items` 찾고 `jmespath`로 필드 추출.
5. 메인 글 1행 + 답글 N행을 `threads_data.csv`에 append.
6. 1-5초 랜덤 sleep.

## 7. 폴더 구조와 각 파일 역할
평면 구조, 8개 파일:
```
.
├── README.md                # 3줄짜리 quick start
├── requirements.txt         # 115개 의존성 (대부분 미사용으로 보임 — 불명확)
├── scrape_instagram.py      # Instagram 수집 (instagrapi 사용)
├── scrape_threads.py        # Threads 수집 (Playwright 사용)
├── posts.txt                # 입력: IG shortcode 114,650개
├── threads_feed.txt         # 입력: Threads shortcode 32,365개
├── data.csv                 # 출력: IG 결과 샘플
└── threads_data.csv         # 출력: Threads 결과 샘플
```
- 모듈 분리, 함수 분리, 설정 파일, 테스트 모두 **없음**.

## 8. 외부 의존성 (API, 로그인, 쿠키, 브라우저 자동화, RSS 등)
- **Instagram**:
  - `instagrapi`: Instagram private API 클라이언트. **계정 로그인 필수** (username/password). 챌린지·레이트리밋·차단 위험.
  - 별도 API 키·OAuth 없음. RSS·공식 API 미사용.
- **Threads**:
  - `playwright` (Chromium 헤드리스). 브라우저 바이너리 별도 설치 필요(`playwright install`).
  - **로그인 없음** — 비로그인 페이지 HTML의 임베드 JSON을 파싱. 단, Threads 측이 마크업/JSON 키(`ScheduledServerJS`, `thread_items`)를 바꾸면 즉시 깨짐.
  - `parsel`(CSS 셀렉터), `jmespath`(JSON 쿼리), `nested_lookup`(중첩 키 검색).
- **공통**: `requirements.txt`에 `instagrapi`, `instaloader`, `scrapy`, `selenium`, `playwright`, `scrapfly-sdk`, `myigbot` 등 **중복·미사용 패키지 다수**. 실제 import 되는 건 (`from instagrapi import Client`, `from playwright.sync_api ...`, `parsel`, `jmespath`, `nested_lookup`, 표준 라이브러리) 정도. 나머지는 미사용으로 보임 (불명확 — 전수 grep 미수행).
- **라이선스**: 파일 없음.

## 9. 그대로 쓰면 좋은 점
- Threads 비로그인 수집 패턴(`script[data-sjs]` JSON 파싱)이 **그대로 동작하는 참조 구현**으로 존재. 직접 리버스 엔지니어링 시간을 절약.
- 입력(shortcode 목록) → 출력(CSV) 인터페이스가 단순해서 어떤 큐/스케줄러와도 결합하기 쉬움.
- 샘플 입력·출력 데이터가 함께 들어 있어 동작 형식을 빠르게 확인 가능.

## 10. 그대로 쓰면 위험한 점
- **라이선스 없음** — 법적으로 그대로 포함하기 어려움. 패턴만 참고하고 재작성 필요.
- **자격증명 하드코딩** (`scrape_instagram.py:8`의 `cl.login("username","password")`). 환경변수·시크릿 관리 부재.
- **계정 위험**: Instagram 로그인 기반 수집은 ToS 위반 가능성·계정 정지·challenge 발생. GitHub Actions에서 매일 돌리면 IP 패턴·잦은 챌린지로 곧 차단될 위험.
- **취약한 파서**: Threads의 `"ScheduledServerJS"`/`"thread_items"` 키 의존. 마크업 변경 시 침묵 실패(except 후 다음으로 진행) 가능성.
- **요청 간격이 단순 `time.sleep`**: 지수 백오프·실패 로그·재시도 큐 없음. 차단 시 무한히 빈 CSV만 쌓일 수 있음.
- **출력 `created_at`이 게시물 작성 시각이 아니라 수집 시각**(`time.time()`). 다이제스트에서 "최신" 정렬에 그대로 쓸 수 없음.
- **헤더 자동 생성 없음** — append 모드라서 신규 파일은 헤더 누락 상태로 시작.
- **bloated requirements.txt** (115개) — CI 빌드 시간·취약점 표면 모두 증가.
- **`posts.txt` 출처 부재** — shortcode를 어디서 가져오는지에 대한 코드가 없어 "계정 → 최신 게시물 shortcode 목록 만들기" 단계가 별도로 필요. 우리 파이프라인 1단계의 절반만 커버.

## 11. 가져갈 만한 핵심 패턴 3~5개
1. **Threads 비로그인 임베드 JSON 파싱 레시피** (`scrape_threads.py:46-81`): Playwright 헤드리스 → `script[type="application/json"][data-sjs]` 텍스트 수집 → 필터 키워드(`ScheduledServerJS`, `thread_items`)로 후보 좁히기 → `nested_lookup`으로 키 추출 → `jmespath`로 필드 매핑. 이 4단계 조합 자체가 우리 Threads 수집기의 토대로 그대로 차용 가능.
2. **JMESPath로 깊은 JSON → 평탄한 dict 매핑** (`scrape_threads.py:14-35`). 스키마 변경에 대응하기 쉬움. 우리 수집기에서도 raw JSON → 정규화 모델 변환에 도입할 만함.
3. **`nested_lookup`으로 중첩 JSON에서 키로 검색**: 페이스북 계열 서비스(IG/Threads)의 hydration JSON처럼 트리 구조가 불안정한 데이터에 유용.
4. **append-only CSV로 즉시 영속화** + 매 행 후 sleep: 중간에 죽어도 데이터 유실이 적은 패턴. 우리 파이프라인에서도 raw 단계 출력은 append-only로.
5. **`random.shuffle` 후 슬라이스로 샘플링**: 매일 cron 돌릴 때 같은 순서로만 처리하다 차단되는 패턴을 피하는 데 유효 (단, 동일 코드를 재방문할 수 있으므로 중복 제거 보조 필요).

## 12. 버려도 되는 부분 3~5개
1. **Instagram 로그인 기반 수집(`scrape_instagram.py` 전체 흐름)** — 계정 위험·법적 위험·Actions 환경에서의 챌린지 처리 비용이 큼. IG는 별도 전략(공식 Basic Display API, 공개 RSS 우회, 또는 수동 시드만) 권장.
2. **`requirements.txt`의 미사용 패키지들** (`instaloader`, `scrapy`, `selenium`, `scrapfly-sdk`, `myigbot` 등). 실제 import만 추려서 lock 다시 만들 것.
3. **하드코딩된 자격증명·매직 넘버**(150, 50, 30분 sleep, 1-5초 sleep). 우리 코드에서는 환경변수·설정 파일로 분리.
4. **`posts.txt`·`threads_feed.txt` 같은 샘플 시드** 그대로 들고 오지 말 것. 우리는 계정 목록 → shortcode 추출 단계를 따로 짜야 함.
5. **평면 단일 파일 구조** — `collectors/threads.py`, `collectors/instagram.py`, `lib/playwright_session.py`, `lib/jmespath_schemas.py` 등으로 분리.

---

## 우리 파이프라인 관점 요약

- **즉시 차용 가치 높음**: Threads 비로그인 파싱 4단계 레시피.
- **재사용 불가**: Instagram 로그인 수집 전체.
- **다음에 채워야 할 빈 칸**:
  1. 계정 → 최신 게시물 shortcode 목록을 만드는 "피드 수집" 단계 (이 저장소엔 없음).
  2. 게시물 자체 작성 시각(`taken_at`)을 출력에 보존 (이 저장소는 수집 시각만 기록).
  3. 차단·실패 모니터링 (로그·메트릭).
