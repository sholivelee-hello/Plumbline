export type BasicCategory = "spiritual" | "physical";
export type BasicType = "check" | "number";
export type ScheduleTimeUnit = 10 | 15 | 30 | 60;
export type HeavenBankEntryType = "sow" | "reap";
export type FinanceCategoryType = "sowing" | "obligation" | "necessity" | "surplus";
export type TransactionType = "income" | "expense";

export interface UserSettings {
  id: string;
  user_id: string;
  day_start_time: string;
  day_end_time: string;
  timezone: string;
  time_unit: ScheduleTimeUnit;
  salary_day?: number | null;
}

export interface BasicsTemplate {
  id: string;
  user_id: string;
  category: BasicCategory;
  title: string;
  type: BasicType;
  unit: string | null;
  target_value: number | null;
  sort_order: number;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
}

export interface BasicsLog {
  id: string;
  user_id: string;
  template_id: string;
  date: string;
  completed: boolean;
  value: number | null;
  completed_at: string | null;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  color: string;
  memo: string | null;
}

export interface SchedulePreset {
  id: string;
  user_id: string;
  title: string;
  duration: number;
  color: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface SchedulePlan {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  color: string;
  preset_id: string | null;
}

export interface ScheduleActual {
  id: string;
  user_id: string;
  plan_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  color: string;
  is_from_plan: boolean;
}

// FinanceCategory removed — table dropped in migration 00010. Cleanup in Task 16.

export interface HeavenBankEntry {
  id: string;
  user_id: string;
  date: string;
  type: HeavenBankEntryType;
  target: string | null;
  description: string | null;
  amount: number;
}

// FinanceObligation removed — table dropped in migration 00010. Cleanup in Task 16.

export interface FinanceTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  group_id: string | null;
  item_id: string | null;
  income_category: string | null;
  source: 'manual' | 'recurring' | 'installment' | 'debt' | 'heaven_bank';
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  month: string;
  group_id: string;
  item_id: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceBudgetSettings {
  id: string;
  user_id: string;
  monthly_income: number;
  group_configs: unknown;  // JSONB - use finance-config's FinanceGroup[] at parse time
  income_categories: string[];
  updated_at: string;
}

export interface FinanceWishlist {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  priority: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceRecurring {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  day_of_month: number;
  group_id: string | null;
  item_id: string | null;
  income_category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FinanceRecurringLog {
  id: string;
  recurring_id: string;
  month: string;
  transaction_id: string;
  executed_at: string;
}

export interface FinanceOnboarding {
  id: string;
  user_id: string;
  is_completed: boolean;
  is_demo_mode: boolean;
  completed_at: string | null;
}

export interface FinanceDebt {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  is_completed: boolean;
}

export interface FinanceDebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  memo: string | null;
}

// FinanceWant removed — migrated to FinanceWishlist in migration 00010. Cleanup in Task 16.

export interface FinanceInstallment {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  monthly_payment: number;
  total_months: number;
  paid_months: number;
  start_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTemplateBlock {
  id: string;
  template_id: string;
  day_of_week: number; // 0=일, 1=월, ..., 6=토
  start_time: string;
  end_time: string;
  title: string;
  color: string;
}
