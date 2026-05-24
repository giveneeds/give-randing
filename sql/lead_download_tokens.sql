-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: lead_download_tokens 테이블 — basic 모드 1회용 다운로드 토큰
--
-- 목적:
--   기본 폼(익명 이름·연락처 입력) 사용자가 폼 제출 직후 캠페인 첨부 자료를
--   "자료 카드 리스트" UI 에서 골라 다운로드할 수 있게 한다.
--   인증 없이 다운로드 API 를 호출해야 하므로 어뷰징 방지를 위해 1회용 토큰
--   기반으로 신원을 증명한다.
--
-- 정책:
--   - 토큰은 폼 제출 성공 시 서버가 lead 와 1:1 로 발급
--   - 동일 토큰으로 15분 동안 같은 캠페인의 모든 활성 자료 다운로드 가능
--   - used_at 은 첫 다운로드 시 기록 (감사 추적용). 만료/사용 후엔 다운로드 불가
--
-- 안전성:
--   - lead_id, campaign_id 모두 ON DELETE CASCADE → 부모 삭제 시 자동 정리
--   - 기존 테이블·데이터에 영향 0%
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_download_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유효 토큰 빠른 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_lead_download_tokens_valid
  ON lead_download_tokens (token, campaign_id, expires_at)
  WHERE used_at IS NULL;

-- RLS: 토큰 발급은 service_role 만, 검증도 server 측에서 service_role 로 수행
ALTER TABLE lead_download_tokens ENABLE ROW LEVEL SECURITY;

-- 익명/anon 키는 토큰 테이블에 직접 접근 불가 (server-side 검증만 허용)
-- (정책 미정의 = 모든 접근 거부 — service_role 만 우회)

NOTIFY pgrst, 'reload schema';

-- 사후검증
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'lead_download_tokens';
-- SELECT pg_size_pretty(pg_relation_size('lead_download_tokens'));
