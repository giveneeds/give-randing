# Giveneeds Content Agent Harness

본 문서는 기브니즈 콘텐츠 반자동화 에이전트의 운영 하네스다. 목표는 "수집-필터링-기획-생성-검수" 흐름을 반복 실행하면서, 실패를 모델 탓으로 뭉뚱그리지 않고 특정 레이어에 귀속해 다음 실행에서 같은 실수를 줄이는 것이다.

참조 관점: Harness Engineering의 핵심은 모델 외부의 작업 명세, 컨텍스트, 실행 환경, 검증 피드백, 상태 관리를 갖추는 것이다. 실패는 모델 교체 전에 하네스 레이어별로 진단한다.

## 목표

기브니즈를 알릴 수 있는 마케팅 콘텐츠를 매일 반자동으로 발굴하고, 요식업/병의원 사장님에게 실용적인 Threads 초안, 매거진 초안, 리드마그넷 후보로 전환한다.

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
  -> composeDailyReport() + Reddit/X 해외 주제 후보
  -> Telegram 자유 텍스트 선택
  -> runDeepResearch() / runSupplementalResearch() / runToneResearch or Threads audit
  -> convertItemToThreadDraft()
  -> 7개 thread_drafts 저장 + 품질 검수 기록
  -> Admin 보관함 human review
  -> publish manually
```

2026-05-19 운영 우선순위:
- 매거진 draft 자동 생성은 구현되어 있지만, 오늘의 1차 실험 채널은 Threads다.
- Threads는 단일글과 연결글의 구조가 다르므로 별도 패턴 하네스를 둔다.
- 참조 문서: `docs/threads-content-pattern-harness.md`와 `docs/content-logic/threads/*.md`
- 리서치 흐름은 `docs/content-logic/threads/10-research-layers.md`를 기준으로 본다.

## 단계별 역할

### 1. 수집

구현:
- `lib/agent/runCollection.js`
- `app/api/cron/collect/route.js`
- `app/api/admin/content-studio/collect/route.js`

입력:
- `agent_sources`
- 현재 소스 타입: `naver_news`, `google_news`, `hackernews`, `reddit`, `reddit_search`, `x_search`

Reddit source identifier 예시:
- `smallbusiness`: `r/smallbusiness` 최신 글
- `restaurateur`: 식당 운영자 커뮤니티 최신 글
- `smallbusiness:AI marketing`: 특정 subreddit 안에서 검색
- `all:restaurant marketing`: Reddit 전체 검색 RSS
- 용도: 해외 소상공인/마케터의 AI 활용, 마케팅 실행, 고객 유입, 운영 개선 신호를 한국 자영업자/브랜드 콘텐츠 기획에 변환한다.

Reddit 인기 신호 수집 기준:
- 기본 RSS는 점수/댓글 수를 안정적으로 주지 않으므로, 인기 기준이 필요하면 `meta.format = "json"`을 사용한다.
- `sort`: `top`, `hot`, `new`, `comments`, `relevance`
- `time`: `day`, `week`, `month`, `year`, `all`
- `min_score`: 최소 추천 점수
- `min_comments`: 최소 댓글 수
- `min_upvote_ratio`: 최소 긍정 비율
- `min_market_signal_score`: 내부 시장 신호 점수 하한
- `score_weights`: 내부 시장 신호 점수 가중치. 기본값은 `score=1`, `comments=3`, `upvote_ratio=10`, `crossposts=2`

Reddit meta 예시:

```json
{
  "format": "json",
  "sort": "top",
  "time": "month",
  "max": 10,
  "daily_limit": 3,
  "min_score": 2,
  "min_comments": 1,
  "min_market_signal_score": 10,
  "purpose": "ai_marketing_market_signal"
}
```

운영 해석:
- 레딧은 한국 자영업자에게 그대로 보여줄 출처가 아니라, 해외 소상공인/마케터가 이미 겪는 고민과 해결 실험을 찾는 시장 신호 수집원이다.
- 점수가 낮아도 댓글이 많으면 페인포인트가 강한 글일 수 있으므로, 댓글 가중치를 기본적으로 추천 점수보다 높게 둔다.
- 수집 결과는 곧바로 발행하지 않고, 기브니즈 지식베이스와 한국 플레이스/광고/콘텐츠 맥락에 맞게 재해석한다.

X/Reddit 해외 주제 발굴:
- 뉴스 후보가 많아질 때도 1차 텔레그램 제안에는 Reddit 후보 1개, X 후보 1개를 해외 주제 후보로 추가 시도한다.
- 이 후보들은 "말투 샘플"이 아니라 해외 마케팅/AI 커뮤니티와 실무자들이 이미 올려둔 주제, 도구 활용, 이슈, 논쟁, 캠페인 사례를 찾는 소스다.
- 좋은 후보는 "해외에서는 이런 식으로 쓰고 있다", "요즘 이 이슈가 올라온다", "한국어로 보기 좋게 정리하면 쓸모 있다"는 식으로 기브니즈 관점에서 재해석할 수 있어야 한다.
- source type은 `reddit_search`, `x_search`로 저장한다.

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
- `lib/agent/convertItemToThreadDraft.js`
- `lib/agent/finishPlanningSession.js`
- `app/api/webhook/telegram/route.js`

트리거:
- 텔레그램 1차 보고에서 자유 텍스트로 후보 선택

중간 산출물:
- `thread_drafts.status = draft`
- `thread_drafts.posts`
- `thread_drafts.research_context_used.variant_review`

완료 기준:
- 선택된 item이 7개 후보 드래프트로 변환된다.
- 후보별 기둥, treatment, FOMO, 설명 방식, 분량 판단, 품질 검수 기록이 남는다.
- 대표 draft URL과 후보별 URL이 텔레그램 메시지에 표시된다.

개선 예정:
- draft 생성 결과의 품질 평가 로그를 남긴다.
- 제목/도입/본문/결론/출처/실행 체크포인트 유무를 검증한다.
- Threads 전용 초안 생성 레이어를 추가한다.
- Threads 초안은 단일 문자열이 아니라 `format_type`, `why_this_format`, `posts[]` 구조로 만든다.
- Telegram 검수 카드에서 "왜 이 소재가 스레드용인지", "단일글/연결글 중 무엇이 맞는지"를 보여준다.

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

- Threads 레퍼런스 패턴 데이터셋 구축
- Threads 전용 초안 생성/검수 카드 추가
- lead magnet 다양성 prompt 개선
- brief 품질 평가 rubric 추가
- draft 품질 평가 rubric 추가
- 반려 사유 수집
- 어드민에서 item -> draft 생성 결과 연결 표시
- agent_items에 `draft_magazine_id` 또는 별도 매핑 테이블 추가
- 매일 실행 결과 요약을 Telegram 또는 admin dashboard에 표시
