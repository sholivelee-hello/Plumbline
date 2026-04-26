export type BasicCategory = "spiritual" | "physical";
export type BasicType = "check" | "number";
export type HeavenBankEntryType = "sow" | "reap";
export type TransactionType = "income" | "expense";

export interface UserSettings {
  id: string;
  user_id: string;
  timezone: string;
  bible_reading_start_date?: string | null;
  meditation_start_date?: string | null;
}

export interface BibleReadingLog {
  id: string;
  user_id: string;
  date: string;
  total_chapters: number;
  checked_chapters: number;
  completed_at: string | null;
  created_at?: string;
}

export interface BibleReadingChapterCheck {
  id: string;
  user_id: string;
  date: string;
  ord: number;
  label: string;
  checked_at: string;
}

export interface MeditationLog {
  id: string;
  user_id: string;
  date: string;
  psalm_number: number;
  completed: boolean;
  completed_at: string | null;
}

export interface BasicsTemplate {
  id: string;
  user_id: string;
  category: BasicCategory;
  title: string;
  type: BasicType;
  unit: string | null;
  target_value: number | null;
  step_value: number | null;
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

export interface HeavenBankEntry {
  id: string;
  user_id: string;
  date: string;
  type: HeavenBankEntryType;
  target: string | null;
  description: string | null;
  amount: number;
  created_at?: string;
  transaction_id: string | null;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  group_id: string | null;
  item_id: string | null;
  wishlist_id: string | null;
  income_category: string | null;
  source: 'manual' | 'recurring' | 'installment' | 'debt' | 'heaven_bank' | 'subscription';
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  month: string;
  group_id: string;
  item_id: string | null;
  amount: number;
  created_at?: string;
  updated_at?: string;
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
  subscription_id?: string | null;
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
  updated_at?: string;
  is_completed: boolean;
}

export interface FinanceDebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  memo: string | null;
  transaction_id: string | null;
}

export interface FinanceInstallment {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  monthly_payment: number;
  total_months: number;
  /** @deprecated 2026-04: superseded by COUNT(finance_installment_payments). Kept for legacy rows only. */
  paid_months: number;
  start_date: string;
  is_completed: boolean;
  created_at: string;
}

export interface FinanceInstallmentPayment {
  id: string;
  user_id: string;
  installment_id: string;
  transaction_id: string | null;
  month_number: number;
  paid_at: string;
  amount: number;
  created_at: string;
}

export interface FinanceSubscription {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  card_label: string | null;
  day_of_month: number;
  start_date: string;
  is_active: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceSubscriptionAmountChange {
  id: string;
  subscription_id: string;
  old_amount: number;
  new_amount: number;
  effective_date: string;
  note: string | null;
  created_at: string;
}

export interface FinanceSubscriptionCancellation {
  id: string;
  subscription_id: string;
  cancelled_at: string;
  note: string | null;
  rejoined_at: string | null;
  created_at: string;
}

// ── Weight tracker ──────────────────────────────────────────
export interface WeightEntry {
  id: string;
  user_id: string;
  weighed_on: string;    // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
  updated_at: string;
}

export interface WeightGoal {
  user_id: string;
  target_kg: number;
  deadline: string;      // YYYY-MM-DD
  updated_at: string;
}
