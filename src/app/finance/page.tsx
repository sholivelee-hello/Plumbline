"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BookOpen,
  ClipboardList,
  CreditCard,
  BarChart2,
  Settings,
  Banknote,
  Repeat,
} from "lucide-react";
import { useFinanceHub } from "@/lib/hooks/use-finance-hub";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useRecurring } from "@/lib/hooks/use-recurring";
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceDonutChart } from "@/components/finance/finance-donut-chart";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { HubSkeleton } from "@/components/finance/finance-skeleton";
import { MonthPicker } from "@/components/finance/month-picker";
import { Fab } from "@/components/finance/fab";
import { TransactionRow } from "@/components/finance/transaction-row";
import { AmountInput } from "@/components/finance/amount-input";

// ── Group chip styles (input modal) ──────────────────────────────────────────

const GROUP_CHIP_STYLES: Record<string, { base: string; active: string }> = {
  obligation: {
    base: "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/25 dark:text-blue-300",
    active: "bg-[#2563EB] text-white",
  },
  necessity: {
    base: "bg-[#059669]/10 text-[#059669] dark:bg-[#059669]/25 dark:text-emerald-300",
    active: "bg-[#059669] text-white",
  },
  sowing: {
    base: "bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-[#7C3AED]/25 dark:text-purple-300",
    active: "bg-[#7C3AED] text-white",
  },
  want: {
    base: "bg-[#EA580C]/10 text-[#EA580C] dark:bg-[#EA580C]/25 dark:text-orange-300",
    active: "bg-[#EA580C] text-white",
  },
};

// ── Main page ─────────────────────────────────────────────────────────────────

function FinancePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [month, setMonth] = useState(getCurrentMonth());
  const { toast } = useToast();

  const { summary, donutData, groupCards, heavenBankBalance, heavenBankMonthlySow, todayTransactions, loading, refresh } =
    useFinanceHub(month);
  const { addTransaction } = useFinanceTransactions(month);
  const { groups, incomeCategories } = useBudgetSettings();
  const { executeForMonth } = useRecurring();


  // ── Auto-execute recurring transactions once per month ───────────────────
  const lastExecutedMonth = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    if (lastExecutedMonth.current === month) return;
    lastExecutedMonth.current = month;

    let cancelled = false;
    (async () => {
      const result = await executeForMonth(month);
      if (!cancelled && result.executed > 0) {
        toast(`반복 거래 ${result.executed}건이 자동 기록되었습니다`, "info");
        refresh();
      }
    })();

    return () => { cancelled = true; };
  }, [month, loading, executeForMonth, refresh, toast]);

  // ── Input sheet state ─────────────────────────────────────────────────────
  const [inputOpen, setInputOpen] = useState(false);
  const [isIncome, setIsIncome] = useState(false);

  // ── Open input sheet via ?openInput=1 query param ────────────────────────
  useEffect(() => {
    if (params.get("openInput") === "1") {
      setInputOpen(true);
    }
  }, [params]);

  // expense
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // income
  const [incomeCategory, setIncomeCategory] = useState<string | null>(null);

  // shared
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function resetInput() {
    setIsIncome(false);
    setSelectedGroupId(null);
    setSelectedItemId(null);
    setIncomeCategory(null);
    setAmount("");
    setDate(new Date().toLocaleDateString("sv-SE"));
    setDescription("");
  }

  function openInput() {
    resetInput();
    setInputOpen(true);
  }

  const parsedAmount = parseCurrencyInput(amount);

  const canSave = isIncome
    ? parsedAmount > 0 && incomeCategory !== null
    : parsedAmount > 0 && selectedGroupId !== null;

  const handleSave = useCallback(async () => {
    if (!canSave || parsedAmount <= 0) return;

    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    const selectedItem = selectedGroup?.items.find((i) => i.id === selectedItemId);

    setSaving(true);
    const result = await addTransaction(
      isIncome
        ? {
            type: "income",
            amount: parsedAmount,
            description: description.trim() || incomeCategory || "수입",
            date,
          }
        : {
            type: "expense",
            amount: parsedAmount,
            description: description.trim() || selectedItem?.title || "지출",
            date,
            group_id: selectedGroupId,
            item_id: selectedItemId,
          }
    );
    setSaving(false);

    if (result.ok) {
      toast(
        isIncome
          ? `수입 ${formatCurrency(parsedAmount)}원 저장됨`
          : `지출 ${formatCurrency(parsedAmount)}원 저장됨`,
        "success"
      );
      setInputOpen(false);
      resetInput();
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [
    canSave,
    parsedAmount,
    isIncome,
    description,
    incomeCategory,
    date,
    selectedGroupId,
    selectedItemId,
    groups,
    addTransaction,
    toast,
  ]);

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="재정 관리" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {/* ── 1. Month Picker ──────────────────────────────────────────────── */}
        <MonthPicker
          month={month}
          onChange={setMonth}
          maxMonth={getCurrentMonth()}
        />

        {loading ? (
          <HubSkeleton />
        ) : (
          <>
            {/* ── 2. Summary Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              <FinanceCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 수입
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatCurrency(summary.income)}
                </p>
                <span className="text-[10px] text-gray-400 mt-0.5 block">원</span>
              </FinanceCard>

              <FinanceCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown size={14} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 지출
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-red-500 dark:text-red-400 tabular-nums">
                  -{formatCurrency(summary.expense)}
                </p>
                <span className="text-[10px] text-gray-400 mt-0.5 block">원</span>
              </FinanceCard>

              <FinanceCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wallet size={14} className="text-[#2563EB] dark:text-blue-300 shrink-0" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 잔액
                  </span>
                </div>
                <p
                  className={`text-sm lg:text-base font-bold tabular-nums ${
                    summary.balance >= 0
                      ? "text-[#2563EB] dark:text-blue-300"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(summary.balance, { sign: true })}
                </p>
                <span className="text-[10px] text-gray-400 mt-0.5 block">원</span>
              </FinanceCard>
            </div>

            {/* ── 3. Donut Chart ──────────────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                그룹별 지출
              </p>
              <FinanceDonutChart data={donutData} size={180} />
            </FinanceCard>

            {/* ── 4. Group Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupCards.map((card) =>
                card.groupId === "sowing" ? (
                  // 하늘은행 카드: 누적 잔액 표시
                  <FinanceCard
                    key={card.groupId}
                    groupColor={card.color}
                    onClick={() => router.push("/finance/sowing")}
                    className="pl-5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {card.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                        누적 잔액
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#7C3AED] dark:text-violet-400 tabular-nums">
                      {formatCurrency(heavenBankBalance)}
                      <span className="text-xs font-normal ml-1">원</span>
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">
                      이번 달 심음 {formatCurrency(heavenBankMonthlySow)}원
                    </p>
                  </FinanceCard>
                ) : (
                  <FinanceCard
                    key={card.groupId}
                    groupColor={card.color}
                    onClick={() => router.push(`/finance/${card.groupId}`)}
                    className="pl-5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {card.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                        {card.percentGuide}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums mb-2">
                      {formatCurrency(card.actual)}{" "}
                      <span className="text-gray-300 dark:text-gray-600">/</span>{" "}
                      {formatCurrency(card.budget)} 원
                    </p>

                    <FinanceProgressBar
                      value={card.actual}
                      max={card.budget}
                      color={card.color}
                      height="sm"
                    />

                    <p
                      className={`text-[11px] font-medium tabular-nums mt-1 ${
                        card.percent > 100
                          ? "text-red-500"
                          : card.percent >= 80
                          ? "text-amber-500"
                          : "text-gray-400"
                      }`}
                    >
                      ({card.percent}%)
                    </p>
                  </FinanceCard>
                )
              )}
            </div>

            {/* ── 5. Quick Shortcuts ──────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {(
                [
                  { href: "/finance/cashbook",       icon: BookOpen,     label: "출납부", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                  { href: "/finance/budget",         icon: ClipboardList, label: "예산",  color: "text-indigo-600 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-900/20" },
                  { href: "/finance/debts",          icon: Banknote,     label: "빚",     color: "text-slate-600 dark:text-slate-400",    bg: "bg-slate-100 dark:bg-slate-800/50" },
                  { href: "/finance/installments",   icon: CreditCard,   label: "할부",   color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/20" },
                  { href: "/finance/subscriptions",  icon: Repeat,       label: "구독",   color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-900/20" },
                  { href: "/finance/report",         icon: BarChart2,    label: "리포트", color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/20" },
                  { href: "/finance/settings",       icon: Settings,     label: "설정",   color: "text-gray-600 dark:text-gray-400",      bg: "bg-gray-100 dark:bg-gray-800" },
                ] as const
              ).map(({ href, icon: Icon, label, color, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="shrink-0 flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] shadow-sm hover:shadow-md transition-shadow active:scale-[0.96] min-w-[64px]"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon size={16} className={color} />
                  </span>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* ── 6. Today's Transactions ─────────────────────────────── */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  오늘의 거래
                </p>
                <Link
                  href="/finance/cashbook"
                  className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  더보기 →
                </Link>
              </div>

              {todayTransactions.length === 0 ? (
                <FinanceCard>
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      아직 기록이 없어요
                    </p>
                    <button
                      onClick={openInput}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 active:scale-95 transition-transform"
                    >
                      + 지출 기록하기
                    </button>
                  </div>
                </FinanceCard>
              ) : (
                <div className="space-y-1.5">
                  {todayTransactions.slice(0, 5).map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      groups={groups}
                      readOnly
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── 7. FAB ──────────────────────────────────────────────────────────── */}
      <Fab onClick={openInput} label="거래 추가" />

      {/* ── Universal Input BottomSheet ─────────────────────────────────────── */}
      <BottomSheet
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title="거래 입력"
      >
        <div className="space-y-5">
          {/* Segmented toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#262c38]">
            <button
              type="button"
              onClick={() => { setIsIncome(false); setIncomeCategory(null); }}
              className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                !isIncome
                  ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => { setIsIncome(true); setSelectedGroupId(null); setSelectedItemId(null); }}
              className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                isIncome
                  ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              수입
            </button>
          </div>

          {isIncome ? (
            /* ── Income: category chips ─────────────────────────────── */
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                수입 분류
              </p>
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setIncomeCategory(cat)}
                    className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                      incomeCategory === cat
                        ? "bg-blue-500 text-white"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Expense: group → item ──────────────────────────────── */
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  그룹 선택
                </p>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const style = GROUP_CHIP_STYLES[g.id] ?? GROUP_CHIP_STYLES.want;
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setSelectedGroupId(g.id); setSelectedItemId(null); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                          isSelected ? style.active : style.base
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        {g.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedGroupId && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    항목 선택
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groups
                      .find((g) => g.id === selectedGroupId)
                      ?.items.map((item) => {
                        const style = GROUP_CHIP_STYLES[selectedGroupId] ?? GROUP_CHIP_STYLES.want;
                        const isSelected = selectedItemId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                              isSelected ? style.active : style.base
                            }`}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Amount */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              금액 (원)
            </p>
            <AmountInput
              value={amount}
              onChange={setAmount}
              placeholder="금액"
              autoFocus
            />
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              날짜
            </p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              메모 (선택)
            </p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="내역 설명"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense>
      <FinancePageInner />
    </Suspense>
  );
}
