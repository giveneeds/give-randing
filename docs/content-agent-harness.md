# Giveneeds Content Agent Harness

본 문서는 기브니즈 콘텐츠 반자동화 에이전트의 운영 하네스다. 목표는 "수집-필터링-기획-생성-검수" 흐름을 반복 실행하면서, 실패를 모델 탓으로 뭉뚱그리지 않고 특정 레이어에 귀속해 다음 실행에서 같은 실수를 줄이는 것이다.

참조 관점: Harness Engineering의 핵심은 모델 외부의 작업 명세, 컨텍스트, 실행 환경, 검증 피드백, 상태 관리를 갖추는 것이다. 실패는 모델 교체 전에 하네스 레이어별로 진단한다.

## 목표

기브니즈를 알릴 수 있는 마케팅 콘텐츠를 매일 반자동으로 발굴하고, 요식업/병의원 사장님에게 실용적인 매거진 초안과 리드마그넷 후보로 전환한다.

운영 원칙:
- 자동 발행은 하지 않는다. 최종 발행은 사람이 검수한다.
- 수집보다 중요한 것은 "왜 이 콘텐츠가 기브니즈 고객에게 의미 있는가"를 선명하게 만드는 것이다.
- 매 실행은 로그를 남기고, 실패는 원인 레이어를 기록한다.
- 산출물 품질 기준은 실행 결과를 보며 계속 업데이트한다.

## 현재 워크플로우

```text
agent_sources
  -> runCollection()
  -> enrichItem()
  -> agent_items / agent_ai_logs
  -> sendItemCards()
  -> Telegram approval card
  -> convertItemToMagazineDraft()
  -> magazines(status=draft) / content_resources(is_enabled=false)
  -> Admin editor human review
  -> publish manually
```

## 단계별 역할

### 1. 수집

구현:
- `lib/agent/runCollection.js`
- `app/api/cron/collect/route.js`
- `app/api/admin/content-studio/collect/route.js`

입력:
- `agent_sources`
- 현재 소스 타입: `naver_news`, `google_news`, `hackernews`

중간 산출물:
- `agent_jobs`
- `agent_items.normalized`
- `agent_items.raw_data`

완료 기준:
- cron/manual 실행이 `agent_jobs.status`에 기록된다.
- fresh item만 `agent_items`에 들어간다.
- 중복은 `(source, post_id)`로 차단된다.
- `stats.collected`, `stats.skipped`, `stats.failed`가 실행 결과에 남는다.

### 2. 필터링

구현:
- `lib/llm.js`의 `enrichItem()`
- `lib/agent/sendDailyDigest.js`의 `sendItemCards()`

현재 필터:
- `fit_score < 0.3`이면 텔레그램 발송 스킵
- `notified_at IS NULL`인 collected item만 발송

중간 산출물:
- `agent_items.classification.fit_score`
- `agent_items.classification.relevance_reason`
- `dispatch.skipped_low_fit`

개선 예정:
- fit score만 보지 않고 `target_persona`, `content_angle_strength`, `source_quality`, `timeliness`를 분리한다.
- "기브니즈가 이 콘텐츠로 무엇을 말할 수 있는가" 점수를 별도로 둔다.

### 3. 기획

구현:
- 현재는 `enrichItem()`의 `brief`가 기획 단계 역할을 한다.

중간 산출물:
- `target_persona`
- `topic_cluster`
- `content_angles`
- `recommended_title`
- `lead_magnet_idea`
- `relevance_reason`

중요한 구분:
- `brief`는 기획 산출물이다.
- `convertItemToMagazineDraft()`는 기획이 아니라 생성 단계다. 이미 나온 brief를 바탕으로 글 초안을 만든다.

현재 문제:
- 리드마그넷 후보가 "체크리스트 PDF"에 치우친다.

원인 레이어 추정:
- 작업 명세 레이어: lead magnet 타입의 선택지가 좁게 제시되어 있다.
- 컨텍스트 레이어: 기브니즈가 실제로 제공하고 싶은 자료 형식과 업로드/배포 운영 방식이 충분히 명시되어 있지 않다.
- 검증 레이어: lead magnet 후보의 다양성/실행 가능성을 채점하는 기준이 없다.

개선 예정:
- lead magnet 타입 enum을 둔다.
- 예: checklist, worksheet, template, calculator, audit_sheet, script_pack, calendar, benchmark_table, briefing_doc
- 각 타입에 "언제 적합한지"와 "필수 구성요소"를 정의한다.

### 4. 생성

구현:
- `lib/agent/convertItemToDraft.js`
- `app/api/webhook/telegram/route.js`

트리거:
- 텔레그램 카드에서 승인 버튼 클릭

중간 산출물:
- `magazines.status = draft`
- `magazines.content_html`
- `content_resources.is_enabled = false`

완료 기준:
- 승인된 item이 draft로 변환된다.
- 실패 시 `agent_items.status`는 `approved`로 유지된다.
- draft URL이 텔레그램 메시지에 표시된다.

개선 예정:
- draft 생성 결과의 품질 평가 로그를 남긴다.
- 제목/도입/본문/결론/출처/실행 체크포인트 유무를 검증한다.

### 5. 검수

구현:
- 텔레그램 승인/반려 버튼
- `/admin/content-studio`
- `/admin/magazines/editor`

현재 검수:
- 카드 단위 승인/반려
- 승인 시 draft 생성
- 작가가 admin editor에서 수동 수정 후 발행

개선 예정:
- 텔레그램 카드에 "왜 보냈는지"와 "예상 산출물"을 더 선명히 표시한다.
- 반려 사유를 수집한다.
- draft 생성 후 사람이 수정한 내용을 다음 prompt 개선에 반영할 수 있게 한다.

## 실패 레이어 분류

실패가 발생하면 아래 중 하나로 기록한다.

1. 작업 명세
   - 무엇을 만들지, 좋은 결과가 무엇인지 불명확한 문제
2. 컨텍스트 제공
   - 브랜드/고객/운영 규칙/예시가 부족한 문제
3. 실행 환경
   - 환경변수, 배포, API 토큰, 외부 서비스 연결 문제
4. 검증 피드백
   - 성공/실패를 판단할 로그와 기준이 부족한 문제
5. 상태 관리
   - 이전 실행 결과, 결정, 실패 원인이 다음 실행에 남지 않는 문제

## 오늘의 Definition of Done

2026-05-19 기준 1차 목표:
- GitHub Actions cron이 운영 API를 호출한다.
- 새 콘텐츠가 수집되면 텔레그램으로 카드가 도착한다.
- `dispatch`에 발송 시도/성공/실패/스킵 원인이 남는다.
- 승인하면 매거진 draft가 생성된다.
- 오늘 발견한 실패가 `docs/content-agent-diagnostic-log.md`에 기록된다.

## 다음 개선 후보

- lead magnet 다양성 prompt 개선
- brief 품질 평가 rubric 추가
- draft 품질 평가 rubric 추가
- 반려 사유 수집
- 어드민에서 item -> draft 생성 결과 연결 표시
- agent_items에 `draft_magazine_id` 또는 별도 매핑 테이블 추가
- 매일 실행 결과 요약을 Telegram 또는 admin dashboard에 표시
