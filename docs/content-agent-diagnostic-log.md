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
