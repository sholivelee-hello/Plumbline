-- 요망사항 트랜잭션에 위시 연결
BEGIN;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS wishlist_id UUID NULL REFERENCES finance_wishlist(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_wishlist_id
  ON finance_transactions(wishlist_id)
  WHERE wishlist_id IS NOT NULL;

COMMENT ON COLUMN finance_wishlist.saved_amount IS
  'Legacy baseline: 2026-05-01 이전까지 모은 저축 스냅샷. 이후 누적은 finance_transactions.wishlist_id 링크로 계산.';

COMMIT;
