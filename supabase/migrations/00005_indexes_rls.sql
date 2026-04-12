CREATE INDEX idx_basics_logs_user_date ON basics_logs(user_id, date);
CREATE INDEX idx_schedule_plans_user_date ON schedule_plans(user_id, date);
CREATE INDEX idx_schedule_actuals_user_date ON schedule_actuals(user_id, date);
CREATE INDEX idx_heaven_bank_user_date ON heaven_bank(user_id, date);
CREATE INDEX idx_finance_transactions_user_date ON finance_transactions(user_id, date);
CREATE INDEX idx_finance_obligations_user_month ON finance_obligations(user_id, month);
CREATE INDEX idx_finance_budgets_user_month ON finance_budgets(user_id, month);
CREATE INDEX idx_finance_debt_payments_user_debt ON finance_debt_payments(user_id, debt_id);
