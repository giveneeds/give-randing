-- 매거진 리드마그넷(첨부 자료 다운로드) 표시 토글
-- Supabase Dashboard → SQL Editor 에서 1회 실행
--
-- 안전 ALTER: 컬럼이 없을 때만 추가, 기본값 false로 모든 기존 매거진은 OFF 상태가 됨.
-- 기존 데이터를 덮어쓰지 않으며, 이후 어드민 에디터에서 글마다 ON 가능.

ALTER TABLE magazines
  ADD COLUMN IF NOT EXISTS show_resources BOOLEAN DEFAULT false;

-- 컬럼이 이미 존재했을 가능성에 대비해 명시적으로 모든 기존 행을 false로 정렬.
-- (DEFAULT로 들어왔다면 변화 없음)
UPDATE magazines SET show_resources = false WHERE show_resources IS NULL;

-- Supabase 스키마 캐시 재로딩
NOTIFY pgrst, 'reload schema';
