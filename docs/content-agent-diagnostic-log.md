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

검증 예정:
- 최근 수집 item 10개 기준 lead magnet type 분포를 확인한다.
- 동일 타입이 60%를 넘으면 prompt를 재조정한다.

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
