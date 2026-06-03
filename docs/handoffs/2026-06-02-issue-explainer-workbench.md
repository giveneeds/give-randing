# 핸드오프 — Issue Explainer 워크벤치 현재 상태 (2026-06-02)

> 이 문서는 `docs/handoffs/2026-06-01-trend-pivot-codex.md` 이후 실제로 바뀐 의사결정과 구현 상태만 기록한다.
> 이전 피벗 문서와 중복되는 배경 설명은 반복하지 않는다.
> **필독 순서**: `HANDOFF_GUIDE.md` → `docs/handoffs/2026-06-01-trend-pivot-codex.md` → 본 문서 → `docs/threads-pipeline-overview.md` → `AGENTS.md`

---

## 1. 현재 결론

워크벤치는 더 이상 넓은 “트렌드 기반 기획” 전체를 한 번에 만들지 않는다.

현재 v1은 아래 하나로 좁혔다.

```text
최근 AI/마케팅/테크/비즈니스 뉴스기사/릴리스/원문
→ Claude가 issue_explainer 기획
→ Sonar가 연계 리서치
→ 사용자가 근거 채택
→ GPT-5 Writer가 issue_explainer 초안 작성
```

글 형식은 v1에서 `issue_explainer`로 고정한다.

`issue_explainer` 흐름:

```text
대상 호출
→ 최근 사건
→ 구체 장면
→ 출처 신호
→ 작동 방식
→ 전환
→ 반전
→ 왜 중요한가
→ 추가 사례/반응
→ 불확실성
→ 결론/출처/CTA
```

---

## 2. 중요한 운영 결정

### 2.1 수동 기획 프롬프트 모드 제거

예전 `[1-B] 수동 프롬프트 입력`은 제거했다.

이유:
- 사용자가 주제를 직접 던져 Claude가 바로 기획하면 원문/뉴스기사 기반 흐름이 흐려진다.
- 현재 목표는 “근거 있는 뉴스기사 기반 issue_explainer”다.

현재 기획 시작점은 둘뿐이다.

1. 기사 URL로 시작
2. Sonar가 찾은 이슈 후보 선택

백엔드 `/plan`도 `manual_prompt`를 막았다.

### 2.2 옵션 B는 “수동 기획”이 아니라 “Sonar 검색 프롬프트 설계”

정욱님이 원한 옵션 B는 다음이다.

```text
사용자: 이런 결의 뉴스기사/이슈를 찾고 싶다
→ Claude: Sonar가 검색하기 좋은 이슈 탐색 프롬프트 작성
→ 사용자: 프롬프트 확인/수정
→ Sonar: 그 프롬프트로 뉴스기사 후보 수집
```

즉 Claude는 이 단계에서 글을 기획하지 않는다.
Claude는 Sonar에게 던질 검색 질문을 설계한다.

### 2.3 realbody는 기획 입력이 아니다

`docs/reference-data/threads-realbody-*.json`은 Writer 단계에서 말투/호흡 참고로만 들어간다.

객관적 판단:
- 포함은 맞다. `write/route.js`에서 `getThreadsRealBodySamples()`를 호출한다.
- 하지만 Claude 기획이나 issue_explainer 구조 선택에는 영향 주면 안 된다.
- 표시도 “핵심 워크플로우 입력”이 아니라 “Writer 말투 참고”로 보는 것이 맞다.

### 2.4 `info-thread-structure.md`는 현재 issue_explainer 핵심 구조가 아니다

`docs/reference-data/threads-curated/info-thread-structure.md`는 기존 정보형 스레드 참고 노트다.

현재 v1의 핵심 구조는 Writer API의 `issue_explainer` 프롬프트다.

`info-thread-structure.md`가 조건부 reference로 들어갈 수 있더라도, 지금 방향에서는 구조의 중심으로 취급하면 안 된다.

### 2.5 목업 데이터는 워크벤치 본 흐름에서 제거

프론트에서 아래 목업 노출을 제거했다.

- mock 이슈 후보
- mock ContentPlan
- mock ResearchItems
- mock Findings
- mock Writer 초안

실제 Claude/Sonar/GPT-5 결과가 없으면 안내 상태만 보여야 한다.

---

## 3. 현재 구현된 파일

### 프론트

- `app/admin/content-studio/research-workbench/ResearchWorkbenchClient.js`
  - 문서 역할/영향 범위 표시
  - 기사 URL 입력
  - Sonar 최근 이슈 후보 수집
  - 옵션 B: 사용자 탐색 의도 → Claude Sonar 검색 프롬프트 생성
  - 선택/발행 예정 뉴스기사 이력 localStorage 저장
  - Claude ContentPlan 표시
  - Sonar 리서치 질문/결과 표시
  - Writer handoff preview
  - GPT-5 Writer 초안 표시

- `app/admin/content-studio/research-workbench/page.js`
  - 내부 문서 원문 로드
  - realbody / curated reference 자료 표시

### API

- `app/api/admin/content-studio/research-workbench/issues/route.js`
  - Perplexity Sonar로 최근 이슈 후보 수집
  - `categories`, `recency`, `excludeHistory`, `customPrompt` 지원
  - 서버가 로컬 `docs/reference-data/threads-user-*.json` 이력을 읽어 중복 제외 조건에 강제 추가

- `app/api/admin/content-studio/research-workbench/issue-search-prompt/route.js`
  - 사용자 탐색 의도를 Claude가 Sonar 검색 프롬프트로 변환
  - 로컬 `threads-user-*.json` 이력도 같이 전달해 이미 쓴 주제 회피

- `app/api/admin/content-studio/research-workbench/article/route.js`
  - 기사 URL 직접 fetch
  - `script/style/noscript` 제거
  - `<article>` 우선, 없으면 `body`
  - `p`, `li`, `blockquote`, `h1`, `h2`, `h3` 텍스트 추출
  - 25자 미만 조각 제거
  - 최대 18,000자까지 Claude에 넘길 준비

- `app/api/admin/content-studio/research-workbench/plan/route.js`
  - Claude가 `ContentPlan` 생성
  - `source_article` 또는 `issue_candidate`만 허용
  - `manual_prompt` 모드 제거
  - `content_pattern`은 `issue_explainer`만 허용

- `app/api/admin/content-studio/research-workbench/research/route.js`
  - Claude가 만든 `deep_research_questions`를 Sonar 질문별 리서치로 실행
  - `issue_explainer`일 때 최근성 필터 `week`

- `app/api/admin/content-studio/research-workbench/write/route.js`
  - GPT-5 Writer 호출
  - `IssuePlan + Article Slot Map + accepted evidence + do_not_claim + referenceContext` 기반 초안 생성
  - 8~11 posts 요구
  - 마지막 post에 결론/출처/CTA 요구

---

## 4. 현재 데이터/로컬 이력

### 4.1 사용자가 수정한 성공 케이스

파일:

```text
docs/reference-data/threads-user-edited-success-2026-06-02.json
```

이 파일은 `.gitignore` 대상이다.

용도:
- 자동 주입 금지
- 사용자가 참고 요청할 때만 선택적으로 참고
- 단, `/issues`와 `/issue-search-prompt`에서는 중복 방지 이력으로 읽는다.

핵심 주제:

```text
제일기획 AI/마케팅 테크 솔루션 전환 해설
```

따라서 Sonar 후보 수집 시 제일기획/광고 대행사→AI 마케팅 테크 전환 같은 같은 angle은 제외되어야 한다.

### 4.2 로컬 이력 로딩 방식

서버는 아래 패턴을 읽는다.

```text
docs/reference-data/threads-user-*.json
```

`topic`, `reference_label`, `title`, `issue_title`, `root_text`, `text_content`, `source_url`, `url` 등을 중복 제외 힌트로 사용한다.

주의:
- 이력은 “참고 톤 자동 주입”이 아니다.
- 이력은 “같은 뉴스기사/같은 사건/같은 angle 회피” 용도다.

---

## 5. 현재 워크플로우 상세

### 5.1 자동 최근 이슈 찾기

```text
사용자: 최근 이슈 가져오기
→ /issues
→ Sonar
→ 후보 5~8개
→ 사용자가 후보 선택
→ /plan
→ Claude IssuePlan
```

현재 Sonar 기본 조건:
- 범위: AI / marketing / tech / business
- 기간: day / week / month
- 제외: 출처 약한 루머, 너무 좁은 금융/정치, 단순 리스트 기사
- 추가 제외: localStorage 선택 이력 + `threads-user-*.json` 로컬 이력

### 5.2 옵션 B: 찾고 싶은 이슈 방향 지정

```text
사용자: 이런 결의 이슈를 찾고 싶다
→ /issue-search-prompt
→ Claude가 Sonar 검색 프롬프트 생성
→ 사용자 수정 가능
→ /issues customPrompt
→ Sonar 후보 수집
```

예시 입력:

```text
유료 보이스클론 도구를 오픈소스 모델이 대체하는 흐름의 최근 뉴스기사 찾아줘
```

### 5.3 기사 URL로 시작

```text
기사 URL 입력
→ /article
→ 원문 텍스트 추출
→ 원문으로 Claude 해석
→ /plan source_article
```

`/article`은 특정 URL 본문 직접 추출이다.
Sonar 검색과 다르다.

---

## 6. 아직 미구현 / 다음 판단

### 6.1 Perplexity Search API 활용 여부

정욱님은 “링크 후보를 먼저 들고오고, /article reader가 URL 원문을 발췌하는 구조”를 고려 중이다.

현재는 아직 구현하지 않았다.

현실적 다음 구조:

```text
Search/Sonar로 링크 후보 수집
→ 사용자가 링크 선택
→ /article reader로 본문 추출
→ 실패하면 Sonar 요약/citations로 보완
```

### 6.2 좋은 원문 소스 풀

정욱님은 기존 빅테크 공식 블로그가 너무 식상하다고 판단했다.

관심 있는 새 소스 예:

```text
https://www.myfloridalegal.com/
```

방향:
- 규제기관
- 주 Attorney General 발표
- FTC/DOJ/SEC/EU Commission
- 기업 릴리스
- 오픈소스/개발자 릴리스
- Substack/뉴스레터
- 커뮤니티 초기 신호

아직 워크벤치 소스 모드로 구현하지 않았다.

### 6.3 Claude 리서치 각도 추천

다음 아이디어:

```text
Claude에게 우리 맥락 기준 “Sonar에 시킬 리서치 각도 30개”를 추천받기
```

목적:
- 단순 키워드가 아니라 “찾는 방식”을 만들기
- 예: “대형 기업이 기존 직무/대행 구조를 AI 자동화 구조로 바꾸는 공식 발표”

아직 구현하지 않았다.
먼저 Claude 프롬프트로 결과 뉘앙스를 검수하기로 했다.

### 6.4 Workflow Compliance Checker

필요하지만 아직 미구현.

해야 할 검증:
- 원문 추출 여부
- `content_pattern=issue_explainer`
- Article Slot Map 채움 정도
- Sonar 질문 개수
- 채택/폐기 evidence
- do_not_claim 전달
- Writer posts 8~11개 여부
- 출처 없는 주장 감지
- 마지막 post 출처/CTA 포함

---

## 7. 주의할 점

- `git push` / 배포 금지. 정욱님이 명시적으로 요청하기 전까지 하지 않는다.
- 기존 cron, `runCollection`, `finishPlanningSession`, 기존 Writer 본 흐름은 건드리지 않는다.
- 지금 워크벤치는 별도 실험 트랙이다.
- 목업 데이터는 다시 기본 노출하지 않는다.
- 사용자가 저장한 성공 케이스는 자동 톤 주입하지 않는다. 다만 중복 방지 이력으로는 써야 한다.
- `manual_prompt` 기획 모드는 되살리지 않는다. 사용자 입력은 “Sonar 검색 프롬프트 설계” 용도로만 둔다.

---

## 8. 최근 검증

확인한 것:

```text
node -c app/admin/content-studio/research-workbench/ResearchWorkbenchClient.js
node -c app/api/admin/content-studio/research-workbench/issues/route.js
node -c app/api/admin/content-studio/research-workbench/issue-search-prompt/route.js
node -c app/api/admin/content-studio/research-workbench/plan/route.js
curl -I http://localhost:3000/admin/content-studio/research-workbench
```

결과:
- 문법 체크 통과
- 워크벤치 `200 OK`

`npm run build`는 이전에 통과했으나, 마지막 몇 차례 UI 정리 후 전체 build는 다시 돌리지 않았다.

