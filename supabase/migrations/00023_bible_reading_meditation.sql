-- 통독·묵상 트래킹
-- 100일 통독 사이클, 시편 150편 묵상 사이클

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS bible_reading_start_date DATE,
  ADD COLUMN IF NOT EXISTS meditation_start_date DATE;

CREATE TABLE IF NOT EXISTS bible_reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_chapters INTEGER NOT NULL DEFAULT 0,
  checked_chapters INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS bible_reading_chapter_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  ord INTEGER NOT NULL,
  label TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, ord)
);

CREATE TABLE IF NOT EXISTS meditation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  psalm_number INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bible_reading_logs_user_date ON bible_reading_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bible_reading_chapter_checks_user_date ON bible_reading_chapter_checks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meditation_logs_user_date ON meditation_logs(user_id, date);

ALTER TABLE bible_reading_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE bible_reading_chapter_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_logs DISABLE ROW LEVEL SECURITY;
