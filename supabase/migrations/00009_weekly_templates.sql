CREATE TABLE weekly_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weekly_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES weekly_templates(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#c8d4e8'
);

CREATE INDEX idx_weekly_template_blocks_template_id
  ON weekly_template_blocks(template_id);

ALTER TABLE weekly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_template_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON weekly_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own template blocks"
  ON weekly_template_blocks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM weekly_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM weekly_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  ));
