"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
import { useDebts } from "@/lib/hooks/use-debts";
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { getItemKey } from "@/lib/finance-config";
import type { FinanceTransaction } from "@/types/database";

import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { MonthPicker } from "@/components/finance/month-picker";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { Fab } from "@/components/finance/fab";
import { AmountInput } from "@/components/finance/amount-input";
import { TransactionRow } from "@/components/finance/transaction-row";
import { GroupPageSkeleton } from "@/components/finance/finance-skeleton";
import { useToast } from "@/components/ui/toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface DebtWithProgress {
  id: string;
  title: string;
  total_amount: number;
  total_paid: number;
  percent: number;
  is_completed: boolean;
  tags?: string[] | null;
  payments: Array<{ id: string; date: string; amount: number; memo: string | null }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function predictPayoff(debt: DebtWithProgress): number | null {
  // payments are sorted date DESC (newest-first) by use-debts
  const recentPayments = debt.payments.slice(0, 3);
  if (recentPayments.length < 2) return null;
  const avg = recentPayments.reduce((s, p) => s + p.amount, 0) / recentPayments.length;
  if (avg <= 0) return null;
  const remaining = debt.total_amount - debt.total_paid;
  if (remaining <= 0) return null;
  return Math.ceil(remaining / avg);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ObligationPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { toast } = useToast();

  const { groups, loading: settingsLoading } = useBudgetSettings();
  const { transactions, byGroup, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } =
    useFinanceTransactions(month);
  const { budgets, loading: budgetLoading } = useBudget(month);
  const { debts, loading: debtsLoading, addDebt, addPayment } = useDebts();

  const loading = settingsLoading || txLoading || budgetLoading;

  const obligationGroup = groups.find((g) => g.id === "obligation");

  // ── Computed: group summary ──────────────────────────────────────────────
  const totalBudget = obligationGroup?.items.reduce((sum, item) => {
    return sum + (budgets[getItemKey("obligation", item.id)] ?? 0);
  }, 0) ?? 0;

  const totalActual = byGroup["obligation"]?.total ?? 0;
  const remaining = totalBudget - totalActual;

  // ── Item expansion state ─────────────────────────────────────────────────
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  function toggleItem(itemId: string) {
    setExpandedItem((prev) => (prev === itemId ? null : itemId));
  }

  // ── Expense input sheet (inline "+ 지출 추가" per item) ──────────────────
  const [expenseSheet, setExpenseSheet] = useState(false);
  const [expenseItemId, setExpenseItemId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);

  function openExpenseSheet(itemId: string | null) {
    setExpenseItemId(itemId);
    setExpenseAmount("");
    setExpenseDate(new Date().toLocaleDateString("sv-SE"));
    setExpenseDesc("");
    setExpenseSheet(true);
  }

  // Selected item title for display in sheet
  const expenseItemTitle = expenseItemId
    ? obligationGroup?.items.find((i) => i.id === expenseItemId)?.title ?? "지출"
    : "의무사항";

  const parsedExpenseAmount = parseCurrencyInput(expenseAmount);
  const canSaveExpense = parsedExpenseAmount > 0;

  const handleSaveExpense = useCallback(async () => {
    if (!canSaveExpense) return;
    setExpenseSaving(true);
    const result = await addTransaction({
      type: "expense",
      amount: parsedExpenseAmount,
      description: expenseDesc.trim() || expenseItemTitle,
      date: expenseDate,
      group_id: "obligation",
      item_id: expenseItemId,
    });
    setExpenseSaving(false);
    if (result.ok) {
      toast(`지출 ${formatCurrency(parsedExpenseAmount)}원 저장됨`, "success");
      setExpenseSheet(false);
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [
    canSaveExpense,
    parsedExpenseAmount,
    expenseDesc,
    expenseItemTitle,
    expenseDate,
    expenseItemId,
    addTransaction,
    toast,
  ]);

  // ── Edit transaction sheet ────────────────────────────────────────────────
  const [editSheet, setEditSheet] = useState(false);
  const [editTx, setEditTx] = useState<FinanceTransaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEditSheet(tx: FinanceTransaction) {
    setEditTx(tx);
    setEditAmount(formatCurrency(tx.amount));
    setEditDesc(tx.description ?? "");
    setEditDate(tx.date);
    setEditSheet(true);
  }

  const parsedEditAmount = parseCurrencyInput(editAmount);

  const handleSaveEdit = useCallback(async () => {
    if (!editTx || parsedEditAmount <= 0) return;
    setEditSaving(true);
    const result = await updateTransaction(editTx.id, {
      amount: parsedEditAmount,
      description: editDesc.trim() || null,
      date: editDate,
    });
    setEditSaving(false);
    if (result.ok) {
      toast("수정되었습니다", "success");
      setEditSheet(false);
    } else {
      toast(result.error ?? "수정에 실패했습니다", "error");
    }
  }, [editTx, parsedEditAmount, editDesc, editDate, updateTransaction, toast]);

  async function handleDeleteTx(id: string) {
    const result = await deleteTransaction(id);
    if (!result.ok) toast(result.error ?? "삭제에 실패했습니다", "error");
  }

  // ── Debt expansion ───────────────────────────────────────────────────────
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);

  function toggleDebt(debtId: string) {
    setExpandedDebt((prev) => (prev === debtId ? null : debtId));
  }

  // ── Add debt sheet ────────────────────────────────────────────────────────
  const [addDebtSheet, setAddDebtSheet] = useState(false);
  const [debtTitle, setDebtTitle] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtTags, setDebtTags] = useState("");
  const [debtSaving, setDebtSaving] = useState(false);

  const parsedDebtAmount = parseCurrencyInput(debtAmount);
  const canSaveDebt = debtTitle.trim().length > 0 && parsedDebtAmount > 0;

  async function handleAddDebt() {
    if (!canSaveDebt) return;
    setDebtSaving(true);
    await addDebt(debtTitle.trim(), parsedDebtAmount);
    setDebtSaving(false);
    toast("빚이 추가되었습니다", "success");
    setAddDebtSheet(false);
    setDebtTitle("");
    setDebtAmount("");
    setDebtTags("");
  }

  // ── Payment sheet ─────────────────────────────────────────────────────────
  const [paymentSheet, setPaymentSheet] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtWithProgress | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMemo, setPaymentMemo] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  function openPaymentSheet(debt: DebtWithProgress) {
    setPaymentDebt(debt);
    setPaymentAmount("");
    setPaymentMemo("");
    setPaymentSheet(true);
  }

  const parsedPaymentAmount = parseCurrencyInput(paymentAmount);
  const canSavePayment = parsedPaymentAmount > 0;

  const handleSavePayment = useCallback(async () => {
    if (!paymentDebt || !canSavePayment) return;
    setPaymentSaving(true);

    // 1. Record in debt payments table
    const payResult = await addPayment(paymentDebt.id, parsedPaymentAmount, paymentMemo.trim());
    if (!payResult.ok) {
      toast(`상환 기록 실패: ${payResult.error ?? "알 수 없는 오류"}`, "error");
      setPaymentSaving(false);
      return;
    }

    // 2. Also create a finance transaction so it appears in cashbook
    const txResult = await addTransaction({
      type: "expense",
      amount: parsedPaymentAmount,
      description: `${paymentDebt.title} 상환`,
      date: new Date().toLocaleDateString("sv-SE"),
      group_id: "obligation",
      item_id: "debt",
      source: "debt",
    });
    if (!txResult.ok) {
      toast("가계부 연동 실패 (상환은 기록됨)", "error");
    }

    setPaymentSaving(false);
    toast(`상환 ${formatCurrency(parsedPaymentAmount)}원 기록됨`, "success");
    setPaymentSheet(false);
  }, [paymentDebt, canSavePayment, parsedPaymentAmount, paymentMemo, addPayment, addTransaction, toast]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32 bg-gray-50/50 dark:bg-[#0b0d12]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a2030] border-b border-gray-100 dark:border-[#2d3748]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/finance"
            aria-label="뒤로가기"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">의무사항</h1>
          <MonthPicker month={month} onChange={setMonth} maxMonth={getCurrentMonth()} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {loading ? (
          <GroupPageSkeleton />
        ) : (
          <>
            {/* ── Group Summary Card ──────────────────────────────────────── */}
            <FinanceCard groupColor="#1E3A5F">
              <div className="pl-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  이번 달 의무사항
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">예산</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                      {formatCurrency(totalBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">실적</p>
                    <p className="text-sm font-semibold text-red-500 dark:text-red-400 tabular-nums">
                      {formatCurrency(totalActual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">잔여</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        remaining >= 0
                          ? "text-[#1E3A5F] dark:text-blue-300"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {formatCurrency(remaining, { sign: remaining < 0 })}
                    </p>
                  </div>
                </div>
                <FinanceProgressBar value={totalActual} max={totalBudget} color="#1E3A5F" height="md" />
              </div>
            </FinanceCard>

            {/* ── Items List ──────────────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                항목별 지출
              </p>

              {(obligationGroup?.items ?? []).map((item) => {
                const itemBudget = budgets[getItemKey("obligation", item.id)] ?? 0;
                const itemActual = byGroup["obligation"]?.byItem?.[item.id] ?? 0;
                const isExpanded = expandedItem === item.id;
                const itemTxs = transactions.filter(
                  (t) =>
                    t.type === "expense" &&
                    t.group_id === "obligation" &&
                    t.item_id === item.id
                );

                return (
                  <FinanceCard key={item.id}>
                    {/* Row: tap to expand */}
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                            {formatCurrency(itemActual)}
                            {itemBudget > 0 && (
                              <span className="text-gray-300 dark:text-gray-600">
                                {" / "}{formatCurrency(itemBudget)}
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-xs transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        </div>
                      </div>
                      <FinanceProgressBar
                        value={itemActual}
                        max={itemBudget > 0 ? itemBudget : itemActual || 1}
                        color="#1E3A5F"
                        height="sm"
                      />
                    </button>

                    {/* Expanded: transactions + add button */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-[#2d3748] pt-3">
                        {itemTxs.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
                            이번 달 거래 내역이 없어요
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {itemTxs.map((tx) => (
                              <TransactionRow
                                key={tx.id}
                                transaction={tx}
                                groups={groups}
                                onEdit={openEditSheet}
                                onDelete={handleDeleteTx}
                              />
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => openExpenseSheet(item.id)}
                          className="w-full min-h-[40px] py-2 rounded-xl text-xs font-medium
                            text-[#1E3A5F] dark:text-blue-300 bg-[#1E3A5F]/8 dark:bg-[#1E3A5F]/20
                            hover:bg-[#1E3A5F]/12 dark:hover:bg-[#1E3A5F]/30
                            transition-colors active:scale-[0.98]"
                        >
                          + 지출 추가
                        </button>
                      </div>
                    )}
                  </FinanceCard>
                );
              })}
            </section>

            {/* ── Divider ─────────────────────────────────────────────────── */}
            <div className="border-t border-gray-200 dark:border-[#2d3748]" />

            {/* ── Debts Section ────────────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  갚아야 할 빚
                </p>
                <button
                  type="button"
                  onClick={() => setAddDebtSheet(true)}
                  className="text-xs font-medium text-[#1E3A5F] dark:text-blue-300 px-3 py-1.5 rounded-full
                    bg-[#1E3A5F]/8 dark:bg-[#1E3A5F]/20 hover:bg-[#1E3A5F]/12 dark:hover:bg-[#1E3A5F]/30
                    transition-colors active:scale-95"
                >
                  + 빚 추가
                </button>
              </div>

              {debtsLoading ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                    불러오는 중...
                  </p>
                </FinanceCard>
              ) : debts.length === 0 ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    등록된 빚이 없어요
                  </p>
                </FinanceCard>
              ) : (
                debts.map((debt) => {
                  const typedDebt = debt as DebtWithProgress;
                  const months = predictPayoff(typedDebt);
                  const isDebtExpanded = expandedDebt === debt.id;

                  return (
                    <FinanceCard key={debt.id} groupColor={debt.is_completed ? "#9CA3AF" : "#1E3A5F"}>
                      <div className="pl-2">
                        {/* Title + percent */}
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {debt.title}
                          </h3>
                          <span
                            className={`shrink-0 ml-2 text-xs font-semibold tabular-nums ${
                              debt.is_completed
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "text-[#1E3A5F] dark:text-blue-300"
                            }`}
                          >
                            {debt.is_completed ? "완납" : `${debt.percent}%`}
                          </span>
                        </div>

                        {/* Tags */}
                        {typedDebt.tags && typedDebt.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-2">
                            {typedDebt.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium
                                  bg-[#1E3A5F]/8 text-[#1E3A5F] dark:bg-[#1E3A5F]/20 dark:text-blue-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="mb-3">
                          <FinanceProgressBar
                            value={debt.total_paid}
                            max={debt.total_amount}
                            color="#1E3A5F"
                            height="md"
                          />
                        </div>

                        {/* 총액 / 상환 / 잔액 */}
                        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">총액</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                              {formatCurrency(debt.total_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">상환</p>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(debt.total_paid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">잔액</p>
                            <p className="font-semibold text-red-500 dark:text-red-400 tabular-nums">
                              {formatCurrency(debt.total_amount - debt.total_paid)}
                            </p>
                          </div>
                        </div>

                        {/* Payoff prediction */}
                        {months !== null && !debt.is_completed && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
                            이 속도면 약 {months}개월 후 완납
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {!debt.is_completed && (
                            <button
                              type="button"
                              onClick={() => openPaymentSheet(typedDebt)}
                              className="flex-1 min-h-[40px] py-2 rounded-xl text-xs font-medium
                                bg-[#1E3A5F] text-white
                                hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                              상환 기록
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDebt(debt.id)}
                            className="flex-1 min-h-[40px] py-2 rounded-xl text-xs font-medium
                              text-gray-600 dark:text-gray-300
                              bg-gray-100 dark:bg-[#262c38]
                              hover:bg-gray-200 dark:hover:bg-[#2d3748]
                              active:scale-[0.98] transition-all"
                          >
                            타임라인 {isDebtExpanded ? "숨기기" : "보기"}
                          </button>
                        </div>

                        {/* Payment timeline */}
                        {isDebtExpanded && (
                          <div className="mt-3 border-t border-gray-100 dark:border-[#2d3748] pt-3 space-y-2">
                            {debt.payments.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                상환 기록이 없어요
                              </p>
                            ) : (
                              debt.payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                                    {p.date}
                                  </span>
                                  <span className="flex-1 mx-3 text-gray-600 dark:text-gray-300 truncate">
                                    {p.memo || "상환"}
                                  </span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                                    {formatCurrency(p.amount)}원
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </FinanceCard>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      {/* FAB */}
      <Fab onClick={() => openExpenseSheet(null)} label="지출 기록" />

      {/* ── Expense Input Sheet ──────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={expenseSheet}
        onClose={() => setExpenseSheet(false)}
        title={`지출 입력 · ${expenseItemTitle}`}
      >
        <div className="space-y-5">
          {/* Item selector (when opened from FAB, let user pick item) */}
          {expenseItemId === null && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">항목 선택</p>
              <div className="flex flex-wrap gap-2">
                {(obligationGroup?.items ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExpenseItemId(item.id)}
                    className="px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium
                      bg-[#1E3A5F]/10 text-[#1E3A5F] dark:bg-[#1E3A5F]/25 dark:text-blue-300
                      hover:bg-[#1E3A5F]/20 active:scale-95 transition-all"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
            <AmountInput value={expenseAmount} onChange={setExpenseAmount} placeholder="금액" autoFocus />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">메모 (선택)</p>
            <input
              type="text"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="내역 설명"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveExpense(); }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={expenseSaving || !canSaveExpense}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#1E3A5F] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {expenseSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit Transaction Sheet ───────────────────────────────────────────── */}
      <BottomSheet
        isOpen={editSheet}
        onClose={() => setEditSheet(false)}
        title="거래 수정"
      >
        {editTx && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
              <AmountInput value={editAmount} onChange={setEditAmount} placeholder="금액" autoFocus />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                  bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">메모</p>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="내역 설명"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                  bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editSaving || parsedEditAmount <= 0}
              className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
                bg-indigo-600 dark:bg-indigo-500 hover:opacity-90
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-opacity active:scale-[0.98]"
            >
              {editSaving ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── Add Debt Sheet ───────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={addDebtSheet}
        onClose={() => setAddDebtSheet(false)}
        title="빚 추가"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
            <input
              type="text"
              value={debtTitle}
              onChange={(e) => setDebtTitle(e.target.value)}
              placeholder="예: 학자금 대출"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">총 금액 (원)</p>
            <AmountInput value={debtAmount} onChange={setDebtAmount} placeholder="총 빚 금액" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              태그 (선택, 쉼표로 구분)
            </p>
            <input
              type="text"
              value={debtTags}
              onChange={(e) => setDebtTags(e.target.value)}
              placeholder="예: 학자금, 장기"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              태그는 향후 버전에서 지원될 예정입니다
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddDebt}
            disabled={debtSaving || !canSaveDebt}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#1E3A5F] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {debtSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Payment Sheet ────────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={paymentSheet}
        onClose={() => setPaymentSheet(false)}
        title={paymentDebt ? `${paymentDebt.title} 상환 기록` : "상환 기록"}
      >
        <div className="space-y-5">
          {paymentDebt && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#262c38] text-xs text-gray-500 dark:text-gray-400">
              잔액:{" "}
              <span className="font-semibold text-red-500 dark:text-red-400 tabular-nums">
                {formatCurrency(paymentDebt.total_amount - paymentDebt.total_paid)}원
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">상환 금액 (원)</p>
            <AmountInput value={paymentAmount} onChange={setPaymentAmount} placeholder="상환 금액" autoFocus />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">메모 (선택)</p>
            <input
              type="text"
              value={paymentMemo}
              onChange={(e) => setPaymentMemo(e.target.value)}
              placeholder="메모"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSavePayment(); }}
            />
          </div>
          <button
            type="button"
            onClick={handleSavePayment}
            disabled={paymentSaving || !canSavePayment}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#1E3A5F] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {paymentSaving ? "저장 중..." : "상환 기록"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
