# Giveneeds Content Agent Harness

본 문서는 기브니즈 콘텐츠 반자동화 에이전트의 운영 하네스다. 목표는 "수집-필터링-기획-생성-검수" 흐름을 반복 실행하면서, 실패를 모델 탓으로 뭉뚱그리지 않고 특정 레이어에 귀속해 다음 실행에서 같은 실수를 줄이는 것이다.

참조 관점: Harness Engineering의 핵심은 모델 외부의 작업 명세, 컨텍스트, 실행 환경, 검증 피드백, 상태 관리를 갖추는 것이다. 실패는 모델 교체 전에 하네스 레이어별로 진단한다.

## 목표

기브니즈를 알릴 수 있는 마케팅 콘텐츠를 매일 반자동으로 발굴하고, 요식업/병의원 사장님에게 실용적인 매거진 초안과 리드마그넷 후보로 전환한다.

핵심 독자 문제:
- 지금 마케팅을 하고 있지만 효과가 안 나와 방법을 바꿔야 하나 고민한다.
- 마케팅을 어떻게 시작해야 할지 몰라 손을 못 대고 있다.
- 고객 유입이 부족하고, 자기 업체의 강점이 콘텐츠로 잘 드러나지 않는다.
- 광고/콘텐츠/플레이스 운영은 하고 있지만 효율이 나오지 않는다.

콘텐츠 방향:
- 요식업/병의원을 엄격히 나누기보다 "고객 유입과 신뢰 형성"이라는 공통 문제를 중심에 둔다.
- 병의원은 전문성 있는 정보로 신뢰와 상담 전환을 만드는 비중이 높다.
- 요식업은 신뢰뿐 아니라 친근함, 가벼운 실행, 재방문 설계가 중요하다.
- 너무 전문가 관점으로 쓰지 않고, 독자가 "내 업체에 바로 녹일 수 있겠다"고 느껴야 한다.
- 일반론도 가능하지만 타깃과 적용 장면이 명확해야 한다.
- 리드마그넷은 실제 도움이 될 때만 제안한다. 필요 없다면 만들지 않는다.

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
- `business_contexts`
- `topic_cluster`
- `signal_type`
- `reader_problem`
- `why_now`
- `content_angles`
- `content_angle`
- `practical_takeaway`
- `execution_steps`
- `tone_direction`
- `recommended_title`
- `lead_magnet`
- `lead_magnet_idea`
- `relevance_reason`
- `approval_reason`
- `risk_flags`

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

현재 lead magnet 타입:
- `guidebook`: 방법론을 단계별로 익히는 자료
- `template`: 바로 복사/수정해서 쓰는 양식
- `audit_sheet`: 내 업체 상태를 점검하는 표
- `calculator`: 광고비/전환/객단가 등을 계산하는 도구
- `script_pack`: 상담/리뷰/DM/전화 응대 스크립트 묶음
- `calendar`: 콘텐츠/프로모션 운영 일정표
- `benchmark_table`: 경쟁 업체나 사례 비교표
- `case_study`: 내 업종에 적용 가능한 사례 해설
- `none`: 억지로 만들 필요 없음

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
