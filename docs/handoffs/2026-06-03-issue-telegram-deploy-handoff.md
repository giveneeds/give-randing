# 핸드오프 — Issue Explainer 텔레그램 선택 흐름 배포 직전 상태 (2026-06-03)

> 다음 Claude Code / Codex 세션이 바로 이어받기 위한 최신 상태 메모다.
> 중복 배경은 반복하지 않는다.
> **필독 순서**: `HANDOFF_GUIDE.md` → `docs/handoffs/2026-06-02-issue-explainer-workbench.md` → 본 문서 → `docs/threads-pipeline-overview.md` → `AGENTS.md`

---

## 1. 현재 제품 방향

정욱님은 기존 `검토함 / 진행 / 기둥` 중심의 수집형 화면보다, 지금은 아래 흐름을 우선 쓰고 싶어 한다.

```text
최근 뉴스/릴리스 이슈 후보 탐색
→ 텔레그램으로 후보 전달
→ 사용자가 후보 하나 선택
→ 워크벤치에서 선택 이슈가 열린 상태로 Claude 해석
→ Sonar 연계 리서치
→ R1 Writer 초안
→ R2 한국어 보정
→ 사람이 최종 발행 판단
```

중요:
- 지금은 “텔레그램 버튼 클릭 즉시 완전 자동 발행”이 아니다.
- 품질 검수 때문에 텔레그램 선택 뒤 워크벤치로 들어와서 Claude/Sonar/R1/R2를 확인하는 구조가 맞다.
- 기존 cron, `runCollection`, `finishPlanningSession`, 기존 `agent_items` 검토함 흐름은 삭제하지 않는다.

---

## 2. 이번 배포 직전 변경 요약

### 2.1 콘텐츠 스튜디오 상단 탭 정리

파일:

```text
app/admin/content-studio/layout.js
```

변경:
- 기본 노출 탭은 `워크벤치`, `발행` 중심.
- `검토함`, `진행`, `기둥`, `리서치 로그`는 기본 숨김.
- 우측 `기존 메뉴 보기` 버튼으로 다시 열 수 있다.

의도:
- 지금 당장 사용자 조작면에서 쓰는 것은 이슈 워크벤치와 발행 확인이다.
- 기존 수집형 UI는 남기되, 기본 화면에서는 혼란을 줄인다.

### 2.2 텔레그램 이슈 후보 발송 API 추가

파일:

```text
app/api/admin/content-studio/research-workbench/issues/notify/route.js
```

역할:
- 기존 `/issues` API를 내부 호출해 Sonar 이슈 후보를 찾는다.
- 활성 `agent_telegram_recipients`에게 후보 카드를 보낸다.
- 각 후보에는 `이 이슈로 시작` 버튼이 붙는다.

주의:
- DB에 새 이슈 후보를 저장하지 않는다.
- 후보는 텔레그램 카드 텍스트 + 워크벤치 URL query로 이어진다.
- 지금은 단순하고 롤백 쉬운 MVP다.

### 2.3 텔레그램 webhook에 `issue_select` 콜백 추가

파일:

```text
app/api/webhook/telegram/route.js
```

역할:
- 기존 `approve/reject` 콜백과 별도로 `issue_select:{id}`를 처리한다.
- 버튼 클릭 시 원래 카드 버튼을 제거하고 `선택됨` 표시를 남긴다.
- 새 메시지로 워크벤치 링크를 보낸다.
- 링크는 `/admin/content-studio/research-workbench?telegramIssue=1&...` 형태다.

현재 링크 방식:

```text
telegramIssue=1
issueId
issueTitle
issueHook
issueWhy
issueChanged
issueSource
```

워크벤치가 이 query를 읽어 selectedIssue를 자동 세팅한다.

### 2.4 워크벤치에 텔레그램 후보 발송 버튼 추가

파일:

```text
app/admin/content-studio/research-workbench/ResearchWorkbenchClient.js
```

변경:
- `[1] 최근 이슈 찾기` 영역에 `텔레그램으로 후보 보내기` 버튼 추가.
- 현재 선택한 주제 축, 기간, localStorage 이력, Claude가 만든 Sonar 프롬프트가 있으면 함께 사용한다.
- 발송 완료 시 후보 수, 수신자 수, 제외 이력 수를 표시한다.
- 텔레그램 선택 링크로 진입하면 해당 이슈가 선택된 상태로 표시된다.

---

## 3. 현재 적용된 검증

실행한 검증:

```text
node -c app/admin/content-studio/layout.js
node -c app/admin/content-studio/research-workbench/ResearchWorkbenchClient.js
node -c app/api/admin/content-studio/research-workbench/issues/notify/route.js
node -c app/api/webhook/telegram/route.js
npm run build
```

결과:
- `node -c` 모두 통과.
- `npm run build`는 sandbox 네트워크 제한 상태에서는 Google Fonts fetch 실패.
- 네트워크 허용 상태에서는 build 성공.
- 브라우저 확인:
  - `/admin/content-studio/research-workbench` 정상 렌더.
  - 기본 탭에 `검토함` 미노출.
  - `텔레그램으로 후보 보내기` 버튼 노출.
  - `telegramIssue=1` query 진입 시 이슈 자동 선택 정상.

---

## 4. 다음 세션이 알아야 할 미완성점

### 4.1 텔레그램 선택 후 “완전 자동 생성”은 아직 아님

현재는 선택 링크로 워크벤치 진입까지만 자동화했다.

다음 단계로 가능하지만 신중해야 하는 것:

```text
issue_select 클릭
→ 서버에서 Claude plan
→ Sonar research
→ Writer R1/R2
→ draft 저장
```

현재 정욱님이 계속 문맥/어순/근거 검수를 하고 있으므로, 당장은 워크벤치 검수 게이트를 유지하는 것이 안전하다.

### 4.2 issue candidate 저장 테이블은 아직 없음

현재 후보는 DB 저장 없이 전송된다.

필요해질 때 선택지:
- `issue_planning_candidates` 같은 별도 테이블 신설
- 혹은 `planning_sessions`에 issue 모드로 저장

단, DB 작업 전에는 반드시 `SELECT` precheck와 백업 규칙을 지켜야 한다.

### 4.3 URL query 방식은 MVP

텔레그램 카드 텍스트에서 제목/훅/이유/변화/출처를 파싱해서 URL query로 넘긴다.

장점:
- DB 마이그레이션 없음.
- 배포 전 리스크 낮음.

단점:
- 긴 텍스트는 URL 길이와 인코딩 제약이 있다.
- 후보 원문 전체나 citations는 보존하지 않는다.

후속 개선 시 DB 저장 또는 signed payload 방식을 고려한다.

---

## 5. 배포 관련 주의

정욱님이 이번 대화에서 “배포하자”라고 명시했다.
따라서 이번에는 `git push origin main`이 허용된다.

그래도 다음 원칙은 유지:
- 배포 전 `npm run build` 통과 확인.
- push 후 운영 Vercel 배포는 GitHub main 자동 배포로 예상.
- 직접 Vercel CLI 배포는 현재 확인하지 않았다.

---

## 6. 다음 작업 후보

1. 운영 배포 후 `/admin/content-studio/research-workbench` 접속 확인.
2. `텔레그램으로 후보 보내기` 실제 버튼 테스트.
3. 텔레그램에서 `이 이슈로 시작` 클릭.
4. 운영 URL에서 워크벤치 query 진입 확인.
5. 선택된 이슈로 Claude 해석 → Sonar 리서치 → R1/R2 한 번 끝까지 검수.

