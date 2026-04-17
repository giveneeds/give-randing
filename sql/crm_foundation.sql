-- ============================================================
-- GIVENEEDS CRM Foundation: 리드 추적 + 이벤트 로그 + 세션
-- 실행: Supabase Dashboard → SQL Editor 에서 1회 실행.
-- 안전: 신규 테이블만 생성 + leads ALTER (IF NOT EXISTS). 기존 데이터 무영향.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1) leads 테이블 컬럼 확장 (기존 런타임 필드 정식화 + CRM 신규)
-- ────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'organic';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_page TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_referrer TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS click_element TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inquiry_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS magazine_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS agreements JSONB;

-- CRM 신규 필드
ALTER TABLE leads ADD COLUMN IF NOT EXISTS anonymous_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_visit_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_touch_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel_group TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_leads_anonymous_id ON leads (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads (channel_group);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);

-- ────────────────────────────────────────────────
-- 2) lead_sessions: 방문자 세션
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    first_url TEXT,
    last_url TEXT,
    landing_url TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    channel_group TEXT,
    device_type TEXT,
    browser TEXT,
    ip_country TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_sessions_anon ON lead_sessions (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_lead_sessions_lead ON lead_sessions (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sessions_start ON lead_sessions (session_start DESC);

-- ────────────────────────────────────────────────
-- 3) lead_events: 행동 이벤트 로그
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES lead_sessions(id) ON DELETE SET NULL,
    anonymous_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_session ON lead_events (session_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_anon ON lead_events (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events (event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_events (created_at DESC);

-- ────────────────────────────────────────────────
-- 4) lead_notes: 리드별 활동 기록 / 메모
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    author TEXT DEFAULT 'admin',
    note_type TEXT DEFAULT 'note',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes (lead_id);

-- ────────────────────────────────────────────────
-- 5) cta_config: CTA ↔ PDF 매핑 (Phase 3용, 스키마 선정의)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cta_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cta_id TEXT UNIQUE NOT NULL,
    label TEXT,
    pdf_path TEXT,
    email_subject TEXT,
    email_body_html TEXT,
    followup_enabled BOOLEAN DEFAULT false,
    followup_days INTEGER[] DEFAULT '{5}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 6) RLS 정책
-- ────────────────────────────────────────────────
ALTER TABLE lead_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cta_config ENABLE ROW LEVEL SECURITY;

-- 익명 방문자도 세션/이벤트 INSERT 가능 (트래킹 목적)
DROP POLICY IF EXISTS "Public insert sessions" ON lead_sessions;
CREATE POLICY "Public insert sessions" ON lead_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public read sessions" ON lead_sessions;
CREATE POLICY "Public read sessions" ON lead_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert events" ON lead_events;
CREATE POLICY "Public insert events" ON lead_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public read events" ON lead_events;
CREATE POLICY "Public read events" ON lead_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read notes" ON lead_notes;
CREATE POLICY "Public read notes" ON lead_notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert notes" ON lead_notes;
CREATE POLICY "Public insert notes" ON lead_notes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read cta_config" ON cta_config;
CREATE POLICY "Public read cta_config" ON cta_config FOR SELECT USING (true);

-- lead_sessions/events UPDATE (lead_id 스티칭용)
DROP POLICY IF EXISTS "Public update sessions" ON lead_sessions;
CREATE POLICY "Public update sessions" ON lead_sessions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public update events" ON lead_events;
CREATE POLICY "Public update events" ON lead_events FOR UPDATE USING (true);
