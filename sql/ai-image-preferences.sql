-- AI 이미지 생성 선호도 누적 학습 테이블
-- 관리자가 3장 중 1장을 선택할 때마다 그 선택 메타데이터를 저장해
-- 같은 카테고리에서 다음 생성 시 프롬프트에 선호 요소를 자동 반영.

CREATE TABLE IF NOT EXISTS ai_image_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT,
  prompt TEXT NOT NULL,
  style TEXT,
  style_tags TEXT[] DEFAULT '{}',
  selected_image_url TEXT NOT NULL,
  paragraph_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_image_pref_category_created
  ON ai_image_preferences (category, created_at DESC);

-- RLS: 어드민만 읽기/쓰기 (서버 service_role 키 사용 시 우회)
ALTER TABLE ai_image_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read ai_image_preferences" ON ai_image_preferences;
CREATE POLICY "admin read ai_image_preferences"
  ON ai_image_preferences FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin write ai_image_preferences" ON ai_image_preferences;
CREATE POLICY "admin write ai_image_preferences"
  ON ai_image_preferences FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
