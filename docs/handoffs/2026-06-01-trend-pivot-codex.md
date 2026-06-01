# 핸드오프 — 트렌드 기반 기획 에이전트 신설 (코덱스용)

> **이 문서는 새 작업 도구(코덱스 등)가 이전 맥락을 끊김 없이 이어받기 위한 인수인계 프롬프트다.**
> 정욱님이 직접 작성한 의도(원문 인용)와, Claude(이전 세션)가 함께 구축한 시스템 현황·안전 규칙을 한 장에 담는다.
> **필독 순서**: 본 문서 → `HANDOFF_GUIDE.md` → `docs/threads-pipeline-overview.md` → `AGENTS.md`

---

## 1. 프로젝트 컨텍스트

- **프로젝트**: 기브니즈 (Giveneeds) — B2B 마케팅 에이전시. 콘텐츠 자동화 파이프라인 운영 중.
- **현재 트랙**: Threads 콘텐츠 자동 생성·검수·발행.
- **기술 스택**: Next.js 16 App Router (JavaScript) + Supabase + OpenAI(gpt-4o-mini 기본) + Perplexity Sonar + Tavily + Apify(Threads). Vercel 배포.
- **운영 도메인**: `https://www.giveneeds.co.kr`

## 2. 직전 시스템 상태 (Claude 세션 종료 시점)

### Phase 0 (수집) — 현재 사용 중이지만 *별로*
6개 `agent_sources` active:
- `google_news`: "AI 마케팅", "SaaS growth"
- `naver_news`: "B2B 마케팅", "콘텐츠 마케팅"
- `hackernews`: "marketing, growth, b2b, saas, seo, conversion, customer, branding"
- `reddit`: "smallbusiness:AI marketing"

오케스트레이터: `lib/agent/runCollection.js`
각 collector: `lib/collectors/{naverNews,googleNewsRss,hackerNews,redditRss,socialSearch}.js`

### Phase 1·2 (보고·생성) — 직전까지 *적용된 강화*

| 단계 | 강화 |
|---|---|
| enrich | **R1** tactical_signal (추상 키워드 페널티 / 전술 키워드 가산) |
| sharpening | **D1+D2** 8필드 (planning_purpose · reader_takeaway · proof_anchor_type 추가) |
| research (Perplexity) | **R2-b** TACTICAL_SYSTEM_PROMPT + tactical_concreteness 0~5 |
| research (queries) | **R2-a** 한국어 1 + 영어 2~3 (전술 우선) |
| snapshot | **R2-c**·**Stage 1** F### freeze + 점수 보존 |
| Architect | **Stage 2a** STRUCTURE_MAP v1~v7 + 슬롯 명세 + **D5** reader_takeaway 슬롯 운반 |
| Writer per-variant | **D3** variantHint 톤 매칭 + **D4** BAD/GOOD + 정량 톤 risk_flag |
| Writer 사후 | **Stage 1** F### 라벨 sanitize |
| 후처리 | **D4** measureToneMetrics → 자동 risk_flag |

전체 도식: **`docs/threads-pipeline-overview.md`** (mermaid 그림 포함, 필독)

### 직전 e2e 결과 진단 (정욱님 평가)
- 톤은 D3·D4 후 명확히 살아남 (반말 단서·변칙 호흡·이모지 등장)
- 알맹이 substance 는 *추상 주제 자체의 한계* — 어떤 강화로도 못 풂
- **결론**: 원천(수집 단계) 이 약함. 키워드 기반 광범위 수집의 한계.

---

## 3. 정욱님이 직접 명시한 *새 방향* (원문)

> "현재 구글 네이버 뉴스, 레딧, 해커 뉴스 등 다양한 곳에서 우리가 설정해놓은 키워드대로 자료를 수집하고 있다. 하지만 여기서 자료를 수집하니 자료의 유용성이 없다.
>
> 우선 유용성 있는 자료를 들고 오기 위해선 트렌드(시의성)을 따져야 한다. 현재 사람들이 이 정보를 원하는가? 많이 검색을 하고 있는가? 반응이 있는가?
>
> 이것을 파악하기 위해서는 메타를 활용해보려 하였다. 하지만 현재 메타의 경우에는 한계가 있는 것 같다. 일본과 미국에서 많이 검색되고 있는 트렌드만 긁어올 뿐더러, 실제로 확인해보니 연예·정치 등 관련한 주제만 트렌드로 노출되고 있는 것을 볼 수 있었다. 즉 내가 원하는 타겟 군에게 필요한 키워드들은 뜨지 않았다. 또한 세그먼트를 분리하여 내가 원하는 카테고리만 파악할 수 없는 한계가 있다.
>
> 그래서 현재 고민 중인 것은 우리가 사전에 합의해놓은 문서를 따라 기획을 하는 에이전트가 필요할 것 같다.
>
> 이 에이전트의 모델은 어떤 것을 쓸지 아직까지 고려를 하지 않았지만 퍼플렉시티를 활용할 예정이다. 3개의 api가 있는데, 그 중 다양한 모델이 결합되어있는 에이전트 api를 활용할까 한다. ChatGPT·Claude Code 등을 오퍼레이션하여 활용할 수 있기 때문에 범용적일 것 같다. 또한 리서치 기능도 탁월하기에 구현 복잡도 없이 간단하게 테스트를 해볼 수 있을 것 같다.
>
> 우선 에이전트가 먼저 내부 문서에 따른 타겟·사용자 맥락을 고려하여서 트렌드를 파악하고 콘텐츠의 큰 방향을 결정한다. 큰 방향이 생성되면 검증을 한다. 사용자에게 반응이 있을 것 같은지, 사용자는 어떤 정보를 얻고 싶어할지, 실질적으로 도움이 되는지 등. 제일 베이스로 이 부분을 검증한다.
>
> 어떤 형식으로 스레드를 발행할 것인지 이때 정하고, 만약 사용자의 기준에 부합하지 않았다면 이후 워크플로우는 실현하지 않는다. 의미 없는 토큰을 소모하지 않기 위해서다.
>
> 이후 사용자의 결정으로 우선적으로 통과를 하면 그 콘텐츠를 만들기 위한 객관적인 자료를 리서치한다. 리서치를 하기 위해 리서치를 위한 프롬프트도 생성을 한다. 프롬프트에 따라 어떤 리서치 자료가 나오는지 사용자가 검증을 하며 1차적으로 리서치 품질 기준을 정한다."

## 4. 새 워크플로우 (정욱님 명세를 단계 분해)

```
Step 1. 기획 에이전트 — 내부 문서 + 타겟·맥락 → 트렌드 파악 → 콘텐츠 큰 방향
        모델: Perplexity Agent API (3종 중 *Agent API* — 다양한 모델 결합형)

Step 2. 큰 방향 검증
        검증 축:
          (a) 사용자에게 반응이 있을 것 같은가
          (b) 사용자는 어떤 정보를 얻고 싶어 하는가
          (c) 실질적으로 도움이 되는가
        + Threads 발행 형식 결정 (single_post / short_thread / resource_thread 등)

Step 3. 사용자 검증 게이트 ★ (가장 중요)
        사용자가 기준 부합 X 판단 → *이후 워크플로우 중단*
        목적: 의미 없는 토큰 소모 방지

Step 4. 통과 시 → 객관적 자료 리서치
        리서치용 프롬프트도 에이전트가 *자동 생성*
        사용자가 결과 보며 *리서치 품질 기준 1차 정의*

Step 5. (이후) 기존 finishPlanningSession → Architect → Writer 흐름 연결
        (기존 코드 재사용)
```

### 핵심 변화 요약

| 영역 | Before | After (이 방향) |
|---|---|---|
| 트렌드 감지 | Meta(Threads/IG) — 한계 명확 | Perplexity Agent API + 내부 문서 기반 추론 |
| 입력 | 6개 cron 키워드 수집 풀 | 내부 문서(타겟·맥락) + 트렌드 가설 |
| 사용자 위치 | 후보 7개 중 선택 후 자동 진행 | 큰 방향 검증 게이트 + 리서치 결과 검증 게이트 |
| 토큰 절약 | 한계 X | 게이트 미통과 시 즉시 중단 |
| 기존 6개 cron | 메인 | *유지하되* 별도 트랙 / feature flag |

---

## 5. 작업 안전 규칙 (필수 준수)

이 규칙은 정욱님이 직접 명시했고 메모리에 박혀 있음. 반드시 따를 것.

### (1) `git push` 금지 — 명시 승인 전까지
- `git commit` 은 로컬에서 OK (작업 분리·롤백용)
- `git tag` 도 로컬에서 OK
- `git push origin` 절대 금지 — 정욱님이 "push 해줘" / "배포해줘" 라고 *명시적으로* 말할 때까지 X
- **Why**: 검수 안 거친 변경이 prod 가면 발견 어렵고 롤백 비용 큼

### (2) 프론트 골격 → 백 연결 순서
- 새 기능 만들 때 빈 프론트 페이지(시각화 + 입력 + mock 데이터) 먼저
- 그 위에 백 연결 (실제 LLM·API 호출)
- 백부터 짜고 나중에 프론트 붙이는 순서 X
- **Why**: 정욱님이 *클릭하면서 프롬프트·결과 차이 직접 검수*. 백부터 짜면 검수 사이클이 안 돌고 별로일 때 시간 허비 큼

### (3) 기존 코드 한 줄도 안 지움
- 새 트렌드 기반 흐름은 **별도 모듈**:
  - 새 함수: `lib/agent/runTrendDrivenPlanning.js` (또는 적절한 이름)
  - 새 페이지: `/admin/content-studio/research-workbench` (또는 협의 후 결정)
  - feature flag: `process.env.USE_TREND_PIPELINE === 'true'` 환경변수로 토글
- 기존 cron / `runCollection` / `composeDailyReport` / `finishPlanningSession` 흐름 **그대로 살림**
- **Why**: 새 방향 별로면 환경변수 한 줄 토글로 기존 흐름 복귀. 롤백 비용 ≈ 0

### (4) 큰 변경 전 안전망 4가지
- git tag (예: `v-pre-trend-pivot`) — 시점 복원 5초
- HANDOFF_GUIDE.md 에 "현재 상태" 섹션 (이 문서가 그 역할)
- 새 코드 별도 모듈 + feature flag
- 실험 일지 `docs/experiments/*.md` (.gitignore — 정욱님 로컬만)

### (5) 실험 일지·작업 메모 = 로컬만
- `docs/experiments/` 폴더는 `.gitignore` 등록 (정욱님이 본인만 본다)
- 단일 파일 500줄 넘기지 않기 → sub 파일로 분리 + README 인덱스 1줄 요약
- 메모리 파일: `~/.claude/projects/-Users-jungwook-Documents-GitHub-oh-my-openagent-give-randing/memory/`

---

## 6. 참고 자료 위치 (작업 시작 전 읽을 것)

### 시스템 도식·문서
- `docs/threads-pipeline-overview.md` ★ — 트리거→발행까지 전체 mermaid 도식
- `HANDOFF_GUIDE.md` ★ — 기존 핸드오프 가이드 (정욱님이 매 세션 시작 시 확인 요청하는 파일)
- `AGENTS.md` ★ — 프로젝트 작업 규칙 (HANDOFF_GUIDE 확인 요청 hard rule 등)
- `CLAUDE.md` — @AGENTS.md 만 reference

### 메모리 (정욱님 선호·과거 결정)
- `~/.claude/projects/-Users-jungwook-Documents-GitHub-oh-my-openagent-give-randing/memory/MEMORY.md` (인덱스)
- 특히:
  - `feedback_work_safety.md` — 위 5번 안전 규칙 원본
  - `project_experiments_folder.md` — 일지 폴더 규약
  - `project_giveneeds_identity.md` — B2B 마케팅 에이전시 정체성
  - `project_realbody_samples.md` — `threads-realbody-*` 데이터 경로 (gitignore 함정 주의)
  - `project_routes_overview.md` — 어드민 라우트 지도
  - `project_data_model.md` — DB 모델

### 내부 문서 (기획 에이전트가 참조할 것)
- `docs/content-personas.md` — 타겟 페르소나 (restaurant_owner / clinic_owner / general)
- `config/content-pillars.json` — content_pillar 5종 + engagement_intent 5종 SSOT
- `docs/content-logic/threads/*.md` — Threads 형식·hook·구조 가이드
- `lib/agent/contentOntology.js` — 금지어 + 핵심 enum SSOT
- `docs/reference-data/threads-realbody-*.json` — 손수 큐레이션 톤 샘플 8개 (tone_meta 포함)

### 정욱님이 명시한 *우리 관심 주제* (트렌드와 연결할 영역)
- 마케팅 GEO (지역 마케팅)
- 네이버 플레이스
- AI 활용 판촉 이미지
- 비즈니스 일반
- AI
- 자영업자에게 도움 되는 정보:
  - 대출 · 배달비 이슈 · 혜택·지원 · 마케팅 진행 사례 · 개선 사례

---

## 7. 이번 작업 — 첫 단계 (프론트 우선)

### 신규 페이지 — `/admin/content-studio/research-workbench` (이름 협의 가능)

세로 4단계 흐름, 각 단계가 *독립적 사이클* (수정 → 재실행):

```
┌─ [0] 기존 내부 문서 자동 로드 (펼치기) ─────────────────────────┐
│   페르소나 · 기둥 · 발행 톤·구조 · 우리 관심 주제 6종         │
└──────────────────────────────────────────────────────────┘

┌─ [1] 무엇을 찾을지 추론 ────────────────────────────────────┐
│   트렌드 가설(수동 입력) + 관심 주제 체크                     │
│   [AI 한테 추론 시키기] → Perplexity Agent API 호출         │
│   → 필요한 자료 목록 (사용자가 항목별 편집·추가·삭제)         │
└──────────────────────────────────────────────────────────┘

┌─ [2] 검색 프롬프트 자동 작성 ─────────────────────────────┐
│   각 자료마다 LLM 이 검색 프롬프트 생성 (textarea 편집 가능)   │
│   검색 도구 선택: Perplexity Sonar / Tavily / Claude search   │
│   [개별 검색] [전체 일괄 검색]                              │
└──────────────────────────────────────────────────────────┘

┌─ [3] 결과 + 점수 + 사용자 검증 게이트 ★ ─────────────────┐
│   각 자료별 findings + 전술점수 + 출처                       │
│   [더 정확하게 다시 묻기] [프롬프트 수정] [버린다]            │
│   ★ 게이트: 사용자가 통과 안 시키면 다음 단계 X (토큰 절약)  │
└──────────────────────────────────────────────────────────┘

┌─ [4] 다음 단계 — 기획·Writer 핸드오프 ───────────────────┐
│   채택된 자료 → 기존 finishPlanningSession 흐름으로 넘김    │
└──────────────────────────────────────────────────────────┘
```

### 만들 순서 (각 단계가 PR 분리)
1. **빈 페이지 + [0] 박스 (내부 문서 자동 로드)** — 시각화만, LLM 0
2. **[1] mock** — 버튼 누르면 더미 자료 목록 출력
3. **[1] 실제 LLM 연결** — Perplexity Agent API 호출 + 응답 표시
4. **[2] mock → 실제** — 프롬프트 자동 생성
5. **[3] mock → 실제** — Perplexity Sonar + Tavily 둘 다 호출, 비교 가능
6. **[3] 사용자 검증 게이트** — "통과" / "재시도" / "중단" 버튼
7. **[4] 핸드오프** — 채택된 자료를 기존 `finishPlanningSession` 으로 넘기는 어댑터

### 각 단계마다 확인할 것
- 빌드 통과 (`npm run build`)
- 정욱님이 로컬 :3000 에서 직접 클릭 검수
- 마음에 들면 `git commit` (push 는 별도 명시 승인 시점)

---

## 8. 미결정 항목 (정욱님과 논의하며 결정)

| 항목 | 현 상태 |
|---|---|
| **트렌드 반열 정의** | 미정 — 사용자가 결과 보면서 정함 |
| **리서치 품질 기준** | 미정 — Step 5 에서 사용자 검수로 1차 정의 |
| **사용 모델** | Perplexity Agent API 우선. 보조로 Tavily(이미 사용) / Claude web_search / Exa 등 옵션 |
| **페이지 이름·경로** | `/admin/content-studio/research-workbench` 제안. 협의 후 결정 |
| **기존 cron 6개 처리** | 유지(빈도만 줄임) vs 완전 중단 — 협의 필요 |

---

## 9. 환경 정보

- 로컬 dev 서버: `npm run dev` (포트 3000) — 이미 켜져 있을 수 있음
- 환경변수: `.env.local`
  - `OPENAI_API_KEY`, `OPENAI_THREAD_MODEL=gpt-4o`, `OPENAI_PLANNING_MODEL=gpt-4o-mini`
  - `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL=sonar` (기본)
  - `TAVILY_API_KEY`, `APIFY_TOKEN`
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `TELEGRAM_WEBHOOK_SECRET`
- Supabase 프로젝트: `jbbxwogpuimruzuyurkl`
- 직전 commit: `2dfd8f7 feat(content-agent): D5 — Architect 가 기획 축...`

---

## 10. 첫 응답 가이드 (코덱스가 정욱님에게 줄 답)

코덱스가 이 문서 읽고 정욱님에게 *처음* 답할 때:

1. "맥락 파악했음" 짧게 확인 (이 문서 + HANDOFF_GUIDE + threads-pipeline-overview 읽었다고)
2. 첫 작업으로 어디부터 갈지 제안 — **빈 페이지 + [0] 박스 (내부 문서 자동 로드)** 부터가 안전
3. 페이지 경로 / 이름 / 컴포넌트 위치 협의 (기존 `app/admin/content-studio/*` 패턴 참고)
4. 작업 시작 전 — 안전망 4가지 깔린 상태인지 확인 (git tag · feature flag · 실험 일지 폴더 등)
5. **push 금지** 룰 재확인하고 진행
