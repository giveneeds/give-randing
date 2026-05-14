-- ============================================================
-- Phase 1: 텔레그램 양방향 + 번역 + 소스 관리
-- 실행: Supabase Dashboard → SQL Editor (이미 MCP로 적용 완료. 참조용)
-- 선행: sql/agent-content-mvp-schema.sql (Phase 0)
-- ============================================================

-- 1) agent_items 컬럼 추가
ALTER TABLE agent_items
  ADD COLUMN IF NOT EXISTS translation JSONB,           -- {translated_title, translated_text, translated_summary, source_lang, translated_at, model}
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,     -- 마지막 텔레그램 발송 시각
  ADD COLUMN IF NOT EXISTS notification_message_id BIGINT,  -- 텔레그램 message_id (콜백 매핑용)
  ADD COLUMN IF NOT EXISTS approved_via TEXT;           -- 'telegram' | 'admin' | NULL

-- 2) agent_sources — 어드민에서 등록하는 추적 대상
CREATE TABLE IF NOT EXISTS agent_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,           -- youtube | threads | instagram | hackernews
    identifier TEXT NOT NULL,             -- 채널 ID / 핸들(@제외) / HN 키워드
    label TEXT,                           -- 표시명
    active BOOLEAN NOT NULL DEFAULT true,
    last_collected_at TIMESTAMPTZ,
    meta JSONB DEFAULT '{}'::jsonb,       -- 예: {score_min: 100} for HN
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_type, identifier)
);

CREATE INDEX IF NOT EXISTS idx_agent_sources_active ON agent_sources (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_agent_sources_type ON agent_sources (source_type);

-- 3) agent_telegram_recipients — 텔레그램 봇 알림 수신자
CREATE TABLE IF NOT EXISTS agent_telegram_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    active BOOLEAN NOT NULL DEFAULT false,    -- 어드민 활성화 전까지 발송 X
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_recipients_active ON agent_telegram_recipients (active) WHERE active = true;

-- 4) updated_at 트리거
CREATE OR REPLACE FUNCTION set_agent_sources_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_sources_updated_at ON agent_sources;
CREATE TRIGGER trg_agent_sources_updated_at
    BEFORE UPDATE ON agent_sources FOR EACH ROW EXECUTE FUNCTION set_agent_sources_updated_at();

CREATE OR REPLACE FUNCTION set_agent_recipients_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_recipients_updated_at ON agent_telegram_recipients;
CREATE TRIGGER trg_agent_recipients_updated_at
    BEFORE UPDATE ON agent_telegram_recipients FOR EACH ROW EXECUTE FUNCTION set_agent_recipients_updated_at();

-- 5) RLS — admin/superadmin SELECT, 쓰기는 service_role
ALTER TABLE agent_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_telegram_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read agent_sources" ON agent_sources;
CREATE POLICY "admin read agent_sources" ON agent_sources FOR SELECT USING (is_agent_admin());

DROP POLICY IF EXISTS "admin read agent_telegram_recipients" ON agent_telegram_recipients;
CREATE POLICY "admin read agent_telegram_recipients" ON agent_telegram_recipients FOR SELECT USING (is_agent_admin());
