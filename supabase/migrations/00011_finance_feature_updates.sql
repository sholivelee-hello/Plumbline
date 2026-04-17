BEGIN;

-- 1. Add subscription_id FK to finance_recurring
ALTER TABLE finance_recurring
  ADD COLUMN IF NOT EXISTS subscription_id UUID;

-- 2. Create finance_subscriptions
CREATE TABLE IF NOT EXISTS finance_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  card_label TEXT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create finance_subscription_amount_changes (history)
CREATE TABLE IF NOT EXISTS finance_subscription_amount_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES finance_subscriptions(id) ON DELETE CASCADE NOT NULL,
  old_amount INTEGER NOT NULL,
  new_amount INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create finance_subscription_cancellations (cancellation/rejoin history)
CREATE TABLE IF NOT EXISTS finance_subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES finance_subscriptions(id) ON DELETE CASCADE NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  rejoined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add FK constraint on finance_recurring.subscription_id (after finance_subscriptions exists)
ALTER TABLE finance_recurring
  ADD CONSTRAINT finance_recurring_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES finance_subscriptions(id)
  ON DELETE CASCADE;

-- 6. Extend finance_transactions source enum by expanding the description (no CHECK constraint exists, so this is a TS-layer change)
-- Note: no DB CHECK constraint on source, so nothing to alter in DB.

-- 7. RLS for new tables
ALTER TABLE finance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_subscription_amount_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_subscription_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON finance_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own amount changes" ON finance_subscription_amount_changes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM finance_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM finance_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));

CREATE POLICY "Users manage own cancellations" ON finance_subscription_cancellations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM finance_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM finance_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_finance_subscriptions_user ON finance_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_subscriptions_active ON finance_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_subscription ON finance_recurring(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_amount_changes_sub ON finance_subscription_amount_changes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_sub ON finance_subscription_cancellations(subscription_id);

COMMIT;
