CREATE TABLE basics_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('spiritual', 'physical')),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('check', 'number')),
  unit TEXT,
  target_value NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE basics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES basics_templates(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  value NUMERIC,
  completed_at TIMESTAMPTZ,
  UNIQUE(template_id, date)
);

ALTER TABLE basics_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE basics_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON basics_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own logs"
  ON basics_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
