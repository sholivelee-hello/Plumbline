-- Finance Section Full Redesign Migration
-- Rebuilds finance schema for 4-group architecture (obligation/necessity/sowing/want)

BEGIN;

-- ============================================================
-- Step 1: Drop existing triggers and function
-- ============================================================

DROP TRIGGER IF EXISTS trg_recalc_balance_insert ON finance_transactions;
DROP TRIGGER IF EXISTS trg_recalc_balance_update ON finance_transactions;
DROP TRIGGER IF EXISTS trg_recalc_balance_delete ON finance_transactions;
DROP FUNCTION IF EXISTS recalculate_account_balance();

-- ============================================================
-- Step 2: Alter finance_transactions
-- ============================================================

-- 2. Add new columns to finance_transactions
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS group_id TEXT,
  ADD COLUMN IF NOT EXISTS item_id TEXT,
  ADD COLUMN IF NOT EXISTS income_category TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 3. Migrate account_id → group_id/item_id
-- NOTE: account_id is declared UUID but the app stores text budget keys like "obligation_tithe".
-- Guard clause: only migrate rows where account_id looks like a budget key (contains '_').
UPDATE finance_transactions
SET
  group_id = split_part(account_id::text, '_', 1),
  item_id = CASE
    WHEN position('_' IN account_id::text) > 0
    THEN substring(account_id::text FROM position('_' IN account_id::text) + 1)
    ELSE NULL
  END
WHERE account_id IS NOT NULL
  AND account_id::text LIKE '%_%';

-- Integrity check: ensure no transactions have NULL group_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM finance_transactions WHERE group_id IS NULL) THEN
    RAISE EXCEPTION 'Migration integrity check failed: % transactions have NULL group_id',
      (SELECT COUNT(*) FROM finance_transactions WHERE group_id IS NULL);
  END IF;
END $$;

-- 4. Drop FK constraint and old columns
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_account_id_fkey;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS account_id;
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_category_id_fkey;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS category_id;
ALTER TABLE finance_transactions DROP COLUMN IF EXISTS is_auto;

-- 5. Cast amount to integer
ALTER TABLE finance_transactions ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::integer;

-- 6. Add indexes (IF NOT EXISTS to avoid conflict with existing indexes)
DROP INDEX IF EXISTS idx_finance_transactions_user_date;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date ON finance_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_group ON finance_transactions(user_id, group_id, date);

-- ============================================================
-- Step 3: Alter existing tables
-- ============================================================

-- 7. Alter finance_debts: add tags, updated_at
ALTER TABLE finance_debts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE finance_debts ALTER COLUMN total_amount TYPE INTEGER USING ROUND(total_amount)::integer;

-- 8. Alter finance_installments: add updated_at
ALTER TABLE finance_installments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE finance_installments ALTER COLUMN total_amount TYPE INTEGER USING ROUND(total_amount)::integer;
ALTER TABLE finance_installments ALTER COLUMN monthly_payment TYPE INTEGER USING ROUND(monthly_payment)::integer;

-- 9. Alter finance_debt_payments: amount to integer
ALTER TABLE finance_debt_payments ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::integer;

-- 10. Alter heaven_bank: add created_at, amount to integer
ALTER TABLE heaven_bank
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE heaven_bank ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::integer;

-- 11. Drop and recreate finance_budgets (existing data is in localStorage, not meaningful here)
-- Existing rows have UUID category_ids that don't map to the new group/item system.
-- Budget data will be re-created via localStorage migration (Task 22) or fresh setup.
DROP TABLE IF EXISTS finance_budgets CASCADE;
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  group_id TEXT NOT NULL,
  item_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data" ON finance_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Step 4: Create new tables
-- ============================================================

-- 12. finance_budget_settings
CREATE TABLE finance_budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_income INTEGER NOT NULL DEFAULT 0,
  group_configs JSONB NOT NULL DEFAULT '[]'::jsonb,
  income_categories JSONB NOT NULL DEFAULT '["급여","부수입","투자수익","용돈","기타"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. finance_wishlist
CREATE TABLE finance_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  saved_amount INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. finance_recurring
CREATE TABLE finance_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  group_id TEXT,
  item_id TEXT,
  income_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. finance_recurring_logs
CREATE TABLE finance_recurring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id UUID REFERENCES finance_recurring(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  transaction_id UUID REFERENCES finance_transactions(id) ON DELETE CASCADE NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_id, month)
);

-- 16. finance_onboarding
CREATE TABLE finance_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_demo_mode BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Step 5: RLS + cleanup
-- ============================================================

-- 17. RLS for new tables
ALTER TABLE finance_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON finance_budget_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_wishlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON finance_recurring FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own logs" ON finance_recurring_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM finance_recurring r WHERE r.id = recurring_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM finance_recurring r WHERE r.id = recurring_id AND r.user_id = auth.uid()));
CREATE POLICY "Users manage own data" ON finance_onboarding FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_finance_wishlist_user ON finance_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_user ON finance_recurring(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_logs_month ON finance_recurring_logs(recurring_id, month);

-- 19. Migrate finance_obligations → finance_recurring
INSERT INTO finance_recurring (user_id, description, amount, type, day_of_month, group_id, item_id, is_active)
SELECT DISTINCT ON (o.user_id, c.title)
  o.user_id,
  c.title,
  ROUND(o.amount)::integer,
  'expense',
  1,
  'obligation',
  LOWER(REPLACE(c.title, ' ', '_')),
  true
FROM finance_obligations o
JOIN finance_categories c ON c.id = o.category_id
WHERE o.amount > 0;

-- 20. Migrate finance_wants → finance_wishlist
INSERT INTO finance_wishlist (user_id, title, target_amount, saved_amount, priority, is_completed, completed_at, created_at)
SELECT
  user_id, title,
  COALESCE(ROUND(estimated_price)::integer, 0),
  0,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_month, id),
  is_purchased,
  purchased_date::timestamptz,
  now()
FROM finance_wants;

-- 21. Drop obsolete tables
DROP TABLE IF EXISTS finance_obligations CASCADE;
DROP TABLE IF EXISTS finance_wants CASCADE;
DROP TABLE IF EXISTS finance_accounts CASCADE;
DROP TABLE IF EXISTS finance_categories CASCADE;

COMMIT;
