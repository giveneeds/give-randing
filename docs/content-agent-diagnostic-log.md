# Content Agent Diagnostic Log

이 문서는 콘텐츠 에이전트 실행 중 발생한 실패와 개선 결정을 기록한다. 모든 실패는 하네스 레이어에 귀속한다.

레이어:
- 작업 명세
- 컨텍스트 제공
- 실행 환경
- 검증 피드백
- 상태 관리

## 2026-05-19

### GitHub Actions가 매일 실패

증상:
- `Daily Content Collection` workflow가 매일 실행되지만 실패했다.
- 로그에 `PRODUCTION_URL Variable 미설정`이 출력됐다.

레이어:
- 실행 환경

원인:
- GitHub Actions repository variable `PRODUCTION_URL`이 없었다.

조치:
- GitHub repository variable에 `PRODUCTION_URL=https://www.giveneeds.co.kr` 추가.

검증:
- 이후 workflow가 `HTTP 200`으로 운영 `/api/cron/collect` 호출에 성공했다.

재발 방지:
- workflow 로그에서 `HTTP_CODE`, response body를 항상 출력한다.
- 필수 운영 변수 목록을 하네스 문서에 유지한다.

### 수집은 됐지만 텔레그램 카드가 오지 않음

증상:
- `stats.collected`와 `stats.enriched`는 증가했다.
- `dispatch.sent_items`는 0이었다.
- 최초 응답에는 발송 실패 이유가 없었다.

레이어:
- 검증 피드백
- 실행 환경

원인:
- `sendItemCards()`가 Telegram API 실패를 `console.error`로만 남기고 응답 JSON에 포함하지 않았다.
- 이후 로그 보강 결과 `TELEGRAM_BOT_TOKEN 미설정`이 확인됐다.

조치:
- `dispatch`에 `attempted_items`, `failed_items`, `telegram_errors`를 반환하도록 수정.
- Vercel Production 환경변수에 `TELEGRAM_BOT_TOKEN` 추가 후 redeploy.

검증:
- 운영 cron 직접 호출 결과:

```json
{
  "stats": {
    "collected": 3,
    "failed": 0,
    "skipped": 14,
    "enriched": 3
  },
  "dispatch": {
    "sent_items": 2,
    "recipients": 1,
    "attempted_items": 2,
    "failed_items": 0,
    "skipped_low_fit": 1
  }
}
```

재발 방지:
- 외부 API 호출 실패는 사용자에게 보이는 실행 응답에 최소 요약을 포함한다.
- `sent_items=0`이면 반드시 `skipped_reason` 또는 `telegram_errors`가 있어야 한다.

### 리드마그넷 후보가 체크리스트 PDF로 치우침

증상:
- LLM enrich 결과의 `lead_magnet_idea`가 대부분 체크리스트/PDF 형식으로 나온다.

레이어:
- 작업 명세
- 컨텍스트 제공
- 검증 피드백

원인 추정:
- 현재 prompt가 "체크리스트/PDF/템플릿 등"이라고 예시를 주지만, 타입 선택 기준과 다양성 기준이 없다.
- 기브니즈가 실제로 제공하고 싶은 lead magnet 포맷이 시스템에 명시되어 있지 않다.
- 생성된 lead magnet 후보를 평가하는 rubric이 없다.

조치 예정:
- lead magnet type enum을 정의한다.
- 각 type별 사용 조건과 필수 구성요소를 prompt에 넣는다.
- brief 결과에 `lead_magnet_type`, `lead_magnet_title`, `lead_magnet_sections`, `why_this_magnet`을 추가한다.

2026-05-19 조치:
- `enrichItem()` 브리프 스키마를 v2로 확장했다.
- `lead_magnet` 객체에 `type`, `title`, `why_this_magnet`, `sections`, `required_inputs`, `conversion_goal`을 추가했다.
- `lead_magnet_idea`는 하위 호환을 위해 title 문자열로 유지한다.
- 리드마그넷이 필요 없으면 `lead_magnet=null`로 둘 수 있게 prompt에 명시했다.

### 브리프가 적용 장면보다 기사 요약에 가까움

증상:
- 기존 브리프는 `content_angles`, `recommended_title`, `lead_magnet_idea` 중심이라 사람이 승인할 때 "내 고객에게 왜 중요한가"를 빠르게 판단하기 어렵다.

레이어:
- 작업 명세
- 컨텍스트 제공
- 검증 피드백

원인:
- 좋은 기획 브리프의 기준이 구조화되어 있지 않았다.
- 독자 문제, 왜 지금 중요한지, 바로 적용 포인트가 별도 필드로 존재하지 않았다.

사용자 기준:
- 타깃은 요식업/병의원으로 나뉘지만 핵심은 고객 유입과 신뢰 형성이다.
- 병의원은 전문성/신뢰/상담 전환, 요식업은 친근함/가벼운 실행/재방문 설계가 상대적으로 중요하다.
- 독자가 읽고 지금 혹은 나중에 내 업체에 적용해볼 수 있어야 한다.
- 실제 케이스스터디, 구체적 방법, 툴, 가이드북이 좋다.
- 일반론도 가능하지만 타깃과 적용 장면이 명확해야 한다.

조치:
- 브리프 v2에 `reader_problem`, `why_now`, `signal_type`, `content_angle`, `practical_takeaway`, `execution_steps`, `tone_direction`, `approval_reason`, `risk_flags`를 추가했다.
- 텔레그램 카드에서 기획 판단과 바로 적용 포인트가 보이도록 수정했다.

검증 예정:
- 다음 cron/manual 수집 후 텔레그램 카드에서 위 필드가 실제로 사람이 승인 판단에 도움이 되는지 확인한다.

검증 예정:
- 최근 수집 item 10개 기준 lead magnet type 분포를 확인한다.
- 동일 타입이 60%를 넘으면 prompt를 재조정한다.

### Threads 글 형식 판단 기준이 없음

증상:
- 스레드용 콘텐츠를 만들 때 단일 게시글과 연결 게시글을 구분하는 기준이 없었다.
- 검색 결과 카드만 보고 반응 패턴을 판단하면 실제 상세 게시글의 연결 구조를 놓칠 수 있다.
- 글을 길게 쪼개는 것과 Threads 연결글을 설계하는 것이 혼동될 수 있다.

레이어:
- 작업 명세
- 컨텍스트 제공
- 상태 관리

원인:
- 매거진 draft 생성 중심으로 먼저 구현되어 Threads 채널 고유의 글 형식이 별도 산출물로 정의되지 않았다.
- 레퍼런스 관찰값을 저장하는 스키마가 없어 좋은 게시글을 봐도 다음 생성 로직에 반영하기 어려웠다.

조치:
- `docs/threads-content-pattern-harness.md`를 추가했다.
- 단일글, 짧은 연결글, 리소스형 연결글, 메가스레드의 선택 기준을 정의했다.
- 레퍼런스 게시글을 기록할 JSON 스키마와 생성 결과 스키마를 정의했다.

검증 예정:
- Threads 레퍼런스 20~30개를 같은 스키마로 기록한다.
- 이후 스레드 초안 생성 레이어가 `format_type`, `why_this_format`, `posts[]`를 안정적으로 출력하는지 확인한다.

### 해외 시장 신호 수집원이 없음

증상:
- 네이버/구글 뉴스는 트렌드 확인에는 좋지만, 실제 작은 사업자와 마케터가 어떤 말로 고민하는지 충분히 보여주지 못한다.
- Threads API 권한이 준비되기 전에는 자동 검색 수집이 어렵다.
- 콘텐츠 기획이 국내 뉴스 1건 요약으로 흐르면 사장님 페인포인트와 실행 사례가 약해질 수 있다.

레이어:
- 컨텍스트 제공
- 실행 환경
- 상태 관리

원인:
- 기존 collector는 `naver_news`, `google_news`, `hackernews` 중심이었다.
- Reddit처럼 권한 없이 공개 RSS로 읽을 수 있는 시장 신호 수집원이 연결되어 있지 않았다.

조치:
- Reddit 공개 RSS collector를 추가했다.
- `reddit` source type을 수집 오케스트레이터와 어드민 소스 등록 UI에 연결했다.
- 사용 목적은 해외 소상공인/마케터의 AI 활용, 마케팅 실행, 고객 유입, 운영 개선 신호를 가져와 한국 자영업자/브랜드용 콘텐츠 기획에 변환하는 것으로 정의했다.
- RSS만으로는 인기 판단이 약하므로 Reddit 공개 JSON 수집 경로를 추가했다.
- `score`, `num_comments`, `upvote_ratio`, `num_crossposts`를 바탕으로 `market_signal_score`를 계산하고, 소스별 `meta`에서 최소 기준을 설정할 수 있게 했다.

검증:
- `smallbusiness` subreddit RSS를 실제 호출해 title/text/post_url 파싱이 되는지 확인했다.
- 변경 파일 범위의 ESLint를 통과했다.
- `smallbusiness:AI marketing` 검색 JSON 호출에서 metrics와 `market_signal_score`가 저장되는지 확인한다.

재발 방지:
- 새 시장 조사 소스는 바로 콘텐츠로 쓰지 않고 `market_signal -> reader_pain -> giveneeds_topic -> threads_format` 단계로 변환한다.
- 인기 기준은 고정값으로 숨기지 않고 `agent_sources.meta`에 남겨 다음 실행에서 왜 이 소스가 들어왔는지 추적한다.

## 반복 운영 규칙

새 실패가 나오면 아래 형식으로 추가한다.

```text
### 짧은 제목

증상:
- 무엇이 보였는가

레이어:
- 작업 명세 / 컨텍스트 제공 / 실행 환경 / 검증 피드백 / 상태 관리

원인:
- 확인된 원인 또는 가장 강한 가설

조치:
- 실제 변경한 것

검증:
- 성공 여부를 확인한 방법

재발 방지:
- 다음 실행에서 같은 실패를 막는 장치
```
