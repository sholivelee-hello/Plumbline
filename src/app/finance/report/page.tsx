"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { useFinanceHub } from "@/lib/hooks/use-finance-hub";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
import { useDebts } from "@/lib/hooks/use-debts";
import { useInstallments } from "@/lib/hooks/use-installments";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { useRecurring } from "@/lib/hooks/use-recurring";
import { useSubscriptions } from "@/lib/hooks/use-subscriptions";

import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceDonutChart } from "@/components/finance/finance-donut-chart";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { MonthPicker } from "@/components/finance/month-picker";
import { HubSkeleton } from "@/components/finance/finance-skeleton";

import { formatCurrency, getCurrentMonth, shiftMonth } from "@/lib/finance-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

function computePayoffDate(startDate: string, totalMonths: number): string {
  const start = new Date(startDate);
  const payoff = new Date(start.getFullYear(), start.getMonth() + totalMonths, 1);
  return `${payoff.getFullYear()}년 ${payoff.getMonth() + 1}월`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [month, setMonth] = useState(getCurrentMonth());

  // ── Core data ──────────────────────────────────────────────────────────────
  const { summary, donutData, groupCards, rollovers, loading: hubLoading } = useFinanceHub(month);
  const { incomes, totalExpense } = useFinanceTransactions(month);
  const { grandTotal } = useBudget(month);

  // ── Previous month for delta ──────────────────────────────────────────────
  const prevMonth = shiftMonth(month, -1);
  const { totalExpense: prevExpense } = useFinanceTransactions(prevMonth);

  const expenseDelta = summary.expense - prevExpense;
  const expensePercentDelta =
    prevExpense > 0 ? (expenseDelta / prevExpense) * 100 : 0;

  // ── Heaven bank ───────────────────────────────────────────────────────────
  const { entries: heavenBank, monthlySow, monthlyReap, loading: heavenLoading } =
    useHeavenBank(month);

  const heavenBalance = monthlySow - monthlyReap;

  const byTarget = useMemo(() => {
    const thisMonthSows = heavenBank.filter(
      (e) => e.type === "sow" && e.date.startsWith(month)
    );
    return thisMonthSows.reduce((acc, e) => {
      const key = e.target ?? "기타";
      acc[key] = (acc[key] ?? 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [heavenBank, month]);

  const topTargets = useMemo(
    () =>
      Object.entries(byTarget)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [byTarget]
  );

  // ── Debts & installments ──────────────────────────────────────────────────
  const { debts, loading: debtsLoading } = useDebts();
  const { installments, loading: installmentsLoading } = useInstallments();

  const activeDebts = debts.filter((d) => !d.is_completed);
  const activeInstallments = installments.filter((i) => !i.is_completed);

  // This month's debt payments (use payments filtered by this month's date range)
  const monthDebtPayments = useMemo(() => {
    return debts.reduce((sum, d) => {
      const thisMonthPmts = d.payments.filter((p) => p.date.startsWith(month));
      return sum + thisMonthPmts.reduce((s, p) => s + p.amount, 0);
    }, 0);
  }, [debts, month]);

  const monthInstallmentPayments = useMemo(
    () => activeInstallments.reduce((s, i) => s + i.monthly_payment, 0),
    [activeInstallments]
  );

  // Earliest projected payoff among active installments
  const earliestPayoff = useMemo(() => {
    if (activeInstallments.length === 0) return null;
    return activeInstallments.reduce<{ title: string; date: string } | null>((best, item) => {
      const dateStr = computePayoffDate(item.start_date, item.total_months);
      if (!best) return { title: item.title, date: dateStr };
      // Compare as strings: "YYYY년 M월" — do rough numeric parse
      const toNum = (s: string) => {
        const [yPart, mPart] = s.split("년 ");
        return Number(yPart) * 12 + Number(mPart.replace("월", "").trim());
      };
      return toNum(dateStr) < toNum(best.date)
        ? { title: item.title, date: dateStr }
        : best;
    }, null);
  }, [activeInstallments]);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const { activeSubscriptions, totalMonthlyAmount, loading: subscriptionsLoading } = useSubscriptions();

  // ── Recurring logs ────────────────────────────────────────────────────────
  const { recurring, loading: recurringLoading } = useRecurring();
  const [executedIds, setExecutedIds] = useState<Set<string>>(new Set());
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLogsLoading(true);
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("finance_recurring_logs")
        .select("recurring_id")
        .eq("month", month);
      if (!cancelled) {
        setExecutedIds(new Set((data ?? []).map((l: { recurring_id: string }) => l.recurring_id)));
        setLogsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [month]);

  const activeRecurring = recurring.filter((r) => r.is_active);
  const visibleRecurring = activeRecurring.filter((r) => !r.subscription_id);
  const executedRecurring = visibleRecurring.filter((r) => executedIds.has(r.id));
  const missedRecurring = visibleRecurring.filter((r) => !executedIds.has(r.id));

  // ── Income analysis ───────────────────────────────────────────────────────
  const incomeByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    for (const tx of incomes) {
      const key = tx.description ?? "기타";
      result[key] = (result[key] ?? 0) + tx.amount;
    }
    return Object.entries(result).sort((a, b) => b[1] - a[1]);
  }, [incomes]);

  // ── Loading state ─────────────────────────────────────────────────────────
  const loading =
    hubLoading ||
    heavenLoading ||
    debtsLoading ||
    installmentsLoading ||
    recurringLoading ||
    subscriptionsLoading ||
    logsLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32 bg-gray-50/50 dark:bg-[#0b0d12]">

      {/* Header */}
      <div className="bg-white dark:bg-[#1a2030] border-b border-gray-100 dark:border-[#2d3748] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/finance"
            aria-label="뒤로가기"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">
            월간 리포트
          </h1>
          <MonthPicker month={month} onChange={setMonth} maxMonth={getCurrentMonth()} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <HubSkeleton />
        ) : (
          <>
            {/* ── Card 1: 재정 요약 ──────────────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                {formatMonthTitle(month)} 재정 요약
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">수입</span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(summary.income)}원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">지출</span>
                  <span className="text-sm font-semibold tabular-nums text-red-500 dark:text-red-400">
                    -{formatCurrency(summary.expense)}원
                  </span>
                </div>

                <div className="border-t border-gray-100 dark:border-[#2d3748] pt-2.5" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">잔액</span>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      summary.balance >= 0
                        ? "text-[#2563EB] dark:text-blue-300"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(summary.balance, { sign: true })}원
                  </span>
                </div>
              </div>

              {/* Delta vs prev month */}
              {prevExpense > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2d3748]">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    전월 대비 지출{" "}
                    <span
                      className={
                        expenseDelta <= 0
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-red-500 dark:text-red-400 font-medium"
                      }
                    >
                      {expenseDelta <= 0 ? "▼" : "▲"}{" "}
                      {formatCurrency(Math.abs(expenseDelta))} (
                      {expenseDelta <= 0 ? "-" : "+"}
                      {Math.abs(expensePercentDelta).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              )}
            </FinanceCard>

            {/* ── Card 2: 그룹별 지출 비율 ──────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                그룹별 지출 비율
              </p>
              {donutData.some((d) => d.amount > 0) ? (
                <FinanceDonutChart data={donutData} size={180} />
              ) : (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-6">
                  이번 달 지출 기록 없음
                </p>
              )}
            </FinanceCard>

            {/* ── Card 3: 예산 달성률 ────────────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                예산 달성률
              </p>

              {groupCards.length === 0 ? (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-4">
                  데이터 없음
                </p>
              ) : (
                <div className="space-y-4">
                  {groupCards.map((card) => (
                    <div key={card.groupId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {card.title}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold tabular-nums ml-2 shrink-0 ${
                            card.percent > 100
                              ? "text-red-500"
                              : card.percent >= 80
                              ? "text-amber-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {card.percent}%
                        </span>
                      </div>
                      <FinanceProgressBar
                        value={card.actual}
                        max={card.budget}
                        color={card.color}
                        height="sm"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
                        {formatCurrency(card.actual)} / {formatCurrency(card.budget)}원
                      </p>
                    </div>
                  ))}

                  {/* Total row */}
                  <div className="pt-3 border-t border-gray-100 dark:border-[#2d3748]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        전체
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          grandTotal > 0 && totalExpense / grandTotal > 1
                            ? "text-red-500"
                            : grandTotal > 0 && totalExpense / grandTotal >= 0.8
                            ? "text-amber-500"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {grandTotal > 0
                          ? `${Math.round((totalExpense / grandTotal) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                    <FinanceProgressBar value={totalExpense} max={grandTotal} height="md" />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
                      {formatCurrency(totalExpense)} / {formatCurrency(grandTotal)}원
                    </p>
                  </div>
                </div>
              )}
            </FinanceCard>

            {/* ── Card 4: 수입 분석 ──────────────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                수입 분석
              </p>

              {incomeByCategory.length === 0 ? (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-4">
                  수입 기록 없음
                </p>
              ) : (
                <div className="space-y-3">
                  {incomeByCategory.map(([label, amount]) => {
                    const pct =
                      summary.income > 0
                        ? Math.round((amount / summary.income) * 100)
                        : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[55%]">
                            {label}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                            {formatCurrency(amount)}원
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 w-7 text-right shrink-0">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FinanceCard>

            {/* ── Card 5: 하늘은행 ───────────────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                하늘은행
              </p>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">심음</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                    {formatCurrency(monthlySow)}원
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">거둠</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatCurrency(monthlyReap)}원
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">잔액</p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      heavenBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(heavenBalance, { sign: true })}원
                  </p>
                </div>
              </div>

              {(rollovers.sowing ?? 0) > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-purple-50/60 dark:bg-purple-900/15 px-3 py-2">
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    지난달 심음 이월
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-purple-700 dark:text-purple-300">
                    +{formatCurrency(rollovers.sowing ?? 0)}원
                  </span>
                </div>
              )}

              {topTargets.length > 0 ? (
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wide">
                    심음 대상
                  </p>
                  <div className="space-y-1.5">
                    {topTargets.map(([target, amount]) => (
                      <div key={target} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[60%]">
                          {target}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-purple-600 dark:text-purple-400 shrink-0 ml-2">
                          {formatCurrency(amount)}원
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-2">
                  이번 달 심음 기록 없음
                </p>
              )}
            </FinanceCard>

            {/* ── Card 6: 빚/할부/구독 현황 ────────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                빚/할부/구독 현황
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">활성 빚</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {activeDebts.length}건
                    </span>
                    {monthDebtPayments > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 tabular-nums">
                        이번 달 {formatCurrency(monthDebtPayments)}원 상환
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">활성 할부</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {activeInstallments.length}건
                    </span>
                    {monthInstallmentPayments > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 tabular-nums">
                        이번 달 {formatCurrency(monthInstallmentPayments)}원 납부
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">활성 구독</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {activeSubscriptions.length}건
                    </span>
                    {totalMonthlyAmount > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 tabular-nums">
                        월 {formatCurrency(totalMonthlyAmount)}원
                      </span>
                    )}
                  </div>
                </div>

                {earliestPayoff && (
                  <div className="pt-2 border-t border-gray-100 dark:border-[#2d3748]">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      다음 완납 예정:{" "}
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {earliestPayoff.title} — {earliestPayoff.date}
                      </span>
                    </p>
                  </div>
                )}

                {activeDebts.length === 0 && activeInstallments.length === 0 && activeSubscriptions.length === 0 && (
                  <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-2">
                    활성 빚/할부/구독 없음
                  </p>
                )}
              </div>
            </FinanceCard>

            {/* ── Card 7: 반복 거래 실행 현황 ───────────────────────────── */}
            <FinanceCard>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                반복 거래 실행 현황
              </p>

              {visibleRecurring.length === 0 ? (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-4">
                  등록된 반복 거래 없음
                </p>
              ) : (
                <div className="space-y-1.5">
                  {executedRecurring.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                        <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                        {r.description}
                      </span>
                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 shrink-0">
                        {formatCurrency(r.amount)}원
                      </span>
                    </div>
                  ))}

                  {missedRecurring.length > 0 && (
                    <>
                      {executedRecurring.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-[#2d3748] my-2" />
                      )}
                      {missedRecurring.map((r) => (
                        <div key={r.id} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <X size={11} className="text-gray-400 dark:text-gray-500" />
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500 flex-1 truncate">
                            {r.description}
                          </span>
                          <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500 shrink-0">
                            {formatCurrency(r.amount)}원
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="pt-3 mt-1 border-t border-gray-100 dark:border-[#2d3748]">
                    <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      실행 {executedRecurring.length}/{visibleRecurring.length}건
                    </p>
                  </div>
                </div>
              )}
            </FinanceCard>
          </>
        )}
      </div>
    </div>
  );
}
