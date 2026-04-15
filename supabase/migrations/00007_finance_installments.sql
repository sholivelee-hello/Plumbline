CREATE TABLE finance_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  total_months INTEGER NOT NULL,
  paid_months INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON finance_installments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_finance_installments_user ON finance_installments(user_id);
