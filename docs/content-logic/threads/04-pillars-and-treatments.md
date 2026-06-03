# Pillars And Treatments

기브니즈 Threads는 플레이스 전용 계정이 아니다. 작은 사업자가 마케팅에 돈을 쓰기 전, 직접 보고 판단하고 오늘 하나라도 고칠 수 있게 돕는 계정이다.

실행 시 이 문서도 앞부분만 잘려 주입될 수 있으므로 핵심 규칙을 먼저 둔다.

## 핵심 규칙

- `content_pillar`/`engagement_intent`의 enum과 role은 `config/content-pillars.json`이 SSOT다. 이 문서는 값을 다시 정의하지 않는다.
- `content_pillar`는 계정 안에서 글의 역할, `engagement_intent`는 목표 반응, `content_treatment`는 소재를 푸는 문법, `format_type`은 포스트 수다.
- 결정 순서: persona의 불안/질문 → pillar 후보 → intent → research 밀도에 맞는 treatment → format.
- treatment 선택: `news_commentary`=근거 약한 이슈 관점화, `practical_tip`=오늘 바꿀 행동, `checklist`=3개 이상 점검 항목, `explainer`=새 개념 번역, `case_note`=사례에서 기준 추출, `opinion`=강한 관점, `fomo_reframe`=룰 변화/비용 누수/격차.

## 상세 원칙

## 분리 원칙

- `content_pillar`: 이 글이 계정에서 어떤 역할을 하는가.
- `engagement_intent`: 이 글이 어떤 독자 반응을 목표로 하는가.
- `content_treatment`: 이 소재를 어떤 문법으로 풀 것인가.
- `explanation_style`: 독자가 이해하게 만드는 전개 방식.
- `format_type`: 몇 개 포스트로 나눌지.

## 결정 순서

1. 먼저 독자의 불안/질문과 주제의 시의성을 본다. (`content-personas.md`)
2. 주제가 계정에서 어떤 역할을 하는지 보고 `content_pillar` 후보를 잡는다.
3. 어떤 반응을 목표로 할지 보고 `engagement_intent`를 정한다.
4. 리서치 결과의 밀도와 자료 형태를 보고 `content_treatment`를 정한다.
5. 전달할 내용의 양과 포스트별 역할을 보고 `format_type`을 정한다.

## Content Treatment

`content_treatment`는 같은 소재를 어떤 글 문법으로 풀지 정하는 단계다.

예를 들어 "AI 검색 시대에 플레이스 설명문이 중요해진다"라는 소재는 아래처럼 달라질 수 있다.

- `news_commentary`: AI 검색 변화가 로컬 운영자에게 어떤 의미인지 관점으로 푼다.
- `practical_tip`: 오늘 플레이스 설명문에서 바로 고칠 문장 기준을 준다.
- `checklist`: 설명문, 메뉴명, 리뷰, 사진, 예약 동선을 점검 항목으로 나눈다.
- `explainer`: GEO/AEO 같은 새 개념을 운영자 언어로 쉽게 풀어준다.
- `case_note`: 실제 사례에서 무엇이 바뀌었는지 뽑는다.
- `opinion`: 앞으로 로컬 마케팅에서 무엇이 더 중요해지는지 강한 관점으로 말한다.
- `fomo_reframe`: 잘하는 곳과 뒤처지는 곳의 조용한 격차를 보여준다.

## Treatment 선택 기준

- `news_commentary`: 뉴스/이슈는 있지만 실전 팁 근거가 약할 때. 억지 실행법을 만들지 않는다.
- `practical_tip`: 오늘 바꿀 수 있는 화면, 문구, 행동이 명확할 때.
- `checklist`: 점검 항목이 3개 이상이고, 독자가 나중에 다시 볼 가치가 있을 때.
- `explainer`: 새 개념, 플랫폼 변화, 기술 흐름을 쉬운 말로 번역해야 할 때.
- `case_note`: 실제 사례, 실패담, 전후 비교에서 판단 기준을 뽑을 수 있을 때.
- `opinion`: 근거는 얇지만 관점이 강하고 토론/공감을 만들 수 있을 때.
- `fomo_reframe`: 룰 변화, 비용 누수, 뒤처짐, 조용한 격차가 소재의 핵심일 때.

## 저장/공유 가치 판단

저장되는 글은 보통 아래 중 하나를 가진다.

- 다시 볼 체크 항목
- 따라 할 순서
- 비교 기준
- 실패를 피하는 기준
- 실제 사례에서 뽑은 판단 기준
- 새 트렌드를 내 화면/고객 동선으로 번역한 설명

단, 이 목록은 `content_treatment`를 고르는 참고 기준이다. 독자 정의는 `content-personas.md`, 포스트 수 결정은 `05-format-length-and-explainer.md`가 담당한다.

## Anchoring 방지

- 주제 씨앗 문장을 그대로 제목으로 복사하지 않는다.
- 특정 기둥을 골랐다고 항상 같은 소재를 쓰지 않는다.
- pillar가 정해졌다고 treatment가 자동으로 정해지는 것은 아니다.
- 최신 audit에 반복되는 표현, 새 댓글 욕망, 최근 플랫폼 변화, 원문 기사/게시글의 다른 각도를 우선한다.
- 한 주제를 고를 때 "이 기둥이 어떤 팔로우 이유를 증명하는가"를 설명할 수 있어야 한다.
