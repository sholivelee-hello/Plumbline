-- 1인 전용 앱: FIXED_USER_ID가 auth.users에 없으므로 FK 제약 제거
-- RLS 비활성화(00013)만으로는 FK 제약 해결 불가 — 별도로 제거 필요

ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE basics_templates DROP CONSTRAINT IF EXISTS basics_templates_user_id_fkey;
ALTER TABLE basics_logs DROP CONSTRAINT IF EXISTS basics_logs_user_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE schedule_presets DROP CONSTRAINT IF EXISTS schedule_presets_user_id_fkey;
ALTER TABLE schedule_plans DROP CONSTRAINT IF EXISTS schedule_plans_user_id_fkey;
ALTER TABLE schedule_actuals DROP CONSTRAINT IF EXISTS schedule_actuals_user_id_fkey;
ALTER TABLE schedule_plans DROP CONSTRAINT IF EXISTS schedule_plans_user_id_fkey;
ALTER TABLE weekly_templates DROP CONSTRAINT IF EXISTS weekly_templates_user_id_fkey;
ALTER TABLE weekly_template_blocks DROP CONSTRAINT IF EXISTS weekly_template_blocks_user_id_fkey;
ALTER TABLE heaven_bank DROP CONSTRAINT IF EXISTS heaven_bank_user_id_fkey;
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_user_id_fkey;
ALTER TABLE finance_debts DROP CONSTRAINT IF EXISTS finance_debts_user_id_fkey;
ALTER TABLE finance_debt_payments DROP CONSTRAINT IF EXISTS finance_debt_payments_user_id_fkey;
ALTER TABLE finance_installments DROP CONSTRAINT IF EXISTS finance_installments_user_id_fkey;
ALTER TABLE finance_budgets DROP CONSTRAINT IF EXISTS finance_budgets_user_id_fkey;
ALTER TABLE finance_budget_settings DROP CONSTRAINT IF EXISTS finance_budget_settings_user_id_fkey;
ALTER TABLE finance_wishlist DROP CONSTRAINT IF EXISTS finance_wishlist_user_id_fkey;
ALTER TABLE finance_recurring DROP CONSTRAINT IF EXISTS finance_recurring_user_id_fkey;
ALTER TABLE finance_recurring_logs DROP CONSTRAINT IF EXISTS finance_recurring_logs_user_id_fkey;
ALTER TABLE finance_onboarding DROP CONSTRAINT IF EXISTS finance_onboarding_user_id_fkey;
ALTER TABLE finance_subscriptions DROP CONSTRAINT IF EXISTS finance_subscriptions_user_id_fkey;
ALTER TABLE finance_subscription_amount_changes DROP CONSTRAINT IF EXISTS finance_subscription_amount_changes_user_id_fkey;
ALTER TABLE finance_subscription_cancellations DROP CONSTRAINT IF EXISTS finance_subscription_cancellations_user_id_fkey;
