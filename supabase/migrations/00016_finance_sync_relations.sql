-- Finance Data Sync Relations Migration
-- Ensures every "child" record (debt_payment, installment_payment, heaven_bank entry)
-- is linked to its canonical finance_transactions row via transaction_id FK
-- with ON DELETE CASCADE. This gives us DB-level atomic sync:
--   - Delete a transaction → linked child row is auto-removed.
--   - Delete a domain record (debt/installment) → children cascade.
-- Backward direction (delete child → delete transaction) is handled in app layer
-- by deleting via transaction_id when possible.

BEGIN;

-- ============================================================
-- 1. finance_debt_payments: add transaction_id FK
-- ============================================================

ALTER TABLE finance_debt_payments
  ADD COLUMN IF NOT EXISTS transaction_id UUID
    REFERENCES finance_transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_finance_debt_payments_transaction
  ON finance_debt_payments(transaction_id);

-- ============================================================
-- 2. finance_installment_payments: new per-payment table
-- ============================================================
-- The old schema only tracked `paid_months` as an integer counter on
-- finance_installments. We now record each month payment individually so:
--   - Deleting a transaction CASCADEs and removes the payment record.
--   - Progress is derived as COUNT(*) instead of a counter that can drift.
-- `paid_months` column is kept for backward compatibility during app rollout;
-- it will be ignored by the refactored hook.

CREATE TABLE IF NOT EXISTS finance_installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  installment_id UUID NOT NULL
    REFERENCES finance_installments(id) ON DELETE CASCADE,
  transaction_id UUID
    REFERENCES finance_transactions(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  paid_at DATE NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (installment_id, month_number)
);

ALTER TABLE finance_installment_payments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_installment_payments_installment
  ON finance_installment_payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_finance_installment_payments_transaction
  ON finance_installment_payments(transaction_id);

-- ============================================================
-- 3. heaven_bank: add transaction_id FK
-- ============================================================

ALTER TABLE heaven_bank
  ADD COLUMN IF NOT EXISTS transaction_id UUID
    REFERENCES finance_transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_heaven_bank_transaction
  ON heaven_bank(transaction_id);

-- ============================================================
-- 4. Backfill: link existing finance_debt_payments to transactions
-- ============================================================
-- Best-effort: match by (user_id, date, amount) with source='debt'.
-- If multiple transactions match, pick the earliest-inserted that isn't
-- already claimed by another payment. Orphans remain with NULL transaction_id
-- and can be cleaned up or manually linked later.

WITH candidates AS (
  SELECT
    p.id AS payment_id,
    t.id AS tx_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.id ORDER BY t.id
    ) AS p_rank,
    ROW_NUMBER() OVER (
      PARTITION BY t.id ORDER BY p.id
    ) AS t_rank
  FROM finance_debt_payments p
  JOIN finance_transactions t
    ON t.source = 'debt'
   AND t.user_id = p.user_id
   AND t.date = p.date
   AND t.amount = p.amount
  WHERE p.transaction_id IS NULL
),
matches AS (
  SELECT payment_id, tx_id
  FROM candidates
  WHERE p_rank = 1 AND t_rank = 1
)
UPDATE finance_debt_payments p
SET transaction_id = m.tx_id
FROM matches m
WHERE p.id = m.payment_id;

-- ============================================================
-- 5. Backfill: heaven_bank.transaction_id
-- ============================================================

WITH candidates AS (
  SELECT
    h.id AS hb_id,
    t.id AS tx_id,
    ROW_NUMBER() OVER (
      PARTITION BY h.id ORDER BY t.id
    ) AS h_rank,
    ROW_NUMBER() OVER (
      PARTITION BY t.id ORDER BY h.id
    ) AS t_rank
  FROM heaven_bank h
  JOIN finance_transactions t
    ON t.source = 'heaven_bank'
   AND t.user_id = h.user_id
   AND t.date = h.date
   AND t.amount = h.amount
   AND (
     (h.type = 'sow' AND t.type = 'expense') OR
     (h.type = 'reap' AND t.type = 'income')
   )
  WHERE h.transaction_id IS NULL
),
matches AS (
  SELECT hb_id, tx_id
  FROM candidates
  WHERE h_rank = 1 AND t_rank = 1
)
UPDATE heaven_bank h
SET transaction_id = m.tx_id
FROM matches m
WHERE h.id = m.hb_id;

-- ============================================================
-- 6. Backfill: finance_installment_payments from paid_months counter
-- ============================================================
-- For existing installments, create one payment row per paid month.
-- We cannot reliably match these to pre-existing transactions (no stored
-- description discriminator), so transaction_id stays NULL for legacy rows.
-- The app-layer refactor ensures all NEW payments have both records linked.

DO $$
DECLARE
  rec RECORD;
  i INTEGER;
BEGIN
  FOR rec IN SELECT * FROM finance_installments WHERE paid_months > 0 LOOP
    FOR i IN 1..rec.paid_months LOOP
      INSERT INTO finance_installment_payments (
        user_id, installment_id, month_number, paid_at, amount
      ) VALUES (
        rec.user_id,
        rec.id,
        i,
        -- start_date is stored as TEXT in "YYYY-MM" format; append day for valid date.
        (rec.start_date || '-01')::date,
        rec.monthly_payment
      )
      ON CONFLICT (installment_id, month_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 7. Orphan diagnostics (informational)
-- ============================================================

DO $$
DECLARE
  orphan_debt_payments INTEGER;
  orphan_heaven_bank INTEGER;
  orphan_installment_payments INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_debt_payments
    FROM finance_debt_payments WHERE transaction_id IS NULL;
  SELECT COUNT(*) INTO orphan_heaven_bank
    FROM heaven_bank WHERE transaction_id IS NULL;
  SELECT COUNT(*) INTO orphan_installment_payments
    FROM finance_installment_payments WHERE transaction_id IS NULL;

  RAISE NOTICE 'Backfill summary:';
  RAISE NOTICE '  - finance_debt_payments without transaction_id: %', orphan_debt_payments;
  RAISE NOTICE '  - heaven_bank without transaction_id: %', orphan_heaven_bank;
  RAISE NOTICE '  - finance_installment_payments without transaction_id (legacy): %', orphan_installment_payments;
END $$;

COMMIT;
