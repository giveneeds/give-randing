# youtube-tracker (thevops)

- 원본: https://github.com/thevops/youtube-tracker
- 분석일: 2026-05-13
- 후보 사유: 유튜브 채널 모니터링

> ✅ **MIT 라이선스**. 코드 그대로 차용 가능 (저작권 표기 유지 조건).

---

## 1. 한 줄 설명
유튜브 채널 RSS를 주기적으로 폴링해서 새 영상을 감지하고, 그 링크를 [Raindrop.io](https://raindrop.io) 북마크 컬렉션에 자동으로 추가하는 250줄짜리 TypeScript(Bun) 데몬.

## 2. 핵심 목적
- 다수 유튜브 채널의 **신규 업로드**를 탐지 (RSS 기반, **공식 YouTube API 키 없이도 동작**).
- 이전 실행 이후 추가된 영상만 골라내기 위해 **로컬 JSON 캐시**에 마지막 본 영상 ID 묶음을 저장.
- 탐지된 신규 영상을 **외부 시스템(Raindrop.io)에 푸시**.

## 3. 주요 기능 목록
- 채널 ID 목록을 YAML 설정 파일에서 읽음 (`config/production.yaml`).
- `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` 공식 RSS 엔드포인트를 `rss-parser`로 파싱.
- 캐시에 없는 `item.id`만 신규로 분류.
- **첫 실행 시에는 Raindrop에 추가하지 않고** 캐시만 채움 → 기존 영상이 전부 "신규"로 잡혀 도배되는 것 방지 (`src/index.ts:32-36`).
- 신규 영상을 Raindrop API로 컬렉션에 push.
- 캐시 파일을 JSON으로 영속화.
- `while(true)` + `setTimeout(frequency * 60 * 1000)`로 무한 폴링 (cron 대용).
- Docker 이미지 제공, `compose.yaml`로 `restart: unless-stopped` 데몬 운영.
- 로그 레벨 설정 가능 (`SimpleFMTLogger`).

## 4. 입력 데이터 형식
**설정 파일 (YAML)** — `config/production.yaml`:
```yaml
log_level: info
frequency: 30                          # minutes
raindrop_token: "..."
raindrop_collection_id: "..."
cache_file_path: "/data/cache.json"
feeds:
  - name: DevOpsToolkit
    channel_id: UCfz8x0lVzJpb_dgWm9kPVrw
  - name: Mateusz Chrobok
    channel_id: UCTTZqMWBvLsUYqYwKTdjvkw
```
- 채널 ID 찾는 법은 README에 명시: `curl -s https://www.youtube.com/@<handle> | grep -oP '(?<=/channel/)[\w-]+'`.
- 채널 핸들(`@DevOpsToolkit`) 대신 **채널 ID(UC로 시작)**가 필수.

**RSS 응답 (input from YouTube)** — 표준 Atom 1.0 형식. `rss-parser`가 자동 처리. 영상별 식별자는 `item.id` = `yt:video:<videoId>` 형태.

## 5. 출력 데이터 형식
**캐시 파일 (`/data/cache.json`)** — `CacheSchema`:
```json
{
  "feeds": {
    "UCfz8x0lVzJpb_dgWm9kPVrw": [
      "yt:video:PV1sBiC85Yc",
      "yt:video:0pG3txMPKJI"
    ]
  }
}
```
- 채널 ID를 key로, 마지막 실행에서 본 모든 영상 ID 배열을 value로.
- **매 실행마다 통째로 덮어씀** (피드의 현재 항목 전체로 교체).

**외부 출력 (Raindrop.io)** — `RaindropItem`:
```ts
{ link: video.link, collection: { $id: Number(collection_id) } }
```
- 이게 유일한 외부 부수효과. 다른 출력(파일, DB, 알림)은 없음.
- 로컬 표준출력엔 `logger.info("Adding video to Raindrop: ${video.link}")` 형태 로그만.

## 6. 실행 흐름 (단계별)
1. **부팅** (`src/config.ts`):
   - `process.argv[2]`로 받은 YAML 파일 읽음 → `Config` 객체로 export.
   - 필수 필드 6개 검증 (`validateConfig`) — 누락 시 즉시 throw.
   - `Raindrop` 클라이언트와 logger 초기화.
2. **루프** (`src/index.ts:63-72`, `runForever()`):
   1. `main()` 호출.
   2. `frequency` 분만큼 `await new Promise(setTimeout)`로 대기.
   3. 영원히 반복.
3. **한 사이클** (`main()`):
   1. `Cache.read()`로 `cache.json` 로드 (없으면 빈 객체 생성).
   2. 각 feed에 대해:
      - 캐시에 채널 키 없으면 `[]`로 초기화.
      - `getNewerYouTubeVideos(channel_id, cached_ids)`로 RSS 호출 → `[new_videos, new_cached_ids]` 반환.
      - 신규가 0건이면 skip.
      - **캐시가 비어 있던 채널은 Raindrop 푸시 생략**, 캐시만 채우고 continue.
      - 신규 영상마다 `raindropAPI.addItem` 호출, 성공/실패 로그.
      - 캐시의 해당 채널 키를 `new_cached_ids`로 교체.
   3. `Cache.write()`로 디스크에 저장.

## 7. 폴더 구조와 각 파일 역할
```
.
├── Dockerfile               # bun:1.1.4-alpine + dumb-init, USER bun, ENTRYPOINT dumb-init
├── LICENSE                  # MIT
├── README.md                # 117줄, 채널 ID 추출 트릭 포함
├── Taskfile.yml             # 빌드 작업 정의 (분석 미상세, 불명확)
├── bun.lockb                # bun lockfile
├── compose.yaml             # 16줄, app 서비스 1개 / config & data 볼륨 마운트
├── config/_template.yaml    # 설정 템플릿
├── docs/raindrop.md         # Raindrop 토큰/컬렉션 ID 찾는 가이드 (외부 도구 가이드)
├── package.json             # 의존성 4개 (js-yaml, raindrop-api, rss-parser, simple-fmt-logger)
├── tsconfig.json            # TS 설정 (분석 미상세, 불명확)
└── src/
    ├── index.ts             # 74줄, main() + runForever()
    ├── youtube.ts           # 84줄, getNewerYouTubeVideos() + import.meta.main 테스트 블록
    ├── cache.ts             # 47줄, Cache 클래스 (read/write, JSON 파일)
    └── config.ts            # 50줄, YAML 로드 + 검증 + 로거/Raindrop 클라이언트 export
```
- 총 4개 TS 파일, 약 255줄. 매우 작고 깔끔한 구조.
- 의존성 4개 중 2개(`raindrop-api`, `simple-fmt-logger`)는 작성자 본인의 GitHub 패키지.

## 8. 외부 의존성 (API, 로그인, 쿠키, 브라우저 자동화, RSS 등)
- **YouTube**: 공식 RSS 엔드포인트 `youtube.com/feeds/videos.xml?channel_id=<ID>`. **API 키 불필요, 로그인 불필요, 쿠키 불필요.** 다만 **최근 ~15개 영상만 노출** (YouTube RSS의 알려진 제약, 코드에 명시는 없음).
- **Raindrop.io**: 북마크 SaaS. 개인 API 토큰(`raindrop_token`)과 컬렉션 ID 필요. 무료 플랜으로도 사용 가능.
- **런타임**: Bun (Node.js 호환). `setTimeout`, `fs` 표준 라이브러리 외 OS 의존 없음.
- **컨테이너**: Docker, docker compose. `oven/bun:1.1.4-alpine` 베이스.
- **브라우저 자동화·OAuth·CSRF 토큰** 등은 **없음**. 인스타 스크래퍼와 정반대로 매우 깨끗.

## 9. 그대로 쓰면 좋은 점
- **인증·차단 위험이 사실상 없음**. YouTube RSS는 공식이고, 채널 ID만 있으면 누구나 호출 가능.
- **코드가 짧고(255줄) 모듈이 깔끔**. main 로직, 캐시, RSS 파싱, 설정이 1파일씩 분리.
- **MIT 라이선스** → 그대로 fork·차용 합법.
- **"첫 실행에서 도배 방지" 로직**이 명시적으로 구현되어 있어 production-ready (`src/index.ts:32-36`).
- **Bun + 단일 Docker 이미지**로 배포 단순. compose `restart: unless-stopped`로 데몬 운영도 즉시 가능.

## 10. 그대로 쓰면 위험한 점
- **YouTube RSS는 최근 15개 영상만 반환** (잘 알려진 제약). 하루 16개 이상 올라오는 채널이거나, 폴링 주기가 너무 길어서 그 사이 15개 넘게 올라오면 누락 가능. (이 저장소는 이 제약을 코드/문서에 명시하지 않음 — 불명확이 아니라 누락.)
- **`runForever()` + `while(true)` 모델은 GitHub Actions cron과 맞지 않음**. Actions 환경에서 쓰려면 `runForever()` 빼고 `main()` 한 번만 실행하는 1-shot 모드로 바꿔야 함.
- **캐시가 로컬 파일**(`/data/cache.json`) → Actions에서 매 실행마다 컨테이너 새로 뜨므로 **캐시 휘발**. Actions 쓰려면 Artifacts나 Git commit, 또는 Supabase 같은 원격 저장소로 캐시 대체 필요.
- **"신규" 판단이 캐시에 의존**. 캐시 손실 = 첫 실행 모드로 돌아감 = 그 회차 신규 발행 누락 (도배 방지 로직이 첫 실행에선 push를 안 하므로). 캐시 백업 전략 필수.
- **Raindrop.io에 강하게 결합**. 우리는 Raindrop을 안 씀 → `index.ts`의 push 부분을 통째로 갈아엎어야 함 (다행히 50줄 안짝이라 부담은 작음).
- **에러 핸들링이 거의 없음**: RSS fetch 실패, Raindrop 4xx/5xx, 네트워크 타임아웃에 대한 재시도·백오프 없음. 무한 루프 안에서 한 번 throw하면 컨테이너가 죽고 docker가 재시작하는 방식에 의존.
- **`item.id` 필드 없을 때 `false`로 필터해버림** (`src/youtube.ts:23`). 영상이 누락될 수도 있음. (RSS 표준상 거의 항상 있지만 방어 코드가 silent skip이라 추적이 어려움.)

## 11. 가져갈 만한 핵심 패턴 3~5개
1. **유튜브 RSS 그 자체** — `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` 패턴은 우리 파이프라인의 유튜브 수집기 **그대로 채택**. 비공식 API 고민할 필요 없음.
2. **"첫 실행 도배 방지" 가드** (`src/index.ts:32-36`): 캐시가 비어 있던 채널은 신규 푸시 생략하고 캐시만 채움. 우리 다이제스트 발송에서 신규 계정 등록 직후 한 번에 50개씩 메일 가는 사고 방지에 그대로 적용 가능.
3. **YAML 설정 + 필수 필드 강제 검증** (`src/config.ts:22-37`): 환경변수만 쓰지 말고 채널 목록 같은 정적 데이터는 YAML로 관리, 부팅 시 필수 필드 누락이면 즉시 throw. 콘텐츠 자동화 같이 입력 데이터가 자주 변하는 시스템에 적합.
4. **JSON 파일 캐시 어댑터로 분리** (`src/cache.ts`): `Cache` 클래스가 read/write 인터페이스만 노출 → 추후 Supabase Storage·KV·Redis로 교체하기 쉬움. 우리도 이 인터페이스를 그대로 가져가고 백엔드만 갈아끼면 됨.
5. **채널 ID 추출 one-liner** (README 47번 줄): `curl + grep -oP '(?<=/channel/)[\w-]+'`. 어드민 UI에서 사용자가 채널 URL만 붙여넣어도 ID 추출하는 보조 도구로 활용 가능.

## 12. 버려도 되는 부분 3~5개
1. **`runForever()` + `while(true)` 데몬 모델** — GitHub Actions cron으로 가기로 했으니 1-shot으로 단순화. `main()`만 export.
2. **Raindrop.io 통합 전체** (`src/index.ts:42-56`, `src/config.ts`의 Raindrop 부분) — 우리는 외부 북마크 서비스가 아니라 자체 DB(Supabase) 또는 다이제스트 큐로 push해야 함.
3. **로컬 파일 캐시 백엔드** (`src/cache.ts`의 `fs.readFile`/`writeFile`) — Actions 휘발성 환경에서 못 씀. 인터페이스는 유지하되 구현은 Supabase Table(`processed_videos` 같은)로 교체.
4. **Docker compose `restart: unless-stopped`** — 1-shot Actions 모드면 불필요. 다만 로컬 개발용으로는 남겨둘 수 있음.
5. **`simple-fmt-logger`** (작성자 본인의 마이너 패키지) — 우리 코드에 이미 쓰는 로거가 있거나 `console` + `pino` 정도면 충분. 의존성 1개 줄이기.

---

## 우리 파이프라인 관점 요약

- **즉시 차용**: 유튜브 RSS 엔드포인트 + 첫 실행 도배 방지 가드 + YAML 설정 강제 검증 + 캐시 어댑터 패턴.
- **버전 변경 필요**: 데몬 → cron 1-shot, 로컬 파일 캐시 → 원격 저장소, Raindrop → 다이제스트 큐/Supabase.
- **이 저장소가 채워주는 빈 칸**: 저장소 01에 없던 **"채널/계정 → 신규 항목만 골라내는 incremental 수집" 패턴**과 **"외부 시스템에 push하는 어댑터 분리" 패턴**이 깔끔하게 시연되어 있음.
- **유튜브는 사실상 답 나옴**: 별도 후보를 더 찾을 필요 없음. 다음은 트위터/뉴스레터/오케스트레이션 쪽이 자연스러움.
