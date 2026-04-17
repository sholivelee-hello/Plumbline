import type {
  BasicsTemplate,
  BasicsLog,
  Event,
  SchedulePlan,
  ScheduleActual,
  SchedulePreset,
  UserSettings,
  HeavenBankEntry,
  FinanceTransaction,
  FinanceBudget,
  FinanceDebt,
  FinanceDebtPayment,
  FinanceInstallment,
  WeeklyTemplate,
  WeeklyTemplateBlock,
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
  time_unit: 30,
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

export const demoEvents: Event[] = [
  { id: "ev1", user_id: USER_ID, title: "팀 미팅", start_date: TODAY, end_date: TODAY, start_time: "10:00", color: "#7575D8", memo: null },
  { id: "ev2", user_id: USER_ID, title: "치과 예약", start_date: daysFromToday(2), end_date: daysFromToday(2), start_time: "14:00", color: "#D4A5A5", memo: null },
  { id: "ev3", user_id: USER_ID, title: "부모님 생신", start_date: daysFromToday(5), end_date: daysFromToday(5), start_time: "18:00", color: "#A8C5A0", memo: "선물 준비" },
  { id: "ev4", user_id: USER_ID, title: "연휴 여행", start_date: daysFromToday(10), end_date: daysFromToday(12), start_time: null, color: "#93B5C6", memo: null },
];

export const demoPresets: SchedulePreset[] = [
  { id: "sp1", user_id: USER_ID, title: "기도", duration: 30, color: "#7575D8", usage_count: 12, last_used_at: null },
  { id: "sp2", user_id: USER_ID, title: "운동", duration: 60, color: "#A8C5A0", usage_count: 8, last_used_at: null },
  { id: "sp3", user_id: USER_ID, title: "독서", duration: 30, color: "#93B5C6", usage_count: 5, last_used_at: null },
];

export const demoPlans: SchedulePlan[] = [
  { id: "pl1", user_id: USER_ID, date: TODAY, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8", preset_id: null },
  { id: "pl2", user_id: USER_ID, date: TODAY, start_time: "05:30", end_time: "06:00", title: "기도", color: "#7575D8", preset_id: "sp1" },
  { id: "pl3", user_id: USER_ID, date: TODAY, start_time: "06:30", end_time: "07:30", title: "운동", color: "#A8C5A0", preset_id: "sp2" },
  { id: "pl4", user_id: USER_ID, date: TODAY, start_time: "09:00", end_time: "12:00", title: "업무", color: "#93B5C6", preset_id: null },
  { id: "pl5", user_id: USER_ID, date: TODAY, start_time: "14:00", end_time: "17:00", title: "업무", color: "#93B5C6", preset_id: null },
  { id: "pl6", user_id: USER_ID, date: TODAY, start_time: "20:00", end_time: "20:30", title: "독서", color: "#C4A8C5", preset_id: "sp3" },
];

export const demoActuals: ScheduleActual[] = [
  { id: "ac1", user_id: USER_ID, plan_id: "pl1", date: TODAY, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8", is_from_plan: true },
  { id: "ac2", user_id: USER_ID, plan_id: "pl2", date: TODAY, start_time: "05:30", end_time: "06:10", title: "기도", color: "#7575D8", is_from_plan: true },
  { id: "ac3", user_id: USER_ID, plan_id: null, date: daysFromToday(-1), start_time: "07:00", end_time: "08:00", title: "아침 산책", color: "#A8C5A0", is_from_plan: false },
  { id: "ac4", user_id: USER_ID, plan_id: null, date: daysFromToday(-1), start_time: "22:00", end_time: "22:30", title: "일기 쓰기", color: "#C4A8C5", is_from_plan: false },
];

export const demoWeeklyTemplates: WeeklyTemplate[] = [
  { id: "wt1", user_id: USER_ID, name: "평일 루틴", created_at: THIRTY_DAYS_AGO, updated_at: THIRTY_DAYS_AGO },
  { id: "wt2", user_id: USER_ID, name: "주말 루틴", created_at: THIRTY_DAYS_AGO, updated_at: THIRTY_DAYS_AGO },
];

export const demoWeeklyTemplateBlocks: WeeklyTemplateBlock[] = [
  // 평일 루틴 (wt1): 월~금
  { id: "wtb1", template_id: "wt1", day_of_week: 1, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8" },
  { id: "wtb2", template_id: "wt1", day_of_week: 1, start_time: "06:30", end_time: "07:30", title: "운동", color: "#A8C5A0" },
  { id: "wtb3", template_id: "wt1", day_of_week: 2, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8" },
  { id: "wtb4", template_id: "wt1", day_of_week: 2, start_time: "06:30", end_time: "07:30", title: "운동", color: "#A8C5A0" },
  { id: "wtb5", template_id: "wt1", day_of_week: 3, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8" },
  { id: "wtb6", template_id: "wt1", day_of_week: 3, start_time: "06:30", end_time: "07:30", title: "운동", color: "#A8C5A0" },
  { id: "wtb7", template_id: "wt1", day_of_week: 4, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8" },
  { id: "wtb8", template_id: "wt1", day_of_week: 5, start_time: "05:00", end_time: "05:30", title: "QT", color: "#7575D8" },
  { id: "wtb9", template_id: "wt1", day_of_week: 5, start_time: "19:00", end_time: "20:00", title: "셀 모임", color: "#C4A8C5" },
  // 주말 루틴 (wt2): 일, 토
  { id: "wtb10", template_id: "wt2", day_of_week: 0, start_time: "08:30", end_time: "09:30", title: "새벽예배", color: "#7575D8" },
  { id: "wtb11", template_id: "wt2", day_of_week: 0, start_time: "11:00", end_time: "12:30", title: "주일예배", color: "#7575D8" },
  { id: "wtb12", template_id: "wt2", day_of_week: 6, start_time: "09:00", end_time: "10:30", title: "등산", color: "#A8C5A0" },
  { id: "wtb13", template_id: "wt2", day_of_week: 6, start_time: "15:00", end_time: "17:00", title: "독서", color: "#93B5C6" },
];

export const demoHeavenBank: HeavenBankEntry[] = [
  { id: "hb1", user_id: USER_ID, date: TODAY, type: "sow", target: "교회 헌금", description: "주일 감사헌금", amount: 300000 },
  { id: "hb2", user_id: USER_ID, date: daysFromToday(-7), type: "sow", target: "선교 후원", description: "월 정기 후원", amount: 100000 },
];

export const demoBudgets: FinanceBudget[] = [
  { id: "fb1", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "food", amount: 400000 },
  { id: "fb2", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "transport", amount: 100000 },
  { id: "fb3", user_id: USER_ID, month: MONTH, group_id: "necessity", item_id: "grocery", amount: 80000 },
];

export const demoTransactions: FinanceTransaction[] = [
  { id: "ft1", user_id: USER_ID, type: "expense", amount: 185000, group_id: "necessity", item_id: "food", description: "식비", date: TODAY, source: "manual" },
  { id: "ft2", user_id: USER_ID, type: "expense", amount: 52000, group_id: "necessity", item_id: "transport", description: "교통비", date: TODAY, source: "manual" },
  { id: "ft3", user_id: USER_ID, type: "expense", amount: 23000, group_id: "necessity", item_id: "grocery", description: "생활용품", date: TODAY, source: "manual" },
];

export const demoDebts: (FinanceDebt & { total_paid: number; percent: number; payments: FinanceDebtPayment[] })[] = [
  {
    id: "fd1", user_id: USER_ID, title: "전세 대출", total_amount: 50000000, created_at: "2024-03-01", is_completed: false,
    tags: ["주거"],
    total_paid: 15000000, percent: 30,
    payments: [
      { id: "dp1", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-01-15", memo: "1분기 상환" },
      { id: "dp2", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-04-15", memo: "2분기 상환" },
      { id: "dp3", user_id: USER_ID, debt_id: "fd1", amount: 5000000, date: "2025-07-15", memo: "3분기 상환" },
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
  { id: "cb1", user_id: USER_ID, type: "income", amount: 2200000, group_id: null, item_id: null, description: "급여", date: `${MONTH}-25`, source: "manual" },
  { id: "cb2", user_id: USER_ID, type: "income", amount: 300000, group_id: null, item_id: null, description: "부수입", date: `${MONTH}-15`, source: "manual" },
  { id: "cb3", user_id: USER_ID, type: "income", amount: 50000, group_id: null, item_id: null, description: "용돈", date: `${MONTH}-08`, source: "manual" },
  // Expenses
  { id: "cb4", user_id: USER_ID, type: "expense", amount: 15000, group_id: "necessity", item_id: "food", description: "점심 식사", date: TODAY, source: "manual" },
  { id: "cb13", user_id: USER_ID, type: "expense", amount: 8500, group_id: "necessity", item_id: "food", description: "저녁 외식", date: `${MONTH}-14`, source: "manual" },
  { id: "cb5", user_id: USER_ID, type: "expense", amount: 3200, group_id: "necessity", item_id: "transport", description: "버스 출근", date: TODAY, source: "manual" },
  { id: "cb6", user_id: USER_ID, type: "expense", amount: 65000, group_id: "obligation", item_id: "utility", description: "통신비", date: `${MONTH}-10`, source: "manual" },
  { id: "cb7", user_id: USER_ID, type: "expense", amount: 42000, group_id: "necessity", item_id: "grocery", description: "마트 장보기", date: `${MONTH}-12`, source: "manual" },
  { id: "cb8", user_id: USER_ID, type: "expense", amount: 550000, group_id: "obligation", item_id: "rent", description: "월세", date: `${MONTH}-01`, source: "manual" },
  { id: "cb9", user_id: USER_ID, type: "expense", amount: 89000, group_id: "obligation", item_id: "utility", description: "전기·수도", date: `${MONTH}-05`, source: "manual" },
  { id: "cb10", user_id: USER_ID, type: "expense", amount: 220000, group_id: "obligation", item_id: "tithe", description: "십일조", date: `${MONTH}-01`, source: "manual" },
  { id: "cb11", user_id: USER_ID, type: "expense", amount: 100000, group_id: "sowing", item_id: "heaven", description: "선교 헌금", date: `${MONTH}-07`, source: "manual" },
  { id: "cb12", user_id: USER_ID, type: "expense", amount: 300000, group_id: "obligation", item_id: "parents", description: "부모님 용돈", date: `${MONTH}-01`, source: "manual" },
];
