"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { useBudget } from "@/lib/hooks/use-budget";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import {
  getCurrentMonth,
  formatCurrency,
  parseCurrencyInput,
  shiftMonth,
} from "@/lib/finance-utils";
import { DEFAULT_GROUPS, getItemKey } from "@/lib/finance-config";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { FinanceDonutChart } from "@/components/finance/finance-donut-chart";
import { MonthPicker } from "@/components/finance/month-picker";
import { AmountInput } from "@/components/finance/amount-input";
import { BudgetSkeleton } from "@/components/finance/finance-skeleton";

// ── Constants ──────────────────────────────────────────────────────────────────

// percentMin of each group used for income-based distribution
const GROUP_PERCENT_MAP: Record<string, number> = {
  obligation: 38,
  necessity: 52,
  sowing: 5,
  want: 5,
};

// ── Group styles ───────────────────────────────────────────────────────────────

interface GroupStyle {
  color: string;
  headerBg: string;
  headerText: string;
  accentText: string;
  badge: string;
  border: string;
  warningBorder: string;
}

const GROUP_STYLES: Record<string, GroupStyle> = {
  obligation: {
    color: "#1E3A5F",
    headerBg: "bg-[#1E3A5F]/8 dark:bg-[#1E3A5F]/20",
    headerText: "text-[#1E3A5F] dark:text-blue-300",
    accentText: "text-[#1E3A5F] dark:text-blue-300",
    badge: "bg-[#1E3A5F]/10 dark:bg-[#1E3A5F]/30 text-[#1E3A5F] dark:text-blue-300",
    border: "border-gray-100 dark:border-[#2d3748]",
    warningBorder: "border-orange-300 dark:border-orange-600",
  },
  necessity: {
    color: "#059669",
    headerBg: "bg-[#059669]/8 dark:bg-[#059669]/20",
    headerText: "text-[#059669] dark:text-emerald-300",
    accentText: "text-[#059669] dark:text-emerald-300",
    badge: "bg-[#059669]/10 dark:bg-[#059669]/30 text-[#059669] dark:text-emerald-300",
    border: "border-gray-100 dark:border-[#2d3748]",
    warningBorder: "border-orange-300 dark:border-orange-600",
  },
  sowing: {
    color: "#7C3AED",
    headerBg: "bg-[#7C3AED]/8 dark:bg-[#7C3AED]/20",
    headerText: "text-[#7C3AED] dark:text-purple-300",
    accentText: "text-[#7C3AED] dark:text-purple-300",
    badge: "bg-[#7C3AED]/10 dark:bg-[#7C3AED]/30 text-[#7C3AED] dark:text-purple-300",
    border: "border-gray-100 dark:border-[#2d3748]",
    warningBorder: "border-orange-300 dark:border-orange-600",
  },
  want: {
    color: "#EA580C",
    headerBg: "bg-[#EA580C]/8 dark:bg-[#EA580C]/20",
    headerText: "text-[#EA580C] dark:text-orange-300",
    accentText: "text-[#EA580C] dark:text-orange-300",
    badge: "bg-[#EA580C]/10 dark:bg-[#EA580C]/30 text-[#EA580C] dark:text-orange-300",
    border: "border-gray-100 dark:border-[#2d3748]",
    warningBorder: "border-orange-300 dark:border-orange-600",
  },
};

const FALLBACK_STYLE: GroupStyle = GROUP_STYLES.obligation;

// ── Types ──────────────────────────────────────────────────────────────────────

type SetupFlow = "prompt" | "income-input" | "normal";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const currentMonth = getCurrentMonth();

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const {
    budgets,
    grandTotal,
    loading: budgetLoading,
    updateBudgetAmount,
    bulkSetBudgets,
    copyFromPreviousMonth,
  } = useBudget(month);

  const {
    groups,
    monthlyIncome,
    loading: settingsLoading,
    updateIncome,
  } = useBudgetSettings();

  const loading = budgetLoading || settingsLoading;

  // ── Setup flow ───────────────────────────────────────────────────────────────
  const [setupFlow, setSetupFlow] = useState<SetupFlow>("normal");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [incomeInput, setIncomeInput] = useState("");
  const [distributing, setDistributing] = useState(false);

  // Determine flow when budgets load
  useEffect(() => {
    if (loading) return;
    if (grandTotal === 0) {
      setSetupFlow("prompt");
    } else {
      setSetupFlow("normal");
    }
  }, [loading, grandTotal]);

  // ── Income editing ───────────────────────────────────────────────────────────
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeEditValue, setIncomeEditValue] = useState("");
  const [showRedistributeConfirm, setShowRedistributeConfirm] = useState(false);
  const pendingNewIncomeRef = useRef<number>(0);

  function openIncomeEdit() {
    setIncomeEditValue(monthlyIncome > 0 ? formatCurrency(monthlyIncome) : "");
    setEditingIncome(true);
  }

  async function commitIncomeEdit() {
    const amount = parseCurrencyInput(incomeEditValue);
    if (amount <= 0 || amount === monthlyIncome) {
      setEditingIncome(false);
      return;
    }
    await updateIncome(amount);
    setEditingIncome(false);
    if (grandTotal > 0) {
      pendingNewIncomeRef.current = amount;
      setShowRedistributeConfirm(true);
    }
  }

  // ── Per-item debounced save ───────────────────────────────────────────────────
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const timers = saveTimerRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Sync localValues when budgets change (month switch etc)
  useEffect(() => {
    setLocalValues({});
  }, [month]);

  function handleItemChange(groupId: string, itemId: string, formatted: string) {
    const key = getItemKey(groupId, itemId);
    setLocalValues((v) => ({ ...v, [key]: formatted }));
    if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key]);
    saveTimerRef.current[key] = setTimeout(async () => {
      const amount = parseCurrencyInput(formatted);
      const result = await updateBudgetAmount(groupId, itemId, amount);
      if (result.ok) {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      }
    }, 1000);
  }

  function getItemDisplayValue(groupId: string, itemId: string): string {
    const key = getItemKey(groupId, itemId);
    if (key in localValues) return localValues[key];
    const amt = budgets[key] ?? 0;
    return amt === 0 ? "" : formatCurrency(amt);
  }

  // ── Distribute income to groups ──────────────────────────────────────────────

  const distributeIncome = useCallback(
    async (income: number) => {
      const entries: Array<{ groupId: string; itemId: string | null; amount: number }> = [];
      for (const group of groups) {
        const pct = GROUP_PERCENT_MAP[group.id] ?? group.percentMin;
        const groupTotal = Math.round((income * pct) / 100);
        const perItem = group.items.length > 0
          ? Math.round(groupTotal / group.items.length)
          : 0;
        for (const item of group.items) {
          entries.push({ groupId: group.id, itemId: item.id, amount: perItem });
        }
      }
      return bulkSetBudgets(entries);
    },
    [groups, bulkSetBudgets]
  );

  // ── Copy from previous month ─────────────────────────────────────────────────
  const [copying, setCopying] = useState(false);

  async function handleCopyPreviousMonth() {
    setCopyError(null);
    setCopying(true);
    const result = await copyFromPreviousMonth(shiftMonth(month, -1));
    setCopying(false);
    if (result.ok) {
      setSetupFlow("normal");
    } else {
      setCopyError(result.error ?? "이전 달 예산 데이터가 없어요.");
    }
  }

  // ── Income-based distribution setup ─────────────────────────────────────────

  async function handleDistributeFromIncome() {
    const amount = parseCurrencyInput(incomeInput);
    if (amount <= 0) return;
    setDistributing(true);
    await updateIncome(amount);
    const result = await distributeIncome(amount);
    setDistributing(false);
    if (result.ok) {
      setSetupFlow("normal");
    }
  }

  // ── Redistribute on income change ────────────────────────────────────────────

  async function handleRedistribute() {
    const income = pendingNewIncomeRef.current;
    if (income > 0) await distributeIncome(income);
    setShowRedistributeConfirm(false);
  }

  // ── Donut data from budgets ──────────────────────────────────────────────────

  const donutData = useMemo(() => {
    return groups.map((g) => {
      const total = g.items.reduce(
        (s, item) => s + (budgets[getItemKey(g.id, item.id)] ?? 0),
        0
      );
      return { groupId: g.id, title: g.title, amount: total, color: g.color };
    });
  }, [groups, budgets]);

  const totalAllocated = useMemo(
    () => donutData.reduce((s, d) => s + d.amount, 0),
    [donutData]
  );

  const unallocated = Math.max(0, (monthlyIncome || 0) - totalAllocated);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="예산" backHref="/finance" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {/* Month picker */}
        <MonthPicker month={month} onChange={setMonth} maxMonth={currentMonth} />

        {loading ? (
          <BudgetSkeleton />
        ) : setupFlow === "prompt" ? (
          // ── First-setup prompt ────────────────────────────────────────────
          <SetupPrompt
            copying={copying}
            copyError={copyError}
            onCopyPrevious={handleCopyPreviousMonth}
            onIncomeDistribute={() => {
              setCopyError(null);
              setSetupFlow("income-input");
            }}
          />
        ) : setupFlow === "income-input" ? (
          // ── Income input step ─────────────────────────────────────────────
          <IncomeInputStep
            value={incomeInput}
            onChange={setIncomeInput}
            distributing={distributing}
            onSubmit={handleDistributeFromIncome}
            onBack={() => setSetupFlow("prompt")}
          />
        ) : (
          // ── Normal layout ─────────────────────────────────────────────────
          <>
            {/* Income & total card */}
            <IncomeCard
              month={month}
              income={monthlyIncome}
              totalAllocated={totalAllocated}
              unallocated={unallocated}
              editing={editingIncome}
              editValue={incomeEditValue}
              onEditValueChange={setIncomeEditValue}
              onStartEdit={openIncomeEdit}
              onCommitEdit={commitIncomeEdit}
              groups={groups}
              budgets={budgets}
            />

            {/* 4 group budget cards */}
            {groups.map((group) => {
              const style = GROUP_STYLES[group.id] ?? FALLBACK_STYLE;
              const groupTotal = group.items.reduce(
                (s, item) => s + (budgets[getItemKey(group.id, item.id)] ?? 0),
                0
              );
              const income = monthlyIncome || 0;
              const percent = income > 0 ? (groupTotal / income) * 100 : 0;
              const inRange =
                percent >= group.percentMin && percent <= group.percentMax;
              const showWarning =
                !inRange && groupTotal > 0 && income > 0;

              return (
                <section
                  key={group.id}
                  aria-label={`${group.title} 예산 그룹`}
                  className={`rounded-2xl bg-white dark:bg-[#1a2030] border overflow-hidden transition-colors ${
                    showWarning ? style.warningBorder : style.border
                  }`}
                >
                  {/* Group header */}
                  <div className={`px-4 py-3 ${style.headerBg} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className={`text-sm font-bold ${style.headerText}`}>
                        {group.title}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>
                        가이드: {group.percentMin}~{group.percentMax}%
                      </span>
                    </div>
                    <div className="text-right">
                      {income > 0 && (
                        <span className={`text-xs font-semibold tabular-nums ${style.accentText}`}>
                          {Math.round(percent)}% ({formatCurrency(groupTotal)}원)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Out-of-range warning */}
                  {showWarning && (
                    <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/15 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        가이드 범위({group.percentMin}~{group.percentMax}%)를 벗어났어요
                      </span>
                    </div>
                  )}

                  {/* Progress bar (group total vs income) */}
                  {income > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <FinanceProgressBar
                        value={groupTotal}
                        max={income}
                        color={style.color}
                        height="sm"
                      />
                    </div>
                  )}

                  {/* Items */}
                  <div className="divide-y divide-gray-50 dark:divide-[#2d3748]">
                    {group.items.map((item) => {
                      const key = getItemKey(group.id, item.id);
                      const isSaved = savedKey === key;
                      return (
                        <div key={key} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 truncate">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2">
                              {isSaved && (
                                <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 font-medium animate-fade-in">
                                  <Check size={10} />
                                  저장됨
                                </span>
                              )}
                              <input
                                type="text"
                                inputMode="numeric"
                                value={getItemDisplayValue(group.id, item.id)}
                                onChange={(e) =>
                                  handleItemChange(group.id, item.id, e.target.value)
                                }
                                placeholder="예산"
                                aria-label={`${item.title} 예산`}
                                className="w-32 min-h-[40px] text-right text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-gray-50 dark:bg-[#131720] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300 tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group subtotal */}
                  <div className={`px-4 py-3 ${style.headerBg} flex items-center justify-between border-t ${style.border}`}>
                    <span className={`text-sm font-semibold ${style.headerText}`}>소계</span>
                    <span className={`text-sm font-bold tabular-nums ${style.accentText}`}>
                      {formatCurrency(groupTotal)}원
                    </span>
                  </div>
                </section>
              );
            })}

            {/* Summary footer with donut chart */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                예산 배분 현황
              </p>
              <FinanceDonutChart data={donutData} total={totalAllocated} size={180} />
            </FinanceCard>
          </>
        )}
      </div>

      {/* Redistribute confirm */}
      <ConfirmDialog
        isOpen={showRedistributeConfirm}
        onClose={() => setShowRedistributeConfirm(false)}
        onConfirm={handleRedistribute}
        title="예산 재배분"
        description="변경된 수입을 기준으로 각 그룹 예산을 비율에 맞게 재배분할까요?"
        confirmLabel="재배분"
        cancelLabel="유지"
      />
    </div>
  );
}

// ── SetupPrompt ────────────────────────────────────────────────────────────────

interface SetupPromptProps {
  copying: boolean;
  copyError: string | null;
  onCopyPrevious: () => void;
  onIncomeDistribute: () => void;
}

function SetupPrompt({
  copying,
  copyError,
  onCopyPrevious,
  onIncomeDistribute,
}: SetupPromptProps) {
  return (
    <FinanceCard>
      <div className="space-y-4 py-2">
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
            이번 달 예산이 없어요.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            시작 방법을 선택해주세요
          </p>
        </div>

        {copyError && (
          <p className="text-xs text-center text-orange-500 dark:text-orange-400">
            {copyError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCopyPrevious}
            disabled={copying}
            className="flex-1 min-h-[48px] py-3 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#2d3748] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1a2030] hover:bg-gray-50 dark:hover:bg-[#1e2538] transition-colors disabled:opacity-40 active:scale-[0.98]"
          >
            {copying ? "가져오는 중..." : "지난달 예산 가져오기"}
          </button>
          <button
            type="button"
            onClick={onIncomeDistribute}
            className="flex-1 min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            수입 기반 배분
          </button>
        </div>
      </div>
    </FinanceCard>
  );
}

// ── IncomeInputStep ────────────────────────────────────────────────────────────

interface IncomeInputStepProps {
  value: string;
  onChange: (v: string) => void;
  distributing: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

function IncomeInputStep({
  value,
  onChange,
  distributing,
  onSubmit,
  onBack,
}: IncomeInputStepProps) {
  const parsed = parseCurrencyInput(value);

  return (
    <FinanceCard>
      <div className="space-y-5 py-2">
        <div className="space-y-1">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
            이번 달 수입을 입력해주세요
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            비율 가이드 기준으로 자동 배분돼요
          </p>
        </div>

        <AmountInput
          value={value}
          onChange={onChange}
          placeholder="월 수입"
          autoFocus
        />

        {/* Preview */}
        {parsed > 0 && (
          <div className="rounded-xl bg-gray-50 dark:bg-[#131720] p-3 space-y-2">
            {DEFAULT_GROUPS.map((g) => {
              const pct = GROUP_PERCENT_MAP[g.id] ?? g.percentMin;
              const amount = Math.round((parsed * pct) / 100);
              const style = GROUP_STYLES[g.id] ?? FALLBACK_STYLE;
              return (
                <div key={g.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: style.color }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {g.title}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">
                      ({pct}%)
                    </span>
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                    {formatCurrency(amount)}원
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-none min-h-[48px] px-5 py-3 rounded-xl text-sm font-medium border border-gray-200 dark:border-[#2d3748] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1e2538] transition-colors active:scale-[0.98]"
          >
            뒤로
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={parsed <= 0 || distributing}
            className="flex-1 min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {distributing ? "배분 중..." : "배분하기"}
          </button>
        </div>
      </div>
    </FinanceCard>
  );
}

// ── IncomeCard ─────────────────────────────────────────────────────────────────

interface IncomeCardProps {
  month: string;
  income: number;
  totalAllocated: number;
  unallocated: number;
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  groups: ReturnType<typeof useBudgetSettings>["groups"];
  budgets: Record<string, number>;
}

function IncomeCard({
  month,
  income,
  totalAllocated,
  unallocated,
  editing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCommitEdit,
  groups,
  budgets,
}: IncomeCardProps) {
  const [, m] = month.split("-").map(Number);
  const monthLabel = `${m}월`;

  const allocatedPercent = income > 0
    ? Math.min(Math.round((totalAllocated / income) * 100), 100)
    : 0;

  return (
    <FinanceCard>
      <div className="space-y-4">
        {/* Income row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {monthLabel} 수입
            </p>
            {editing ? (
              <div className="mt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  autoFocus
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    onEditValueChange(digits ? Number(digits).toLocaleString("ko-KR") : "");
                  }}
                  onBlur={onCommitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitEdit();
                    if (e.key === "Escape") onCommitEdit();
                  }}
                  placeholder="수입 금액"
                  className="w-40 min-h-[36px] text-right text-base font-bold px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 tabular-nums"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartEdit}
                className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mt-0.5"
                aria-label="수입 수정"
              >
                {income > 0 ? `${formatCurrency(income)}원` : "탭하여 입력"}
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">총 예산 배분</p>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
              {formatCurrency(totalAllocated)}원
            </p>
            {income > 0 && (
              <p className={`text-xs font-medium tabular-nums mt-0.5 ${unallocated > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                {unallocated > 0 ? `미배분 ${formatCurrency(unallocated)}원` : "완전 배분"}
              </p>
            )}
          </div>
        </div>

        {/* Distribution bar */}
        {income > 0 && (
          <div className="space-y-1.5">
            {/* Stacked bar */}
            <div className="w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex">
              {groups.map((g) => {
                const gTotal = g.items.reduce(
                  (s, item) => s + (budgets[getItemKey(g.id, item.id)] ?? 0),
                  0
                );
                const pct = income > 0 ? (gTotal / income) * 100 : 0;
                const style = GROUP_STYLES[g.id] ?? FALLBACK_STYLE;
                return pct > 0 ? (
                  <div
                    key={g.id}
                    className="h-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: style.color }}
                  />
                ) : null;
              })}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-right">
              {allocatedPercent}% 배분됨
            </p>
          </div>
        )}
      </div>
    </FinanceCard>
  );
}
