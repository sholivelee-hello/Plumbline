"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
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

// ── Constants ────────────────────────────────────────────────────────────────

const GROUP_ID = "necessity" as const;
const GROUP_COLOR = "#059669";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NecessityPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { toast } = useToast();

  const { groups, loading: settingsLoading } = useBudgetSettings();
  const { transactions, byGroup, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } =
    useFinanceTransactions(month);
  const { budgets, loading: budgetLoading } = useBudget(month);

  const loading = settingsLoading || txLoading || budgetLoading;

  const necessityGroup = groups.find((g) => g.id === GROUP_ID);

  // ── Computed: group summary ──────────────────────────────────────────────
  const totalBudget = necessityGroup?.items.reduce((sum, item) => {
    return sum + (budgets[getItemKey(GROUP_ID, item.id)] ?? 0);
  }, 0) ?? 0;

  const totalActual = byGroup[GROUP_ID]?.total ?? 0;
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
    ? necessityGroup?.items.find((i) => i.id === expenseItemId)?.title ?? "지출"
    : "필요사항";

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
      group_id: GROUP_ID,
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
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">필요사항</h1>
          <MonthPicker month={month} onChange={setMonth} maxMonth={getCurrentMonth()} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {loading ? (
          <GroupPageSkeleton />
        ) : (
          <>
            {/* ── Group Summary Card ──────────────────────────────────────── */}
            <FinanceCard groupColor={GROUP_COLOR}>
              <div className="pl-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  이번 달 필요사항
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
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {formatCurrency(remaining, { sign: remaining < 0 })}
                    </p>
                  </div>
                </div>
                <FinanceProgressBar value={totalActual} max={totalBudget} color={GROUP_COLOR} height="md" />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-right">
                  목표 비중: 50~55%
                </p>
              </div>
            </FinanceCard>

            {/* ── Items List ──────────────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                항목별 지출
              </p>

              {(necessityGroup?.items ?? []).map((item) => {
                const itemBudget = budgets[getItemKey(GROUP_ID, item.id)] ?? 0;
                const itemActual = byGroup[GROUP_ID]?.byItem?.[item.id] ?? 0;
                const isExpanded = expandedItem === item.id;
                const itemTxs = transactions.filter(
                  (t) =>
                    t.type === "expense" &&
                    t.group_id === GROUP_ID &&
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
                        color={GROUP_COLOR}
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
                            text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20
                            hover:bg-emerald-100 dark:hover:bg-emerald-900/30
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
                {(necessityGroup?.items ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExpenseItemId(item.id)}
                    className="px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium
                      bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300
                      hover:bg-emerald-100 active:scale-95 transition-all"
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
                focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
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
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveExpense(); }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={expenseSaving || !canSaveExpense}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-emerald-600 hover:opacity-90
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
                  focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
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
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
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
    </div>
  );
}
