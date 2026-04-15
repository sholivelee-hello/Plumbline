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

export interface FinanceCategory {
  id: string;
  user_id: string;
  type: FinanceCategoryType;
  title: string;
  default_amount: number | null;
  sort_order: number;
}

export interface HeavenBankEntry {
  id: string;
  user_id: string;
  date: string;
  type: HeavenBankEntryType;
  target: string | null;
  description: string | null;
  amount: number;
}

export interface FinanceObligation {
  id: string;
  user_id: string;
  month: string;
  category_id: string;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  linked_debt_id: string | null;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string | null;
  date: string;
  is_auto: boolean;
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: string;
}

export interface FinanceDebt {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  created_at: string;
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

export interface FinanceWant {
  id: string;
  user_id: string;
  title: string;
  estimated_price: number | null;
  is_purchased: boolean;
  purchased_date: string | null;
  created_month: string;
}

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
