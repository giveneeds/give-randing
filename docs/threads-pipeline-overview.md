# 기브니즈 스레드 콘텐츠 파이프라인 — 리서치부터 발행까지

> 사용자가 "후보 N" 으로 답한 순간부터 Threads 발행까지의 전 단계. 함수·LLM·파일·DB 모두 포함.
> mermaid 다이어그램이 그림으로 렌더링되는 뷰어(GitHub, VSCode + Mermaid extension, Obsidian, Notion)에서 보면 됨.

## 한 장 요약

```mermaid
flowchart TD
    User([사용자: 후보 N 답변])
    User --> WH[Webhook /api/webhook/telegram]
    WH --> Finish[finishPlanningSession]

    Finish --> Load[입력 준비<br/>session · item · theme · creative_brief 8필드]
    Load --> R{리서치 3종 순차}

    R -->|A| Deep[runDeepResearch<br/>Tavily SNS + LLM]
    R -->|B| Supp[runSupplementalResearch<br/>Tavily 웹 + Perplexity + LLM]
    R -->|C| Tone[runToneResearch<br/>audit md / Tavily + LLM]

    Deep --> Snap
    Supp --> Snap
    Snap[buildFindingsSnapshot<br/>F001~ id + 점수 freeze<br/>Stage 1]

    Snap --> Arch
    Tone --> Arch
    Arch[runContentArchitect<br/>7 outlines + STRUCTURE_MAP<br/>Stage 2a · D5]

    Arch --> Extra[buildExtraContext<br/>단일 텍스트 블록]
    Extra --> Writer[convertItemToThreadDraft<br/>per-variant 7회 병렬<br/>D3 톤매칭 · D4 BAD/GOOD]
    Writer --> Post[sanitize + measure + risk_flags<br/>Stage 1 · D4]
    Post --> DB[(thread_drafts × 7)]
    DB --> Done[composeCompletionMessage<br/>+ 텔레그램 마무리 보고]
    Done --> Hub["/admin/content-studio/jobs/jobId<br/>7 variants 비교 화면"]
    Hub --> DraftPage["/admin/content-studio/thread-drafts/id<br/>단일 draft 편집"]
    DraftPage --> Pub[발행]
    Pub --> Published[(status=published)]

    classDef stage1 fill:#fff4e6,stroke:#ff9933;
    classDef stage2 fill:#e6f3ff,stroke:#3399ff;
    classDef d34 fill:#f0e6ff,stroke:#9933ff;
    classDef d12d5 fill:#e6ffe6,stroke:#33cc33;
    class Snap stage1;
    class Arch stage2;
    class Writer d34;
    class Post d34;
```

색 범례:
- 주황: Stage 1 (findings freeze + 수치 금지)
- 파랑: Stage 2a (Architect + STRUCTURE_MAP) + D5 (takeaway 슬롯 운반)
- 보라: D3 (variant별 톤 매칭) + D4 (BAD/GOOD + 정량 risk_flag)

---

## 단계 0 — 트리거 (시퀀스)

```mermaid
sequenceDiagram
    actor U as 사용자
    participant T as Telegram Bot
    participant WH as /api/webhook/telegram
    participant DB as Supabase
    participant F as finishPlanningSession

    U->>T: "후보 1"
    T->>WH: POST update
    WH->>WH: parseUserDecision()
    WH->>DB: read planning_sessions (phase1_reported)
    WH->>DB: update status=phase2_running (잠금)
    WH->>F: finishPlanningSession(sessionId, selectedItemId)
    F-->>U: (~30초 후) 텔레그램 마무리 보고
```

---

## 단계 1 — 입력 준비

`finishPlanningSession.js` 첫 부분.

| 항목 | 출처 |
|---|---|
| `session` | `planning_sessions(id)` — job_id, candidates_summary, telegram_chat_id |
| `item` | `agent_items(selectedItemId)` — classification, normalized, research_context |
| `theme` | `content_themes(item.theme_id)` |
| `creativeBrief` | `session.candidates_summary[selectedItemId].creative_brief` (8필드) |

**creative_brief 의 8필드** (sharpening 결과):

| 필드 | 의미 |
|---|---|
| `topic_title` | 발행 제목 방향 (30자 이내) |
| `reader_problem` | 독자가 겪는 현장 장면 |
| `core_angle` | 날선 주장 1문장 |
| `hook_candidate` | 첫 줄 후보 (30자 이내, 결론 미완성) |
| `evidence_needed` | 받쳐야 할 구체 근거 2~4개 |
| `planning_purpose` ★D1+D2 | `["change"|"resolve"|"improve"]` 1~2개 |
| `reader_takeaway` ★D1+D2 | "행동:" / "관점:" / "기준:" prefix 강제 |
| `proof_anchor_type` ★D1+D2 | `["numbers"|"case"|"workflow"|"comparison"]` 1~2개 |

---

## 단계 2 — 리서치 3종

```mermaid
flowchart LR
    Brief[creative_brief<br/>topic_title · angle · reader_problem]

    subgraph A["A. runDeepResearch"]
        AQ[buildQueries<br/>한국어 1 + 영어 2]
        ATav[Tavily SNS 검색 x3<br/>+ Reddit/X 보강 x2]
        ALLM[extractDeepInsights<br/>gpt-4o-mini]
        AOut["insights:<br/>source_signal<br/>hook_patterns<br/>audience_reactions<br/>adapted_angles<br/>missing_context"]
        AQ --> ATav --> ALLM --> AOut
    end

    subgraph B["B. runSupplementalResearch"]
        BQ[buildSupplementalQueries<br/>한1 + 영3 · 전술 우선 R2-a]
        BTav[Tavily 일반 웹 x4]
        BPplx["askPerplexity<br/>TACTICAL_SYSTEM_PROMPT R2-b<br/>tactical_concreteness 0~5"]
        BSum[summarizeSupplementalResearch<br/>gpt-4o-mini]
        BOut["evidence_points<br/>각 항목 점수 + specifics<br/>점수 ≤1 컷"]
        BQ --> BTav --> BSum
        BQ --> BPplx --> BSum --> BOut
    end

    subgraph C["C. runToneResearch"]
        CAud[audit md 최신<br/>또는 Tavily threads.com fallback]
        CLLM[extractToneInsights<br/>gpt-4o-mini]
        COut["rhythm_example 6~8줄<br/>voice_patterns<br/>phrases_to_borrow/avoid"]
        CAud --> CLLM --> COut
    end

    Brief --> AQ
    Brief --> BQ
    Brief --> CAud
```

### Perplexity 시스템 프롬프트 핵심 (R2-b)
- **PRIORITIZE**: practitioner first-person ("I ran X with Y prompt and got Z"), exact tool names, measurable outcomes, failure stories with cause
- **EXCLUDE**: corporate blog posts, "X is important" type, predictions, generic best-practices, vendor marketing
- 각 finding 에 `tactical_concreteness` 0~5 점수 + `specifics` 배열 (도구·수치·명령)
- 점수 ≤1 자동 제외, 내림차순 정렬

---

## 단계 3 — Findings Snapshot Freeze ★ Stage 1

```mermaid
flowchart TD
    Deep["deep.insights<br/>source_signal<br/>hook_patterns<br/>audience_reactions"]
    Supp["supp.evidence_points<br/>+ how_to_use<br/>+ citation"]
    Pplx["supp.perplexity.findings<br/>+ tactical_concreteness<br/>+ specifics<br/>+ source_url"]

    Deep --> Build
    Supp --> Build
    Pplx --> Build

    Build[buildFindingsSnapshot]
    Build --> Snap["snapshot 배열<br/>각 항목:<br/>id F001~<br/>source type<br/>text<br/>citation<br/>how_to_use<br/>tactical_concreteness<br/>specifics"]

    Snap --> Sort[tactical_concreteness 내림차순 정렬]
    Sort --> Final[(허용 풀<br/>Writer 가 본문에<br/>수치·고유명사·인용<br/>쓸 수 있는 범위)]
```

**핵심 원칙**: Writer 가 본문에 수치/고유명사/인용을 쓰려면 이 snapshot 안의 `F###` 가 그 사실을 직접 명시해야 함. 범위 밖은 *학습된 그럴듯한 숫자* 라도 금지.

---

## 단계 4 — Content Architect ★ Stage 2a + D5

```mermaid
flowchart TD
    In["입력:<br/>creative_brief 8필드<br/>findings_snapshot<br/>rhythm_example"]

    SM["STRUCTURE_MAP<br/>variant_id 별 강제 배정<br/><br/>v1 before_after<br/>v2 info_vs_criterion<br/>v3 command_to_output<br/>v4 counter_argument<br/>v5 numbers_then_meaning<br/>v6 observation_breaks_norm<br/>v7 question_engagement"]

    LLM["Architect LLM<br/>gpt-4o-mini · temp 0.5"]

    D5["★ D5 sys 보강:<br/>마지막 슬롯에 reader_takeaway 운반<br/>planning_purpose 별 마지막 슬롯 함의<br/>proof_anchor_type 별 본체 슬롯 요소"]

    Raw["outlines 7개<br/>각 outline:<br/>variant_id<br/>structure_template<br/>content_pillar<br/>engagement_intent<br/>hook_pattern<br/>fomo_mechanism<br/>slots[]"]

    Force["enforceNumericalEvidence<br/>수치 슬롯 자동 보정<br/>(role에 number/result_with/<br/>after_with/hook_number 포함)<br/>→ snapshot의 수치 finding으로 교체"]

    Out[(검증된 outlines 7개)]

    In --> LLM
    SM --> LLM
    D5 --> LLM
    LLM --> Raw --> Force --> Out
```

**각 outline 의 slot 명세** (Writer 가 형식·증거를 강제당하는 지점):

| 필드 | 의미 |
|---|---|
| `role` | 슬롯의 역할 (hook_before, criterion_claim, result_with_numbers 등) |
| `intent` | 그 슬롯이 독자에게 무엇을 일으켜야 하는가 |
| `evidence_ids` | snapshot 의 F### 핀 박힘 (자료 인용 제한) |
| `takeaway` | 슬롯이 끝났을 때 독자 머릿속에 남아야 할 것 |
| `max_chars` | 슬롯 본문 최대 글자수 (40~280) |
| `forbidden` | 이 슬롯에서 금지되는 패턴 |

---

## 단계 5 — Extra Context 조립

`buildExtraContext` 가 모든 컨텍스트를 단일 텍스트 블록으로:

```mermaid
flowchart TD
    A[1. 채택 콘셉트 + 기획<br/>brief 8필드 + planning_purpose + reader_takeaway]
    B[2. FINDINGS SNAPSHOT<br/>F### 점수 specifics 출처]
    C[3. ARCHITECT OUTLINES<br/>variant별 슬롯 명세]
    D[4. 2차 리서치<br/>source_signal / hook_patterns]
    E[5. 추가 자료<br/>evidence_points / missing_context]
    F[6. 3차 말투<br/>rhythm_example 호흡 강제]
    G[7. 3차 구조<br/>opening_patterns / first_post_rules]
    H[8. 빌려올 표현 / 피해야 할 표현]

    A --> Block[(extraContext<br/>단일 텍스트 블록)]
    B --> Block
    C --> Block
    D --> Block
    E --> Block
    F --> Block
    G --> Block
    H --> Block

    Block --> Save[(planning_sessions<br/>research_context_used<br/>영구 보존)]
    Block --> Writer[Writer 입력으로 전달]
```

---

## 단계 6 — Writer (per-variant)

```mermaid
flowchart TD
    Setup[공통 컨텍스트 1회 페치]
    KB[buildKnowledgeContext<br/>place KB · pattern harness ·<br/>persona profile · curated]
    Bad[★ D4 getThreadsBadExamples<br/>threads-bad-examples.json<br/>1개 픽]

    Setup --> KB
    Setup --> Bad

    Loop["for i in 0..6 (7 variants)"]

    Setup --> Loop

    Rot["변종 메타 배정 (rotation):<br/>variant_id = i+1<br/>assignedHook = HOOK_ROTATION[i%6]<br/>assignedIntent = intentRotation[i%5]<br/>assignedPillar = pillarRotation"]
    Out[outline = outlineByVariantId.get<br/>structure_template]

    Tone["★ D3 getThreadsRealBodySamples<br/>variantHint:<br/>hook_pattern, engagement_intent,<br/>structure_template<br/>excludeRootTexts: 이미 쓴 샘플<br/>maxSamples: 1"]

    Pick["손수 realbody-*.json 8개에서<br/>1개 매칭<br/>점수: token + (hook+2, intent+1.5,<br/>structure+1)<br/>detail-* 자동 배제"]

    LLM["generateSingleVariant<br/>gpt-4o-mini · temp 0.7"]

    Loop --> Rot
    Loop --> Out
    Rot --> Tone
    Out --> Tone
    Tone --> Pick
    Pick --> LLM
    KB --> LLM
    Bad --> LLM

    JSON["variant JSON<br/>title, posts, hook_pattern,<br/>format_type, risk_flags, ..."]
    LLM --> JSON
```

### Writer sys prompt 구조 (위에서 아래로)

```mermaid
flowchart TD
    P0[0. ontologyPrefix<br/>금지어 5종 + 대안]
    P1[★ Stage 1 1. CRITICAL<br/>snapshot 외 수치·고유명사·인용 금지<br/>F### 라벨 본문 노출 금지]
    P2[2. variant_id 고정<br/>assigned hook/intent/pillar]
    P3[★ D1+D2 3. 독자에게 무엇을 일으키는가<br/>reader_takeaway 본문 마감 운반<br/>planning_purpose 별 닫는 방향<br/>proof_anchor_type 별 필수 요소]
    P4[★ Stage 2a 4. ARCHITECT OUTLINE<br/>structure_template별 형식 강제<br/>info_vs_criterion → 1정보:기준:<br/>command_to_output → ❶❷❸<br/>before_after → 이전:이후:<br/>numbers_then_meaning → 수치 첫줄]
    P5[5. 80줄 룰셋<br/>현장어 / 변칙 호흡 10~30자 /<br/>FOMO / 금지어]
    P6[6. PAIR 1~6 BAD/GOOD]
    P7[★ D4 7. BAD<br/>threads-bad-examples<br/>너의 기본값 깨라]
    P8[★ D3 8. GOOD<br/>variantToneBlock + 정량 톤 목표<br/>평균 문장 길이<br/>종결 다양성<br/>? 2개+<br/>register 일치<br/>줄바꿈 변칙]
    P9[9. knowledgeBlock<br/>place KB / persona / harness]
    P10[10. 출력 JSON 스키마]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9 --> P10
```

---

## 단계 7 — 후처리 (sanitize · measure · risk_flag · verdict)

```mermaid
flowchart TD
    V[Writer JSON 변종 7개]

    Review[buildPerVariantReview<br/>Stage 2a]
    Verdict["verdict per variant:<br/>0개 risk = pass<br/>1~2개 = hold<br/>3개+ = fail"]
    QR["quality_review:<br/>total · pass · hold · fail"]
    V --> Review --> Verdict
    Review --> QR

    San[sanitizePosts<br/>F### 라벨 정규식 제거<br/>공백·줄바꿈 정리<br/>1000자 컷]
    Meas["★ D4 measureToneMetrics<br/>avg_sentence_chars<br/>question_count<br/>ban_hits · jon_hits<br/>generic_tail 정규식<br/>repeat_endings"]

    V --> San --> Meas

    BaseRisk["buildRiskFlags 기본:<br/>리서치 부족<br/>single_post 500자 미만<br/>총 본문 정보량 부족<br/>후속 포스트 정보 밀도 부족<br/>AI식 일반론"]
    Tone["★ D4 deriveToneRiskFlags<br/>(metrics, expectedToneMeta):<br/>문체 평균 회귀<br/>종결 다양성 부족<br/>일반화 질문 마감<br/>톤 샘플 미반영"]

    Meas --> BaseRisk
    Meas --> Tone

    Row["thread_drafts row 작성<br/>posts, hook_pattern, format_type<br/>risk_flags<br/>research_context_used:<br/>{tone_metrics,<br/>expected_tone_meta,<br/>variant_review,<br/>generation_decision}"]

    BaseRisk --> Row
    Tone --> Row
    Verdict --> Row

    Save[(thread_drafts × 7<br/>status: draft)]
    Row --> Save
```

---

## 단계 8 — finishPlanningSession 마무리

각 saved draft 에 research_context_used 를 merge·overwrite:

```mermaid
flowchart LR
    Draft[(thread_drafts × 7)]
    Draft --> Merge[research_context_used 확장]
    Merge --> RC["phase1 / creative_brief 8필드<br/>phase2_inputs_present<br/>findings_snapshot[]<br/>architect_outlines[]<br/>architect_meta<br/>phase2_deep / deep_queries<br/>supplemental_research<br/>tone_research<br/>variant_tone_samples[] D3검수용"]
    RC --> Done[completion message 작성]
    Done --> TG[Telegram 마무리 보고]
    TG --> Final[planning_sessions.update<br/>status=completed]
    Final --> ItemDone[agent_items.update<br/>status=sent · decided_at]
```

마무리 보고 텔레그램 내용:
- 주제 · 채택 제목 · 원본 URL
- 먼저 잡은 기둥 후보
- 저장된 7 draft 링크 (메타·verdict)
- 2차/추가/3차 리서치 반영 요약
- **허브 URL**: `/admin/content-studio/jobs/[jobId]`
- 대표 단건 URL: `/admin/content-studio/thread-drafts/[draftId]`

---

## 단계 9 — 어드민 검수

```mermaid
flowchart TD
    TG[텔레그램 허브 URL 클릭]
    Hub["/admin/content-studio/jobs/jobId<br/>ThreadGroupCard로 묶음<br/>7 variants 한 화면 비교<br/>title · structure · hook · intent ·<br/>format · 미리보기 · risk_flags ·<br/>verdict · 추천 표시"]
    TG --> Hub
    Hub --> Pick[마음에 드는 variant 클릭]
    Pick --> Single["/admin/content-studio/thread-drafts/id<br/>본문 단일 textarea (편집)<br/>splitPosts(빈줄 분리)<br/>buildPublishText 1/N 마커<br/>미리보기 + 발행 버튼"]

    Note["※ 현재 단계별 발자취 통합 표시 X<br/>brief 8필드 / snapshot / outline /<br/>tone_meta / tone_metrics<br/>→ research_context_used 안에 저장돼 있음<br/>추후 페이지 확장 자리"]
    Single -.-> Note
```

---

## 단계 10 — 발행

```mermaid
flowchart LR
    Click[발행 버튼 클릭]
    Click --> API[POST /api/admin/threads/publish]
    API --> Decide{발행 방식}
    Decide -->|자동| Meta[Meta Threads API<br/>POST /threads/me/threads<br/>토큰 인증]
    Decide -->|수동| Copy[buildPublishText 결과 복사<br/>사용자가 직접 발행<br/>publish_url 수동 입력]
    Meta --> Update[(thread_drafts.update<br/>status=published<br/>published_at<br/>published_url)]
    Copy --> Update
    Update --> History["/admin/content-studio/published<br/>발행 이력"]
```

---

## 부록 1 — 데이터 흐름 한 장

```mermaid
flowchart LR
    subgraph 자료["입력 자료 (DB+파일)"]
        Item[(agent_items<br/>classification<br/>+ tactical_signal)]
        Theme[(content_themes)]
        Session[(planning_sessions<br/>candidates_summary)]
        Realbody[(realbody-*.json<br/>tone_meta 8개)]
        Bad[(bad-examples.json)]
        Audit[(audit md 최신)]
        Curated[(threads-curated/*.md)]
        Persona[(content-personas.md)]
        Pillars[(content-pillars.json)]
        Ontology[(contentOntology.js)]
    end

    subgraph 처리["처리 흐름"]
        FP[finishPlanningSession]
        Snap[Snapshot]
        Arch[Architect]
        Wr[Writer x7]
        Post[후처리]
    end

    Item --> FP
    Theme --> FP
    Session --> FP
    FP --> Snap
    Snap --> Arch
    Arch --> Wr
    Realbody --> Wr
    Bad --> Wr
    Audit --> Wr
    Curated --> Wr
    Persona --> Wr
    Pillars --> Wr
    Ontology --> Wr
    Wr --> Post

    Post --> Draft[(thread_drafts x7)]
    Draft --> Hub[어드민 허브]
    Hub --> Pub[발행]
    Pub --> Done[(status=published)]
```

---

## 부록 2 — Phase 2 LLM 호출 집계 (한 사용자 답변당)

| 호출 | 모델 | 횟수 | 단계 |
|---|---|---|---|
| Deep Research insight | gpt-4o-mini | 1 | runDeepResearch |
| Supplemental Perplexity | Sonar API | 1 | askPerplexity |
| Supplemental summary | gpt-4o-mini | 1 | summarizeSupplementalResearch |
| Tone Research | gpt-4o-mini | 1 | extractToneInsights |
| Architect | gpt-4o-mini | 1 | runContentArchitect |
| Writer × 7 | gpt-4o-mini | 7 | generateSingleVariant 병렬 |
| **합계** | — | **11 + 1** | — |

대략 비용 ~$0.03/실행 (Writer 합산 약 $0.02 + 나머지)

---

## 부록 3 — 파일·DB 테이블 매핑

### 파일 (Writer/Architect 참조)

| 파일 | 용도 | 적용 단계 |
|---|---|---|
| `docs/reference-data/threads-realbody-*.json` | 손수 톤 샘플 8개 + tone_meta | ★ D3 |
| `docs/reference-data/threads-bad-examples.json` | BAD 1~2개 (AI 말투 회귀) | ★ D4 |
| `docs/reference-data/threads-popular-post-audit-*.md` | Apify 주차 감사 | runToneResearch |
| `docs/reference-data/threads-curated/*.md` | 큐레이션 KB | Writer knowledgeBlock |
| `docs/reference-data/threads-reference-detail-*.json` | 스크래퍼 임시 (.gitignore) | 톤 매칭에서 자동 배제 |
| `docs/content-personas.md` | persona 프로필 | Writer knowledgeBlock |
| `docs/content-logic/threads/*.md` | pattern harness | Writer knowledgeBlock |
| `config/content-pillars.json` | pillar / intent SSOT | choosePillarStrategy |
| `lib/agent/contentOntology.js` | 금지어 + enum SSOT | ontologyPrefix |
| `lib/agent/runContentArchitect.js` | STRUCTURE_MAP SSOT | runContentArchitect |

### DB 테이블

| 테이블 | 주 내용 |
|---|---|
| `agent_items` | 원문 + classification (R1 tactical_signal 포함) |
| `content_themes` | 주제 매핑 |
| `planning_sessions` | 1차/2차 세션 + candidates_summary (8필드 brief) |
| `thread_drafts` | 7 variants + research_context_used 전체 흔적 |
| `agent_telegram_recipients` | 텔레그램 발송 대상 |
| `agent_ai_logs` | 모든 LLM 호출 자동 로깅 (prompt + response) |

---

## 부록 4 — 적용된 강화 단계 매핑

| 강화 | 위치 | 무엇을 |
|---|---|---|
| **R1** tactical_signal | `lib/llm.js` `computeTacticalSignal` | enrich fit_score 에 ×0.6~1.4 곱셈. 추상 키워드 페널티 / 전술 키워드 가산 |
| **R2-a** 전술 쿼리 | `runDeepResearch.js`, `runSupplementalResearch.js` `buildQueries` | 한국어 1 + 영어 2~3. reddit/twitter actual workflow + ROI numbers |
| **R2-b** Perplexity TACTICAL | `lib/research/perplexityProvider.js` | 시스템 프롬프트 재작성. tactical_concreteness 0~5 + specifics |
| **R2-c** snapshot 점수 | `finishPlanningSession.js` `buildFindingsSnapshot` | 점수 보존 + 정렬 + 컷 |
| **Stage 1** snapshot freeze + hard rule | `finishPlanningSession.js` + `convertItemToThreadDraft.js` | F### id 부여 / Writer sys 에 CRITICAL 수치·고유명사·인용 금지 + sanitize F### 라벨 제거 |
| **Stage 2a** Architect | `lib/agent/runContentArchitect.js` 신설 | STRUCTURE_MAP v1~v7 강제. slot에 evidence_ids 핀 박기. enforceNumericalEvidence |
| **D1+D2** sharpening 8필드 | `composeDailyReport.js` `sharpenCreativeBriefs` | planning_purpose / reader_takeaway / proof_anchor_type 추가 |
| **D3** variant 톤 매칭 | `lib/knowledge/loader.js` `getThreadsRealBodySamples` + per-variant 페치 | tone_meta 라벨링 + variantHint matching + excludeRootTexts 누적 |
| **D4** BAD/GOOD + 정량 risk_flag | `threads-bad-examples.json` 신설 + `measureToneMetrics` + `deriveToneRiskFlags` | sys prompt BAD/GOOD 비교 + 코드 자동 측정 |
| **D5** Architect 기획 운반 | `runContentArchitect.js` sys prompt 보강 | 마지막 슬롯에 reader_takeaway / planning_purpose 별 슬롯 함의 / proof_anchor_type 별 요소 |

---

## 부록 5 — 함수·파일 참조 색인

```
[Phase 2 진입]
  app/api/webhook/telegram/route.js
  lib/agent/finishPlanningSession.js   ← 마스터 오케스트레이터

[리서치]
  lib/agent/runDeepResearch.js
  lib/agent/runSupplementalResearch.js
  lib/agent/runToneResearch.js
  lib/research/searchProvider.js       (Tavily 래퍼)
  lib/research/perplexityProvider.js   (Sonar API)

[기획·구성]
  lib/agent/composeDailyReport.js      (sharpenCreativeBriefs)
  lib/agent/runContentArchitect.js     (STRUCTURE_MAP + outlines)

[작성·후처리]
  lib/agent/convertItemToThreadDraft.js   (Writer per-variant)
  lib/knowledge/loader.js                 (실제 톤·BAD·KB 페치)
  lib/agent/contentOntology.js            (금지어·enum SSOT)
  lib/agent/contentPillarStrategy.js      (pillar/intent rotation)

[발신]
  lib/agent/sendPlanningMessage.js     (텔레그램 전송)

[어드민]
  app/admin/content-studio/jobs/[jobId]/page.js
  app/admin/content-studio/thread-drafts/[id]/page.js
  app/admin/content-studio/sessions/[sessionId]/page.js
  app/admin/content-studio/published/page.js
```
