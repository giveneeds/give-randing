-- =============================================================
-- GIVENEEDS 챗봇 워크플로우 — 전체 마이그레이션
-- 실행 순서대로 Supabase SQL Editor에 붙여 넣고 RUN 해 주세요.
-- 멱등하게 설계되어 있어 여러 번 실행해도 안전합니다.
-- =============================================================

-- 0) leads 테이블에 user_id 연결 컬럼 추가
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);

-- 1) chat_sessions (신규)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  trail JSONB DEFAULT '{}'::jsonb,
  answers JSONB DEFAULT '{}'::jsonb,
  current_step TEXT DEFAULT 'greet',
  ai_summary TEXT,
  ai_summary_updated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead ON chat_sessions(lead_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_sessions_own_rw" ON chat_sessions;
CREATE POLICY "chat_sessions_own_rw" ON chat_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) chat_messages 확장 (기존 테이블 보존)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS choices JSONB,
  ADD COLUMN IF NOT EXISTS step TEXT,
  ADD COLUMN IF NOT EXISTS session_uuid UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_uuid ON chat_messages(session_uuid);

-- 기존 public read/write 정책은 그대로 두되, 소유자 전용 정책을 추가로 부여합니다.
DROP POLICY IF EXISTS "chat_messages_own_rw" ON chat_messages;
CREATE POLICY "chat_messages_own_rw" ON chat_messages
  FOR ALL
  USING (
    session_uuid IS NULL
    OR EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = chat_messages.session_uuid AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_uuid IS NULL
    OR EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = chat_messages.session_uuid AND s.user_id = auth.uid()
    )
  );

-- 3) chatbot_recommendations (신규 — 챗봇 전용 큐레이션 레이어)
CREATE TABLE IF NOT EXISTS chatbot_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  concern_tags TEXT[] DEFAULT '{}',     -- 예: {'revenue','acquisition','unclear','etc'}
  industry_tags TEXT[] DEFAULT '{}',    -- 예: {'food','beauty','clinic','legal','ecommerce','education','wellness'}
  impact_note TEXT,                     -- "시장 규모/예상 파급 효과" 카피
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chatbot_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chatbot_rec_public_read" ON chatbot_recommendations;
CREATE POLICY "chatbot_rec_public_read" ON chatbot_recommendations
  FOR SELECT
  USING (is_active = true);
-- 쓰기는 service_role (서버 API 라우트)에서만 이루어지므로 INSERT/UPDATE 정책은 추가하지 않습니다.

-- 4) 초기 시드 — services 테이블에서 주요 항목을 자동 임포트
-- 이미 추가된 서비스는 service_id 기반으로 스킵됩니다.
INSERT INTO chatbot_recommendations (service_id, title, one_liner, concern_tags, industry_tags, impact_note, priority)
SELECT
  s.id,
  s.title,
  COALESCE(s.subtitle, LEFT(s.description, 80)),
  ARRAY[]::text[],
  ARRAY[]::text[],
  NULL,
  COALESCE(s.order_num, 0)
FROM services s
WHERE s.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM chatbot_recommendations r WHERE r.service_id = s.id
  );

-- 완료 메시지
SELECT 'chatbot_workflow migration complete' AS status;
