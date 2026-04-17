BEGIN;

-- Add tags column to finance_debts (TEXT array, default empty)
ALTER TABLE finance_debts
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
