import type {
  BasicsTemplate,
  BasicsLog,
  UserSettings,
  HeavenBankEntry,
  FinanceTransaction,
  FinanceBudget,
  FinanceDebt,
  FinanceDebtPayment,
  FinanceInstallment,
} from "@/types/database";

const USER_ID = "demo-user-000";

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY = toLocalDateStr(new Date());
const MONTH = TODAY.slice(0, 7);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400000).toISOString();

function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

export const demoSettings: UserSettings = {
  id: "s1",
  user_id: USER_ID,
  day_start_time: "05:00",
  day_end_time: "23:00",
  timezone: "Asia/Seoul",
  salary_day: 25,
};

export const demoTemplates: BasicsTemplate[] = [
  { id: "bt1", user_id: USER_ID, category: "spiritual", title: "QT", type: "check", unit: null, target_value: null, sort_order: 0, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
  { id: "bt2", user_id: USER_ID, category: "spiritual", title: "기도", type: "number", unit: "분", target_value: 30, sort_order: 1, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
  { id: "bt3", user_id: USER_ID, category: "spiritual", title: "말씀 읽기", type: "check", unit: null, target_value: null, sort_order: 2, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
  { id: "bt4", user_id: USER_ID, category: "physical", title: "운동", type: "number", unit: "분", target_value: 40, sort_order: 3, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
  { id: "bt5", user_id: USER_ID, category: "physical", title: "물 마시기", type: "number", unit: "잔", target_value: 8, sort_order: 4, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
  { id: "bt6", user_id: USER_ID, category: "physical", title: "스트레칭", type: "check", unit: null, target_value: null, sort_order: 5, is_active: true, deactivated_at: null, created_at: THIRTY_DAYS_AGO },
];

export const demoLogs: BasicsLog[] = [
  { id: "bl1", user_id: USER_ID, template_id: "bt1", date: TODAY, completed: true, value: null, completed_at: "" },
  { id: "bl2", user_id: USER_ID, template_id: "bt2", date: TODAY, completed: true, value: 25, completed_at: "" },
  { id: "bl3", user_id: USER_ID, template_id: "bt3", date: TODAY, completed: false, value: null, completed_at: null },
  { id: "bl4", user_id: USER_ID, template_id: "bt4", date: TODAY, completed: true, value: 45, completed_at: "" },
  { id: "bl5", user_id: USER_ID, template_id: "bt5", date: TODAY, completed: false, value: 5, completed_at: null },
  { id: "bl6", user_id: USER_ID, template_id: "bt6", date: TODAY, completed: false, value: null, completed_at: null },
];

export const demoHeavenBank: HeavenBankEntry[] = [
  { id: "hb1", user_id: USER_ID, date: TODAY, type: "sow", target: "교회 헌금", description: "주일 감사헌금", amount: 300000, transaction_id: null },
  { id: "hb2", user_id: USER_ID, date: daysFromToday(-7), type: "sow", target: "선교 후원", description: "월 정기 후원", amount: 100000, transaction_id: null },
];

export const demoBudgets: FinanceBudget[] = [
  { id: "fb1", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "food", amount: 400000 },
  { id: "fb2", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "transport", amount: 100000 },
  { id: "fb3", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "grocery", amount: 80000 },
];

export const demoTransactions: FinanceTransaction[] = [
  { id: "ft1", user_id: USER_ID, type: "expense", amount: 185000, group_id: "necessity", item_id: "food", description: "식비", date: TODAY, wishlist_id: null, source: "manual" },
  { id: "ft2", user_id: USER_ID, type: "expense", amount: 52000, group_id: "necessity", item_id: "transport", description: "교통비", date: TODAY, wishlist_id: null, source: "manual" },
  { id: "ft3", user_id: USER_ID, type: "expense", amount: 23000, group_id: "necessity", item_id: "grocery", description: "생활용품", date: TODAY, wishlist_id: null, source: "manual" },
];

export const demoDebts: (FinanceDebt & { total_paid: number; percent: number; payments: FinanceDebtPayment[] })[] = [
  {
    id: "fd1", user_id: USER_ID, title: "전세 대출", total_amount: 50000000, created_at: "2024-03-01", is_completed: false,
    tags: ["주거"],
    total_paid: 15000000, percent: 30,
    payments: [
      { id: "dp1", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-01-15", memo: "1분기 상환", transaction_id: null },
      { id: "dp2", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-04-15", memo: "2분기 상환", transaction_id: null },
      { id: "dp3", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-07-15", memo: "3분기 상환", transaction_id: null },
    ],
  },
];

export const demoInstallments: (FinanceInstallment & { remaining_months: number; remaining_amount: number; paid_amount: number; percent: number })[] = [
  {
    id: "fi1", user_id: USER_ID, title: "맥북 프로 14", total_amount: 2790000, monthly_payment: 232500,
    total_months: 12, paid_months: 5, start_date: "2025-11", is_completed: false, created_at: "",
    remaining_months: 7, remaining_amount: 1627500, paid_amount: 1162500, percent: 42,
  },
  {
    id: "fi2", user_id: USER_ID, title: "아이패드 에어", total_amount: 929000, monthly_payment: 154834,
    total_months: 6, paid_months: 4, start_date: "2025-12", is_completed: false, created_at: "",
    remaining_months: 2, remaining_amount: 309668, paid_amount: 619332, percent: 67,
  },
];

export const demoMonthlySow = 400000;

export const demoCashbookEntries: FinanceTransaction[] = [
  // Incomes
  { id: "cb1", user_id: USER_ID, type: "income", amount: 2200000, group_id: null, item_id: null, description: "급여", date: `${MONTH}-25`, wishlist_id: null, source: "manual" },
  { id: "cb2", user_id: USER_ID, type: "income", amount: 300000, group_id: null, item_id: null, description: "부수입", date: `${MONTH}-15`, wishlist_id: null, source: "manual" },
  { id: "cb3", user_id: USER_ID, type: "income", amount: 50000, group_id: null, item_id: null, description: "용돈", date: `${MONTH}-08`, wishlist_id: null, source: "manual" },
  // Expenses
  { id: "cb4", user_id: USER_ID, type: "expense", amount: 15000, group_id: "necessity", item_id: "food", description: "점심 식사", date: TODAY, wishlist_id: null, source: "manual" },
  { id: "cb13", user_id: USER_ID, type: "expense", amount: 8500, group_id: "necessity", item_id: "food", description: "저녁 외식", date: `${MONTH}-14`, wishlist_id: null, source: "manual" },
  { id: "cb5", user_id: USER_ID, type: "expense", amount: 3200, group_id: "necessity", item_id: "transport", description: "버스 출근", date: TODAY, wishlist_id: null, source: "manual" },
  { id: "cb6", user_id: USER_ID, type: "expense", amount: 65000, group_id: "obligation", item_id: "utility", description: "통신비", date: `${MONTH}-10`, wishlist_id: null, source: "manual" },
  { id: "cb7", user_id: USER_ID, type: "expense", amount: 42000, group_id: "necessity", item_id: "grocery", description: "마트 장보기", date: `${MONTH}-12`, wishlist_id: null, source: "manual" },
  { id: "cb8", user_id: USER_ID, type: "expense", amount: 550000, group_id: "obligation", item_id: "rent", description: "월세", date: `${MONTH}-01`, wishlist_id: null, source: "manual" },
  { id: "cb9", user_id: USER_ID, type: "expense", amount: 89000, group_id: "obligation", item_id: "utility", description: "전기·수도", date: `${MONTH}-05`, wishlist_id: null, source: "manual" },
  { id: "cb10", user_id: USER_ID, type: "expense", amount: 220000, group_id: "obligation", item_id: "tithe", description: "십일조", date: `${MONTH}-01`, wishlist_id: null, source: "manual" },
  { id: "cb11", user_id: USER_ID, type: "expense", amount: 100000, group_id: "sowing", item_id: "heaven", description: "선교 헌금", date: `${MONTH}-07`, wishlist_id: null, source: "manual" },
  { id: "cb12", user_id: USER_ID, type: "expense", amount: 300000, group_id: "obligation", item_id: "parents", description: "부모님 용돈", date: `${MONTH}-01`, wishlist_id: null, source: "manual" },
];
