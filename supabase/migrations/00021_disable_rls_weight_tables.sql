-- 00019에서 추가된 weight 테이블에 00013 규칙(단일 사용자 RLS 비활성화) 적용
-- 기존 00013 배치에는 포함되지 않아, 일관성을 위해 명시적으로 추가.
BEGIN;

ALTER TABLE IF EXISTS weight_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weight_goal    DISABLE ROW LEVEL SECURITY;

COMMIT;
