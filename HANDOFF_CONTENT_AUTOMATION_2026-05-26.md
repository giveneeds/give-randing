# 콘텐츠 자동화 개편 Handoff - 2026-05-26

이 문서는 Claude Code 또는 다른 에이전트가 현재 콘텐츠 자동화 개편 맥락을 놓치지 않고 이어받기 위한 작업 인계서다. 기존 `HANDOFF_GUIDE.md`는 프로젝트 전체 가이드이고, 이 파일은 콘텐츠 스튜디오/텔레그램/Threads benchmark/원고 품질 개편 전용이다.

## 1. 현재 목표

콘텐츠 자동 발행 시스템을 다음 방향으로 개편한다.

- 텔레그램에서 리서치 기반 주제 후보를 받고, 사용자가 하나 또는 여러 개를 선택한다.
- 콘텐츠 기둥은 사용자가 직접 고르지 않는다. 에이전트가 후보별로 내부 전략 레인을 점수화해서 선택하고, 텔레그램과 어드민에 선택 이유를 보여준다.
- 선택된 주제별로 여러 개의 글 변주가 생성되고, 콘텐츠 스튜디오 작업 허브 안에 주제별/글별로 쌓인다.
- Threads/Apify는 주제 발굴의 메인 소스가 아니라, 한국어 Threads의 구조, 밀도, 후킹, 문장 리듬을 참고하는 benchmark/corpus로 쓴다.
- Reddit/X/뉴스/공식자료는 해외 마케팅, AI, 소비자 행동, 플랫폼 변화 이슈를 찾는 1차 주제 발굴 소스로 쓴다.
- 원고는 짧은 인상비평이 아니라, 독자가 이해하고 저장할 수 있을 만큼 충분한 맥락과 정보 밀도를 가져야 한다.

## 2. 중요한 의사결정

### 2.1 Claude Code 제안보다 사용자-Codex 대화가 우선이다

최근 Claude Code가 제안한 내용 중 일부는 현재 방향과 다르다. 특히 페르소나를 `restaurant_owner`, `clinic_owner`, `marketer`처럼 다시 쪼개는 방향은 사용자의 의도와 다르다.

우리가 합의한 방향은 다음이다.

- 페르소나는 굳이 업종별로 엄격히 나누지 않는다.
- 핵심 독자는 "작은 사업/브랜드/매장을 직접 운영하거나 마케팅 판단을 해야 하는 사람"이다.
- 요식업 사장님, 병의원 원장, 마케터를 별도 persona로 고정하지 않는다.
- 글 안에서도 "자영업자 여러분"처럼 독자를 과하게 단정하지 않는다.
- 현재 DB constraint 때문에 코드/DB canonical persona는 `general`을 쓴다.
- `unknown`은 fallback으로만 둔다.
- 기존 legacy persona 값은 normalize해서 `general`로 흡수한다.

### 2.2 콘텐츠 기둥은 사용자 선택 탭이 아니라 내부 전략 레인이다

기둥은 "사용자가 직접 고르는 주제"가 아니다.

확정된 1차 흐름은 다음이다.

1. 콘텐츠 기둥/전략 레인 기준을 먼저 세운다.
2. 각 기둥에 맞는 주제 후보를 리서치로 발굴한다.
3. 서로 겹치지 않는 주제 후보 7개를 텔레그램에 전달한다.
4. 사용자가 주제 후보 1개 또는 여러 개를 선택한다.
5. 선택된 주제 안에서 글 후보를 생성한다.

중요: "수집된 주제 후보를 먼저 뽑고, 나중에 기둥을 붙이는 구조"는 최종 의도와 다르다. 기둥은 사후 태그가 아니라 주제 발굴을 유도하는 전략 레인이다.

후보 생성 시 에이전트가 다음 기준으로 기둥을 점수화한다.

- 타겟 적합도
- 리서치 소스와의 연결성
- 발행 가치
- 반복 발행 시 브랜드 일관성
- 너무 뻔한 조언으로 흐를 위험

텔레그램 후보 메시지에는 선택된 기둥과 근거를 반드시 보여준다. 사용자는 기둥 버튼을 직접 누르지 않지만, "이건 뉴스성으로", "실행형 말고 관찰형으로", "다른 기둥으로 다시" 같은 피드백을 줄 수 있어야 한다.

### 2.3 주제 후보와 글 변주는 병렬 선택 구조여야 한다

사용자가 복수 후보를 고를 수 있어야 한다.

- 1개 주제 선택: 7개 변주
- 2개 주제 선택: 4개 / 3개 변주
- 3개 주제 선택: 3개 / 2개 / 2개 변주

즉 텔레그램에 전달되는 7개는 1차 "주제 후보"이고, 사용자가 주제 1개를 선택하면 그 주제에서 7개 글 후보가 생성된다. 사용자가 주제 2개를 선택하면 전체 글 후보 예산 7개를 4/3으로 나눠 생성한다.

중요한 점은 7개 후보/변주를 점수화하더라도 삭제하지 않는 것이다. 점수, 탈락/보류 사유, 선택 사유는 후보 메타와 variant review에 보존해야 한다.

### 2.4 Threads reference는 내용 복사가 아니라 구조 benchmark다

Apify로 수집한 Threads는 주제가 달라도 다음을 분석하는 기준으로 쓴다.

- 몇 개의 포스트로 이어지는가
- 포스트별 글자 수가 어느 정도인가
- 전체 글자 수가 어느 정도인가
- 첫 포스트와 후속 포스트의 역할이 어떻게 나뉘는가
- 정보 단위가 몇 개인가
- hook이 어떤 방식인가
- 저장형/댓글형/공유형 패턴이 있는가
- FOMO 장치가 어디에 들어가는가

본문 주제를 그대로 참조하지 않는다. "구조와 밀도"를 참조한다.

## 3. 현재 구현된 것

### 3.1 페르소나 단순화

관련 파일:

- `lib/contentTaxonomy.js`
- `docs/content-personas.md`
- `lib/agent/runDeepResearch.js`
- `lib/agent/convertItemToThreadDraft.js`
- `lib/llm.js`

현재 방향:

- `VALID_PERSONAS`는 `general`, `unknown` 중심으로 단순화했다.
- legacy persona는 `general`로 normalize한다.
- 문서도 업종별 분리 프로필 대신 핵심 독자 `general` 중심으로 재작성했다.
- DB `content_themes.target_persona` 중 legacy row는 백업 후 `general`로 정리했다.

주의:

- DB에 `core_operator` 같은 새 enum을 넣으려 했으나 constraint 때문에 실패했다.
- 그래서 지금은 `general`이 canonical value다.
- DB schema를 바꾸지 않는 한 새 persona enum을 임의로 쓰면 안 된다.

### 3.2 콘텐츠 기둥 API/UI

관련 파일:

- `app/api/admin/content-studio/pillars/route.js`
- `app/admin/content-studio/pillars/page.js`
- `app/admin/content-studio/layout.js`
- `docs/content-logic/threads/04-pillars-and-treatments.md`

현재 상태:

- `/admin/content-studio/pillars` 페이지를 추가했다.
- 5개 기둥, 문서상 비중/역할, 최근 30일 실제 발행 분포를 보여주는 API/UI가 있다.
- 콘텐츠 스튜디오 사이드바에 "기둥" 메뉴를 추가했다.

주의:

- `/admin/content-studio/themes`는 아직 legacy 성격이 남아 있어 운영자가 보면 "이전 주제 탭과 뭐가 다르지?"라고 느낄 수 있다.
- 최종적으로는 themes 페이지를 "운영 주제 관리"로 남길지, "전략 레인"에서 완전히 분리할지 정리해야 한다.

### 3.3 Telegram workflow

관련 파일:

- `app/api/webhook/telegram/route.js`
- `lib/agent/parseUserDecision.js`
- `lib/agent/finishPlanningSession.js`
- `lib/agent/convertItemToThreadDraft.js`

현재 상태:

- `후보 1, 4 둘 다` 같은 복수 선택을 파싱하는 작업이 들어가 있다.
- 복수 주제 선택 시 7개 변주를 분배하는 구조가 들어가 있다.
- 테스트용 `X-Giveneeds-Sync-Finish: 1` 헤더로 동기 finish 경로를 검증할 수 있다.
- `normalizedPersona is not defined` 런타임 오류는 수정했다.

주의:

- 실서비스 DB에 테스트 session/draft가 일부 생성되어 있다.
- 새 DB write 전에는 반드시 SELECT precheck와 백업을 한다.
- 생성 품질은 아직 목표 수준이 아니다. 배포 전 품질 gate 재검증이 필요하다.

### 3.4 Threads reference benchmark

관련 파일:

- `config/threads-reference-urls.json`
- `scripts/collect-threads-reference-benchmark.js`
- `scripts/analyze-threads-benchmark.js`
- `scripts/collect-threads-references-search.js`
- `docs/reference-data/threads-benchmark-2026-05-26-reference.md`
- `docs/reference-data/threads-benchmark-2026-05-26-reference.json`

현재 상태:

- 특정 Threads URL 상세 수집으로 연속 포스트 수집 가능성은 확인했다.
- reference benchmark 생성 스크립트가 있다.
- 현재 reference benchmark는 7개 표본 기준으로 생성되었고, `structured_info_thread_verified`는 true다.
- 현재 관측값은 p50 total chars가 낮다. 일부 표본이 짧아 "LLM에게 무조건 1200자 이상"이라는 gate와 충돌한다.

주의:

- Apify 월간 hard limit 초과로 자동 reference 수집 확장이 막혀 있다.
- `config/threads-reference-urls.json`에는 추가 reference가 일부 있지만, quota 때문에 상세 benchmark에 모두 반영하지 못했다.
- Claude Code가 제안한 "첫 게시물 350자 이상" 필터는 잘못된 기준일 수 있다. 실제 Threads 정보형 글은 첫 포스트가 짧고 후속 포스트에서 밀도가 올라가는 경우가 많다.
- 더 나은 필터는 `root >= 60`, `continuations >= 1`, `total >= 900` 같은 총합/후속글 중심 기준이다.

## 4. 아직 끝나지 않은 핵심 문제

### 4.1 1차 후보 발굴 흐름이 아직 완전히 기둥 선행 구조가 아니다

현재 코드에는 1차 보고서 직전에 `selectPillarDrivenTopicCandidates` 선별 레이어를 추가했다. 이 레이어는 수집 풀을 기둥별 후보 풀로 재정렬하고, Reddit/X 후보를 일반 후보 흐름 안에 보존하며, 겹치지 않는 주제 후보 7개를 다시 라벨링한다.

이후 collector 앞단에도 `buildPillarDrivenSourceQueries`를 추가했다. 이제 query 기반 소스(`naver_news`, `google_news`, `reddit`, `reddit_search`, `x_search`)는 원래 identifier 하나만 검색하지 않고, 기둥별 research angle을 섞은 검색어로 확장해 수집한다. cron에서는 비용 폭증을 막기 위해 소스당 기본 3개 기둥 쿼리만 사용하고, 수동 실행에서는 기본 5개까지 넓힌다.

스포츠/정치/연예성 기사처럼 넓은 마케팅 키워드에 섞여 들어오는 오염 주제는 `isOffTopicCollectedItem`에서 수집 직후 걸러낸다. 과거 스포츠 주제 유입은 별도 스포츠 로직이 있어서가 아니라 `콘텐츠 마케팅`, `B2B 마케팅` 같은 넓은 뉴스 키워드가 브랜드 협찬/스포츠 마케팅 기사까지 가져왔기 때문이다.

아직 남은 확장 포인트는 "사용자가 주간/기둥별 인사이트 seed를 직접 던지는 인터페이스"다. 현재는 `content_themes.research_keywords`와 source identifier를 seed로 쓰고 있으므로, 운영자가 이번 주에 보고 싶은 관점이 있다면 theme keyword/source identifier에 반영해야 한다. 이후에는 별도 weekly insight seed 입력란 또는 config를 두는 편이 좋다.

따라서 다음 작업에서 1차 후보 생성은 단순 최신 수집순이 아니라, 기둥별 슬롯과 다양성 기준을 적용해야 한다.

권장 분배:

- 5개 기둥을 모두 후보 풀 평가에 사용한다.
- 기본 7개 주제 후보는 기둥 중복을 최소화한다.
- 강한 기둥은 2개까지 허용하되, 같은 결론/같은 형식의 후보는 제거한다.
- Reddit/X/뉴스/공식자료는 별도 카테고리로 분리하지 않고, 각 기둥 안에서 출처 신호로만 표시한다.

### 4.2 원고 평균 길이가 여전히 짧다

현재 가장 큰 문제는 생성된 원고가 여전히 140-300자 수준으로 저장되는 경우가 있다는 점이다.

최근 수정으로 repair가 더 긴 원고를 만들 수는 있었지만, 기존 quality gate가 너무 엄격하거나 저장 로직이 원문을 살리는 바람에 긴 repair 결과가 실제 draft로 저장되지 않는 문제가 있었다.

이후 repair 개선분을 받아들이는 로직을 추가했지만, 아직 end-to-end로 충분히 검증하지 못했다.

결론:

- production 배포 전, 실제 생성 원고 평균 길이와 정보 밀도 검증이 반드시 필요하다.
- 단순히 prompt에 "길게 써"를 추가하는 방식으로는 해결 가능성이 낮다.

### 4.3 Apify quota가 막혀 reference 다양화가 중단됐다

현재 Apify가 `Monthly usage hard limit exceeded` 상태다.

이 때문에 다음 작업은 quota/billing 복구 후 진행해야 한다.

- reference URL 15개 이상 확보
- 다양한 계정 1인 1글 기준 benchmark 강화
- observed p50/p75 재계산
- 실제 원고가 benchmark 대비 어느 정도인지 비교

### 4.4 production 배포는 아직 하지 말아야 한다

`npm run build`는 통과했지만, 현재 dirty worktree가 크고 원고 길이 문제도 남아 있다.

배포 전 최소 기준:

- build 통과
- Telegram 후보 -> 선택 -> draft 생성 end-to-end 통과
- 저장된 draft 평균 글자 수가 목표 수준으로 상승
- 콘텐츠 스튜디오 hub/pillars 페이지에서 생성 결과와 메타 확인
- Apify quota 문제는 기능 차단이 아니라 "benchmark 최신성 낮음"으로 graceful fallback 처리

## 5. 평균 원고 길이 1300자 이상을 달성하는 효율적 방법

목표는 "LLM에게 매번 7개 긴 원고를 쓰게 하기"가 아니다. 그러면 output token 비용이 크게 늘고, 실패 시 repair 비용까지 폭증한다.

가장 효율적인 구조는 다음이다.

### 5.1 1차 7개 주제 후보와 2차 7개 글 후보를 구분한다

정리:

- 1차 7개 = 텔레그램에 보내는 주제 후보
- 2차 7개 = 사용자가 주제 1개를 선택한 뒤 생성되는 글 후보
- 주제 2개 선택 시 2차 글 후보는 4/3으로 분배
- 주제 3개 선택 시 2차 글 후보는 3/2/2로 분배

토큰 절약 논의에서 말하는 outline/spec는 2차 글 후보 생성 비용을 줄이기 위한 개선안이다. 현재 제품 의도 자체는 "주제 선택 후 글 후보 7개 생성"이다.

### 5.2 7개 글 후보는 full draft가 아니라 outline/spec로 먼저 만드는 구조를 고려한다

1차 생성:

- 주제 선택 후 생성되는 7개 글 후보를 모두 full prose로 쓰지 않는 방식을 고려할 수 있다.
- 각 후보는 compact outline으로 만든다.
- outline에는 다음만 담는다.
  - 주제
  - 선택된 기둥
  - 기둥 선택 이유
  - hook 방향
  - 포스트 수
  - 포스트별 역할
  - 필수 정보 단위 5-8개
  - 예상 FOMO 장치
  - 위험한 결론/금지 표현
  - 예상 글자 수 budget

이 단계는 cheap model로 충분하다.

### 5.3 사용자가 고른 글 후보만 full draft로 확장한다

2차 생성:

- 사용자가 텔레그램에서 선택한 후보만 full draft로 확장한다.
- 1개 선택이면 1개 주제에서 7개 변주를 다 쓸지, 또는 추천 2-3개만 full로 쓸지 제품 정책을 정해야 한다.
- 2개 이상 선택이면 분배된 변주 중 실제 저장할 full draft 수를 제한한다.

권장:

- Telegram에는 7개 후보를 모두 보여준다.
- full draft는 선택된 후보/주제만 쓴다.
- 운영자가 아직 고르지 않은 후보는 outline으로만 저장한다.

이 방식이 토큰을 가장 아낀다.

### 5.4 글자 수는 prompt가 아니라 deterministic gate로 보장한다

생성 후 로컬 코드가 실제 글자 수를 세야 한다.

권장 gate:

- full draft total chars < 1100이면 정상 draft로 저장하지 않는다.
- 정보형/해설형은 total chars 1300-1800을 기본 목표로 둔다.
- 뉴스 코멘터리는 1000-1400도 허용할 수 있다.
- single post는 Threads 1000자 제한 때문에 1300자 목표와 충돌한다. 평균 1300자를 원하면 기본 형식은 multi-post thread여야 한다.

권장 budget:

- `explainer`: 3 posts x 450-550 chars = 1350-1650
- `resource/checklist`: 4 posts x 350-450 chars = 1400-1800
- `news_commentary`: 2 posts x 500-700 chars = 1000-1400
- `single_post`: 800-1000 chars, 평균 1300 목표에는 단독으로 불리

### 5.5 repair는 전체 원고 재작성 대신 부족한 포스트만 확장한다

토큰 절약형 repair 방식:

- 전체 topic/research를 다시 보내지 않는다.
- 부족한 post text, 목표 추가 글자 수, 빠진 정보 단위만 보낸다.
- "이 포스트를 220자 더 늘려라"처럼 targeted expansion을 한다.
- 충분한 포스트는 건드리지 않는다.

예:

```text
Post 2 is 210 chars but target is 480.
Expand only Post 2.
Add these missing info units:
- why this matters
- concrete example
- one caveat
Keep the tone natural Korean Threads style.
Do not add a forced CTA.
```

### 5.6 평균 1300자를 원하면 short-form 정책을 제한해야 한다

"짧게 쓰는 게 더 강한 주제"만 short를 허용한다.

기본값:

- 정보형/해설형/트렌드 정리형은 multi-post thread
- 최소 3 posts
- 최소 5 information units
- total chars >= 1300 목표

예외:

- 순수 관찰형
- 한 줄 punch가 핵심인 뉴스 코멘터리
- 이미지 카드가 본문 정보량을 대체하는 경우

단, 지금 시스템은 이미지 OCR을 품질 gate에 넣지 않았으므로, 이미지 의존형은 당분간 안전한 기준으로 쓰지 않는다.

## 6. 다음 작업 순서

1. 1차 후보 생성 로직을 `기둥/전략 레인 선행 -> 레인별 주제 후보 선별 -> 7개 주제 후보` 구조로 바꾼다.
2. 주제 1개 선택 시 그 주제에서 글 후보 7개가 생성되는지 확인한다.
3. 주제 2개 선택 시 글 후보 전체 7개가 4/3으로 분배되는지 확인한다.
4. `convertItemToThreadDraft`를 outline-first/full-expand-second 구조로 분리할지 결정한다.
5. `ensureDraftLength` 같은 deterministic validator를 추가한다.
6. `total_chars < 1100`인 full draft는 정상 저장하지 않거나 `quality_gate_failed`로 표시한다.
7. repair는 전체 variant 재작성 대신 부족한 post만 targeted expansion한다.
8. Telegram 테스트에서 사용자가 답하지 않아도 OK로 가정하는 경로를 다시 실행한다.
9. 콘텐츠 스튜디오 hub 안에 주제별 섹션/글별 draft/기둥 메타/variant review가 보이는지 확인한다.
10. Apify quota가 복구되면 reference 수집을 15개 이상으로 늘리고 benchmark를 재생성한다.
11. `npm run build`를 다시 통과시킨다.
12. 평균 길이와 품질 gate 통과를 확인한 뒤에만 commit/push/deploy한다.

## 7. 검증 명령

```bash
npm run build
npm run threads:reference-benchmark
node scripts/collect-threads-references-search.js
```

Telegram end-to-end test는 현재 webhook route의 `X-Giveneeds-Sync-Finish: 1` 헤더를 사용해 동기 경로로 검증할 수 있다. 단, 실제 Supabase에 session/draft가 생성될 수 있으므로 DB write 전에는 반드시 SELECT precheck와 백업을 한다.

## 8. 현재 주의할 파일/상태

현재 worktree에는 많은 unstaged 변경이 있다. 임의로 revert하지 말 것.

특히 다음은 이번 개편의 핵심 파일이다.

- `lib/agent/convertItemToThreadDraft.js`
- `lib/agent/finishPlanningSession.js`
- `lib/agent/parseUserDecision.js`
- `lib/agent/contentPillarStrategy.js`
- `lib/contentTaxonomy.js`
- `app/api/webhook/telegram/route.js`
- `app/admin/content-studio/pillars/page.js`
- `app/api/admin/content-studio/pillars/route.js`
- `config/threads-reference-urls.json`
- `scripts/collect-threads-references-search.js`
- `scripts/collect-threads-reference-benchmark.js`
- `scripts/analyze-threads-benchmark.js`

### 발행 화면 단순화와 저품질 원고 차단

사용자가 확인한 예시처럼 `AI의 다양한 역할`, `효율성을 높일 수 있습니다`, `경험을 공유해보세요` 수준의 50~70자 포스트 5개는 Threads 발행에 부적합하다. 이것은 "형식은 스레드지만 내용은 빈 문장"인 상태다.

반영한 조치:

- `app/admin/content-studio/thread-drafts/[id]/page.js`를 발행 중심 화면으로 단순화했다.
- 상세 페이지에서는 의사결정 근거, 거버넌스, variant review 등 보조 정보를 제거하고, 본문 편집/복사/저장/발행 완료만 남겼다.
- `convertItemToThreadDraft.js` 품질 gate를 강화했다.
  - multi-post 후보도 최소 총 본문량을 검사한다.
  - 정보형/해설형 연결글은 1100자 미만이면 하드 품질 실패로 본다.
  - 후속 포스트가 너무 짧으면 하드 품질 실패로 본다.
  - `AI의 다양한 역할`, `효율성을 높일 수 있습니다`, `어떻게 활용하고 계신가요`, `경험을 공유해보세요` 같은 AI식 일반론 패턴을 감지해 실패 처리한다.

검증:

- 캡처 예시와 유사한 텍스트는 `AI식 일반론/구체 신호 부족`으로 차단되는 것을 로컬 조건 검사로 확인했다.
- `npm run build` 통과.

## 9. 인수인계 명령

Claude Code에서 `/인수인계` 명령을 사용할 수 있도록 `.claude/commands/인수인계.md`를 추가했다.

목적:

- 현재 작업 맥락을 handoff 문서에 갱신한다.
- 관련 diff를 확인한다.
- `npm run build` 등 필요한 검증을 실행한다.
- 관련 파일만 stage한다.
- 커밋 메시지를 만들어 commit한다.

주의:

- 이 명령은 배포까지 하지 않는다. 배포는 사용자가 별도로 "배포까지"라고 말할 때만 진행한다.
- 미완성 변경이 섞여 있으면 커밋하지 않고 handoff만 갱신하는 선택을 할 수 있다.
- 무조건 `git add -A`를 쓰지 않고, 관련 파일만 stage하도록 지시되어 있다.

## 10. 한 줄 결론

지금 필요한 것은 "더 긴 프롬프트"가 아니라 "1차 7개 주제 후보는 기둥 선행으로 선별하고, 사용자가 고른 주제에서 2차 글 후보 7개를 만들되, 글자 수 gate와 targeted repair로 1300자 수준을 보장하는 구조"다.

## 11. `/인수인계` 실행 기록 - 2026-05-27

이번 커밋에 포함할 범위:

- 콘텐츠 기둥/전략 레인 기반 주제 후보 선별
- 기둥 기반 검색 쿼리 생성 및 스포츠/정치/연예 오염 주제 필터
- Telegram 다중 선택 및 7개 변주 4/3/3/2/2 분배 흐름
- Threads reference benchmark 수집/분석 스크립트
- 페르소나 단순화(`general`, `unknown`)
- 콘텐츠 스튜디오 hub/pillars UI 및 발행 화면 단순화
- `convertItemToThreadDraft` 품질 gate 강화
- Claude Code `/인수인계` 명령 추가

검증:

- `npm run build` 통과.
- 캡처와 유사한 300자대 AI식 일반론은 `AI식 일반론/구체 신호 부족` 조건으로 차단되는 것을 로컬 조건 검사로 확인.

남은 리스크:

- Apify quota hard limit로 reference benchmark 표본 확장은 아직 제한됨.
- 실제 production cron -> Telegram -> 후보 선택 -> draft 생성 end-to-end는 커밋 후 별도 테스트 필요.
- 평균 1300자 수준 달성은 강화된 gate 이후 새 생성물로 재검증해야 함.
