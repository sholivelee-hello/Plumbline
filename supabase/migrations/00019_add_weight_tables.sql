-- 체중 관리 테이블 (weight_entries + weight_goal)
BEGIN;

CREATE TABLE IF NOT EXISTS weight_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  weighed_on  DATE NOT NULL,
  weight_kg   NUMERIC(5,1) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date
  ON weight_entries (user_id, weighed_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS weight_goal (
  user_id     TEXT PRIMARY KEY,
  target_kg   NUMERIC(5,1) NOT NULL CHECK (target_kg > 0 AND target_kg < 1000),
  deadline    DATE NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
