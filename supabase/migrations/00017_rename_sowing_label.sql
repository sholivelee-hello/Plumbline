-- Rename any stored "좋은 땅 (하늘은행)" / "좋은땅(하늘은행)" / bare "좋은 땅" labels
-- back to plain "하늘은행". Covers whitespace variants present in older data.
-- The literal lives only in user DB rows (group_configs JSONB, heaven_bank.target,
-- and historical finance_transactions descriptions) — it was never in source code.

BEGIN;

-- 1. finance_budget_settings.group_configs (JSONB)
UPDATE finance_budget_settings
SET group_configs = REGEXP_REPLACE(
  group_configs::text,
  '좋은\s*땅\s*\(\s*하늘은행\s*\)',
  '하늘은행',
  'g'
)::jsonb
WHERE group_configs::text ~ '좋은\s*땅\s*\(\s*하늘은행\s*\)';

-- Also strip any leftover bare "좋은 땅" titles (legacy data without the parenthetical).
UPDATE finance_budget_settings
SET group_configs = REGEXP_REPLACE(
  group_configs::text,
  '"title"\s*:\s*"좋은\s*땅"',
  '"title": "하늘은행"',
  'g'
)::jsonb
WHERE group_configs::text ~ '"title"\s*:\s*"좋은\s*땅"';

-- 2. heaven_bank.target (user-entered target label)
UPDATE heaven_bank
SET target = REGEXP_REPLACE(target, '좋은\s*땅\s*\(\s*하늘은행\s*\)', '하늘은행', 'g')
WHERE target ~ '좋은\s*땅\s*\(\s*하늘은행\s*\)';

UPDATE heaven_bank
SET target = '하늘은행'
WHERE target ~ '^\s*좋은\s*땅\s*$';

-- 3. finance_transactions.description (historical descriptions from old sowing code)
UPDATE finance_transactions
SET description = REGEXP_REPLACE(description, '좋은\s*땅\s*\(\s*하늘은행\s*\)', '하늘은행', 'g')
WHERE description ~ '좋은\s*땅\s*\(\s*하늘은행\s*\)';

COMMIT;
