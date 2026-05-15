# tools/content-mvp ↔ /admin/content-studio 통합 가이드

이 문서는 **다른 세션이 `tools/content-mvp/`에서 만드는 결과를 Supabase에 INSERT 하는 방법**을 정의합니다.
어드민 대시보드(`/admin/content-studio`)는 이 스키마를 SELECT/UPDATE 합니다. 두 세션의 유일한 접점.

- 스키마 SSOT: [`sql/agent-content-mvp-schema.sql`](../../sql/agent-content-mvp-schema.sql) + [`sql/agent-content-mvp-phase1.sql`](../../sql/agent-content-mvp-phase1.sql)
- 대시보드: [`app/admin/content-studio/`](../../app/admin/content-studio/)

## Phase 1 추가사항 (2026-05-14)

- **신규 컬럼**: `agent_items.translation`, `agent_items.notified_at`, `agent_items.notification_message_id`, `agent_items.approved_via` — 다른 세션은 **건드릴 필요 없음** (어드민/봇이 lazy 채움).
- **신규 테이블**: `agent_sources` — 어드민에서 추적 대상(YT 채널 / Threads 핸들 / IG 핸들 / HN 키워드) 등록. **다른 세션은 active=true 행을 SELECT 해서 수집 입력으로 사용.**
- **신규 테이블**: `agent_telegram_recipients` — 어드민/봇이 관리. 다른 세션은 무관.

### agent_sources 활용 (다른 세션 수집기에서)
```ts
const { data: sources } = await supabase
  .from('agent_sources')
  .select('source_type, identifier, label, meta')
  .eq('active', true);

// source_type 별로 분기하여 수집기 호출
for (const s of sources) {
  if (s.source_type === 'youtube') await crawlYouTube(s.identifier);
  else if (s.source_type === 'hackernews') await crawlHN(s.identifier, s.meta?.score_min ?? 100);
  // ...
}

// 수집 완료 후 last_collected_at 업데이트
await supabase
  .from('agent_sources')
  .update({ last_collected_at: new Date().toISOString() })
  .in('id', collectedSourceIds);
```

---

## 사전 준비 (한 번만)

1. Supabase Dashboard → SQL Editor에서 `sql/agent-content-mvp-schema.sql` 실행.
2. 환경변수에 service_role 키 확보:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (RLS 우회용 — **서버 사이드에서만** 사용)

---

## 흐름

```
┌──────────────────────────────┐
│ tools/content-mvp/ 워크플로우 │
│                                │
│ 1. seed-urls.json 로드          │
│ 2. Playwright 크롤링            │
│ 3. Readability 본문 추출        │
│ 4. ruleBasedClassifier 분류     │
│ 5. extractive 요약 생성         │
└──────────────────────────────┘
              ↓ 본 문서가 정의하는 통합 지점
┌──────────────────────────────┐
│ Supabase                       │
│  agent_jobs    ← 1행 INSERT     │
│  agent_items   ← N행 INSERT     │
└──────────────────────────────┘
              ↓
       /admin/content-studio (자동 표시)
```

---

## INSERT 절차 (의사 코드)

### A. 잡 시작 시

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const { data: job, error } = await supabase
  .from('agent_jobs')
  .insert({
    started_at: new Date().toISOString(),
    status: 'running',
    trigger: 'manual',         // 또는 'cron'
    stats: {},
  })
  .select('id')
  .single();

const jobId = job.id;
```

### B. 각 ProcessedDoc 당 1행 INSERT

`tools/content-mvp/src/types/index.ts`의 `ProcessedDoc`을 다음 매핑으로 분해:

| ProcessedDoc 필드 | agent_items 컬럼 | 비고 |
|---|---|---|
| `source_url` | `post_url` | |
| (계산) | `post_id` | `sha256(source_url).slice(0, 16)` 권장. UNIQUE 제약용. |
| (계산) | `source` | 도메인 기반 매핑 (아래 표) |
| (선택) | `source_account` | 채널/계정명. HN은 NULL. |
| `published_at` | `posted_at` | ISO 또는 `YYYY-MM-DD` |
| `{source_url, domain, raw_html, fetched_at}` | `raw_data` | `raw_html`은 클 경우 생략 또는 별도 Storage 권장 |
| `{title, extracted_text, headings, meta_description, published_at}` | `normalized` | |
| `{suggested_persona, suggested_topic_cluster, classification_confidence, matched_keywords}` | `classification` | |
| `{one_line_summary, key_points, why_it_matters}` | `summary` | |

**도메인 → source 매핑 예시:**

| 도메인 | source |
|---|---|
| `*.youtube.com`, `youtu.be` | `youtube` |
| `threads.net` | `threads` |
| `*.instagram.com` | `instagram` |
| `news.ycombinator.com` | `hackernews` |
| 그 외 | `web` |

**예시 INSERT:**

```ts
import crypto from 'node:crypto';

function postIdFromUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function sourceFromDomain(domain: string): string {
  if (/(^|\.)youtube\.com$/.test(domain) || domain === 'youtu.be') return 'youtube';
  if (domain === 'threads.net' || /\.threads\.net$/.test(domain)) return 'threads';
  if (/(^|\.)instagram\.com$/.test(domain)) return 'instagram';
  if (domain === 'news.ycombinator.com') return 'hackernews';
  return 'web';
}

const { source_url, domain, raw_html, fetched_at,
        title, extracted_text, headings, meta_description, published_at,
        suggested_persona, suggested_topic_cluster, classification_confidence, matched_keywords,
        one_line_summary, key_points, why_it_matters } = processedDoc;

await supabase.from('agent_items').upsert({
  job_id: jobId,
  source: sourceFromDomain(domain),
  source_account: null,                          // 추후 메타에서 추출되면 채움
  post_id: postIdFromUrl(source_url),
  post_url: source_url,
  posted_at: published_at,
  raw_data: { source_url, domain, fetched_at },  // raw_html은 용량 큼 → 별도 보관 권장
  normalized: { title, extracted_text, headings, meta_description, published_at },
  classification: {
    suggested_persona,
    suggested_topic_cluster,
    classification_confidence,
    matched_keywords,
  },
  summary: { one_line_summary, key_points, why_it_matters },
  status: 'collected',
  send_flag: false,
}, {
  onConflict: 'source,post_id',                  // 중복은 무시 (또는 갱신)
  ignoreDuplicates: true,
});
```

### C. 잡 종료 시 통계 업데이트

```ts
await supabase
  .from('agent_jobs')
  .update({
    finished_at: new Date().toISOString(),
    status: failed === 0 ? 'success' : (collected > 0 ? 'partial' : 'failed'),
    stats: {
      collected,                                  // 신규 INSERT 건수
      failed,                                     // 실패 건수
      skipped,                                    // UNIQUE 충돌로 무시된 건수
      by_source: { youtube: 1, hackernews: 2, ... },
    },
    error: lastErrorMessage ?? null,
  })
  .eq('id', jobId);
```

---

## 컬럼 강제 규약

다음은 **NULL 불가**입니다. INSERT 시 반드시 제공:
- `agent_items.source` (위 매핑 표 따름)
- `agent_items.post_id`
- `agent_items.post_url`

다음은 **enum 허용 값**입니다. 그 외 값을 넣으면 어드민 화면이 깨질 수 있음:
- `agent_jobs.status`: `running` / `success` / `partial` / `failed`
- `agent_jobs.trigger`: `cron` / `manual`
- `agent_items.status`: `collected` / `reviewed` / `approved` / `rejected` / `sent`
  - 다른 세션은 **`collected`로만 INSERT**. 그 외 상태는 어드민에서 운영자가 결정.

---

## RLS 주의

- 일반 클라이언트 키(`anon`)로는 **INSERT 불가**. `SUPABASE_SERVICE_ROLE_KEY` 필수.
- service_role 키는 **서버 사이드에서만** 사용 (Node 스크립트, Server Action, API Route).
- 절대 클라이언트 번들에 포함되면 안 됨.

---

## 빠른 검증

INSERT 후 다음 확인:

1. `SELECT count(*) FROM agent_items WHERE job_id = '<insert한 jobId>';` — 예상 건수와 일치?
2. `SELECT source, count(*) FROM agent_items GROUP BY source;` — 소스 분포 확인.
3. 어드민 `/admin/content-studio` 접속 → 카드로 표시되는지.
4. 어드민 `/admin/content-studio/jobs` → 잡 한 행이 보이고 `stats` JSON 펼침 동작 확인.

---

## LLM 단계 연결 시 (미래)

`agent_ai_logs` 테이블에 호출 이력 기록:

```ts
await supabase.from('agent_ai_logs').insert({
  item_id: itemId,
  job_id: jobId,
  stage: 'summarize',                       // summarize | classify | digest | rerank
  model: 'gpt-4o-mini',                     // 또는 'claude-haiku-4-5'
  prompt: fullPromptString,
  response: modelResponse,
  input_tokens: usage.prompt_tokens,
  output_tokens: usage.completion_tokens,
  cost_usd: estimatedCost,
  latency_ms: Date.now() - startedAt,
});
```

이 시점부터 `/admin/content-studio/ai-logs`에 자동 노출.

---

## 변경 시 합의

이 문서의 매핑 표(섹션 B)와 컬럼 규약(섹션 "컬럼 강제 규약")이 **두 세션의 계약**입니다.
스키마 변경이 필요하면 본 세션에게 알리고 `sql/agent-content-mvp-schema.sql` 마이그레이션부터 갱신해야 합니다.
