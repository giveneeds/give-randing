-- ============================================================
-- GIVENEEDS 콘텐츠 자동화 에이전트 — 투명성·거버넌스 스키마
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- 안전: 신규 테이블 3개만 생성. 기존 데이터 영향 없음.
--
-- 통합 가이드: tools/content-mvp/INTEGRATION.md
-- 대시보드: /admin/content-studio
-- ============================================================

-- 1) agent_jobs — 잡 실행 이력
CREATE TABLE IF NOT EXISTS agent_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',     -- running | success | partial | failed
    trigger TEXT NOT NULL DEFAULT 'manual',      -- cron | manual
    stats JSONB DEFAULT '{}'::jsonb,            -- {collected, failed, skipped, by_source:{...}}
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_started_at
    ON agent_jobs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status
    ON agent_jobs (status);

-- 2) agent_items — 수집 결과 (검수 단위)
CREATE TABLE IF NOT EXISTS agent_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES agent_jobs(id) ON DELETE SET NULL,
    source TEXT NOT NULL,                       -- youtube | threads | instagram | hackernews | web
    source_account TEXT,                        -- 채널/계정명 (HN은 NULL)
    post_id TEXT NOT NULL,                      -- 플랫폼 내 식별자 또는 sha256(url) prefix
    post_url TEXT NOT NULL,
    posted_at TIMESTAMPTZ,                      -- 게시물 작성 시각 (수집 시각과 별개)
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 다른 세션이 채우는 데이터 (tools/content-mvp/ 출력 매핑)
    raw_data JSONB,                             -- {source_url, domain, raw_html, fetched_at}
    normalized JSONB,                           -- {title, extracted_text, headings, meta_description, published_at}
    classification JSONB,                       -- {suggested_persona, suggested_topic_cluster, classification_confidence, matched_keywords}
    summary JSONB,                              -- {one_line_summary, key_points, why_it_matters}

    -- 운영자 검수 필드 (이 세션이 UPDATE)
    status TEXT NOT NULL DEFAULT 'collected',   -- collected | reviewed | approved | rejected | sent
    send_flag BOOLEAN NOT NULL DEFAULT false,   -- 다이제스트 발송 여부 토글
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    note TEXT,                                  -- 운영자 내부 메모

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 같은 플랫폼 안에서는 post_id가 고유. 중복 수집 자동 차단.
    UNIQUE (source, post_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_items_source_status
    ON agent_items (source, status);
CREATE INDEX IF NOT EXISTS idx_agent_items_collected_at
    ON agent_items (collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_items_posted_at
    ON agent_items (posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_agent_items_job_id
    ON agent_items (job_id);
CREATE INDEX IF NOT EXISTS idx_agent_items_send_flag
    ON agent_items (send_flag) WHERE send_flag = true;

-- 3) agent_ai_logs — LLM 호출 이력 (현재 비어있어도 OK, 미래 대비)
CREATE TABLE IF NOT EXISTS agent_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES agent_items(id) ON DELETE CASCADE,
    job_id UUID REFERENCES agent_jobs(id) ON DELETE SET NULL,
    stage TEXT NOT NULL,                        -- summarize | classify | digest | rerank
    model TEXT NOT NULL,                        -- gpt-4o-mini | claude-haiku-4-5 ...
    prompt TEXT NOT NULL,
    response TEXT,
    input_tokens INT,
    output_tokens INT,
    cost_usd NUMERIC(10, 6),
    latency_ms INT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_created_at
    ON agent_ai_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_item_id
    ON agent_ai_logs (item_id);
CREATE INDEX IF NOT EXISTS idx_agent_ai_logs_stage
    ON agent_ai_logs (stage);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_agent_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_items_updated_at ON agent_items;
CREATE TRIGGER trg_agent_items_updated_at
    BEFORE UPDATE ON agent_items
    FOR EACH ROW EXECUTE FUNCTION set_agent_items_updated_at();

-- ============================================================
-- RLS — admin / superadmin 만 SELECT. INSERT/UPDATE/DELETE는 service_role.
-- ============================================================
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ai_logs ENABLE ROW LEVEL SECURITY;

-- 헬퍼: 현재 인증된 사용자가 admin/superadmin 인지
CREATE OR REPLACE FUNCTION is_agent_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'superadmin')
    );
$$ LANGUAGE SQL STABLE;

-- agent_jobs
DROP POLICY IF EXISTS "admin read agent_jobs" ON agent_jobs;
CREATE POLICY "admin read agent_jobs"
    ON agent_jobs FOR SELECT
    USING (is_agent_admin());

-- agent_items
DROP POLICY IF EXISTS "admin read agent_items" ON agent_items;
CREATE POLICY "admin read agent_items"
    ON agent_items FOR SELECT
    USING (is_agent_admin());

-- agent_ai_logs
DROP POLICY IF EXISTS "admin read agent_ai_logs" ON agent_ai_logs;
CREATE POLICY "admin read agent_ai_logs"
    ON agent_ai_logs FOR SELECT
    USING (is_agent_admin());

-- INSERT/UPDATE/DELETE 정책은 만들지 않음 → RLS가 차단.
-- 서버 사이드 (service_role)에서만 쓰기 가능. supabaseAdmin 클라이언트 사용.

-- ============================================================
-- 시드 데이터 (MVP 검증용 — 운영 적용 시 별도 INSERT 안 함)
-- 이미 같은 (source, post_id) 가 있으면 무시.
-- ============================================================
DO $$
DECLARE
    seed_job_id UUID := gen_random_uuid();
BEGIN
    -- 시드 잡 1건
    INSERT INTO agent_jobs (id, started_at, finished_at, status, trigger, stats)
    VALUES (
        seed_job_id,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour 50 minutes',
        'success',
        'manual',
        '{"collected": 3, "failed": 0, "skipped": 1, "by_source": {"youtube": 1, "hackernews": 2}}'::jsonb
    )
    ON CONFLICT DO NOTHING;

    -- 시드 아이템 3건
    INSERT INTO agent_items (
        job_id, source, source_account, post_id, post_url, posted_at,
        raw_data, normalized, classification, summary,
        status, send_flag
    )
    VALUES
    (
        seed_job_id, 'hackernews', NULL, 'hn-39000001', 'https://news.ycombinator.com/item?id=39000001',
        NOW() - INTERVAL '3 hours',
        '{"source_url": "https://news.ycombinator.com/item?id=39000001", "domain": "news.ycombinator.com", "fetched_at": "2026-05-14T03:00:00+09:00"}'::jsonb,
        '{"title": "Show HN: A new framework for content automation", "extracted_text": "We built a framework that connects scraping, LLM summarization, and delivery in a single workflow...", "headings": ["Show HN: A new framework for content automation"], "meta_description": "Open source content automation toolkit", "published_at": "2026-05-13"}'::jsonb,
        '{"suggested_persona": "clinic_owner", "suggested_topic_cluster": "ad_efficiency", "classification_confidence": 0.42, "matched_keywords": [{"keyword": "automation", "where": "title", "count": 1}]}'::jsonb,
        '{"one_line_summary": "콘텐츠 수집·요약·발송을 단일 워크플로우로 연결하는 오픈소스 프레임워크 출시.", "key_points": ["스크래퍼·LLM·발송이 한 흐름", "Next.js 기반", "MIT 라이선스"], "why_it_matters": "자체 콘텐츠 자동화 구축 시 참고할 만한 구조."}'::jsonb,
        'collected', false
    ),
    (
        seed_job_id, 'hackernews', NULL, 'hn-39000002', 'https://news.ycombinator.com/item?id=39000002',
        NOW() - INTERVAL '4 hours',
        '{"source_url": "https://news.ycombinator.com/item?id=39000002", "domain": "news.ycombinator.com", "fetched_at": "2026-05-14T03:00:00+09:00"}'::jsonb,
        '{"title": "Why we moved from MongoDB to Postgres JSONB", "extracted_text": "Our team migrated all unstructured data from MongoDB to Postgres JSONB...", "headings": ["Why we moved from MongoDB to Postgres JSONB", "Migration strategy", "Lessons learned"], "meta_description": null, "published_at": "2026-05-13"}'::jsonb,
        '{"suggested_persona": "unknown", "suggested_topic_cluster": "unclassified", "classification_confidence": 0.18, "matched_keywords": []}'::jsonb,
        '{"one_line_summary": "MongoDB에서 Postgres JSONB로 비정형 데이터를 이전한 팀의 경험 공유.", "key_points": ["JSONB가 의외로 충분히 빠름", "운영 DB 통합 효과", "관계형 + 비정형 혼합 패턴"], "why_it_matters": "기브니즈 콘텐츠 통 설계와 직접 연결되는 사례."}'::jsonb,
        'reviewed', true
    ),
    (
        seed_job_id, 'youtube', 'UCfz8x0lVzJpb_dgWm9kPVrw', 'yt:video:abc123demo', 'https://www.youtube.com/watch?v=abc123demo',
        NOW() - INTERVAL '6 hours',
        '{"source_url": "https://www.youtube.com/watch?v=abc123demo", "domain": "www.youtube.com", "fetched_at": "2026-05-14T03:00:00+09:00"}'::jsonb,
        '{"title": "DevOps Toolkit: 2026 Kubernetes 베스트 프랙티스", "extracted_text": "이번 영상에서는 2026년 기준 Kubernetes 운영의 베스트 프랙티스를 다룹니다...", "headings": [], "meta_description": null, "published_at": "2026-05-13"}'::jsonb,
        '{"suggested_persona": "unknown", "suggested_topic_cluster": "unclassified", "classification_confidence": 0.05, "matched_keywords": []}'::jsonb,
        '{"one_line_summary": "2026년 기준 Kubernetes 운영의 베스트 프랙티스 정리.", "key_points": ["GitOps 표준화", "보안 컨텍스트 강화", "관측성 도구 통합"], "why_it_matters": null}'::jsonb,
        'collected', false
    )
    ON CONFLICT (source, post_id) DO NOTHING;
END $$;
