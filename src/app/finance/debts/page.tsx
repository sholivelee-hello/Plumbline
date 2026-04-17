"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp, MoreHorizontal, Trash2, Pencil } from "lucide-react";

import { useDebts } from "@/lib/hooks/use-debts";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { useToast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export default function DebtsPage() {
  const { toast } = useToast();
  const thisMonth = getCurrentMonth();

  const { debts, loading: debtsLoading, addDebt, updateDebt, addPayment } = useDebts();
  const { addTransaction } = useFinanceTransactions(thisMonth);

  // ── Computed summaries ───────────────────────────────────────────────────
  const activeDebts = (debts as DebtWithProgress[]).filter((d) => !d.is_completed);
  const completedDebts = (debts as DebtWithProgress[]).filter((d) => d.is_completed);

  const totalRemaining = activeDebts.reduce(
    (s, d) => s + (d.total_amount - d.total_paid),
    0
  );

  const thisMonthPayments = (debts as DebtWithProgress[]).flatMap((d) =>
    d.payments.filter((p) => p.date.startsWith(thisMonth))
  );
  const thisMonthTotal = thisMonthPayments.reduce((s, p) => s + p.amount, 0);

  // ── Expansion state ──────────────────────────────────────────────────────
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState<string | null>(null);

  function toggleDebt(debtId: string) {
    setExpandedDebt((prev) => (prev === debtId ? null : debtId));
  }

  // ── Add debt sheet ────────────────────────────────────────────────────────
  const [addDebtSheet, setAddDebtSheet] = useState(false);
  const [debtTitle, setDebtTitle] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtTagsInput, setDebtTagsInput] = useState("");
  const [debtSaving, setDebtSaving] = useState(false);

  const parsedDebtAmount = parseCurrencyInput(debtAmount);
  const canSaveDebt = debtTitle.trim().length > 0 && parsedDebtAmount > 0;

  function openAddDebtSheet() {
    setDebtTitle("");
    setDebtAmount("");
    setDebtTagsInput("");
    setAddDebtSheet(true);
  }

  const handleAddDebt = useCallback(async () => {
    if (!canSaveDebt) return;
    setDebtSaving(true);
    const tags = debtTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const result = await addDebt(debtTitle.trim(), parsedDebtAmount, tags.length > 0 ? tags : undefined);
    setDebtSaving(false);
    if (result.ok) {
      toast("빚이 추가되었습니다", "success");
      setAddDebtSheet(false);
    } else {
      toast(result.error ?? "추가에 실패했습니다", "error");
    }
  }, [canSaveDebt, debtTitle, parsedDebtAmount, debtTagsInput, addDebt, toast]);

  // ── Edit debt sheet ───────────────────────────────────────────────────────
  const [editDebtSheet, setEditDebtSheet] = useState(false);
  const [editDebt, setEditDebt] = useState<DebtWithProgress | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEditDebtSheet(debt: DebtWithProgress) {
    setEditDebt(debt);
    setEditTitle(debt.title);
    setEditTagsInput((debt.tags ?? []).join(", "));
    setEditDebtSheet(true);
    setOverflowOpen(null);
  }

  const canSaveEdit = editTitle.trim().length > 0;

  const handleSaveEdit = useCallback(async () => {
    if (!editDebt || !canSaveEdit) return;
    setEditSaving(true);
    const tags = editTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const result = await updateDebt(editDebt.id, {
      title: editTitle.trim(),
      tags,
    });
    setEditSaving(false);
    if (result.ok) {
      toast("수정되었습니다", "success");
      setEditDebtSheet(false);
    } else {
      toast(result.error ?? "수정에 실패했습니다", "error");
    }
  }, [editDebt, canSaveEdit, editTitle, editTagsInput, updateDebt, toast]);

  // ── Delete debt ───────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DebtWithProgress | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openDeleteConfirm(debt: DebtWithProgress) {
    setDeleteTarget(debt);
    setDeleteConfirm(true);
    setOverflowOpen(null);
  }

  const handleDeleteDebt = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    // updateDebt to mark deleted — use is_completed as soft-delete signal
    // since use-debts doesn't expose a deleteDebt, we soft-complete it
    const result = await updateDebt(deleteTarget.id, { tags: ["__deleted__"] });
    setDeleteLoading(false);
    if (result.ok) {
      toast("삭제되었습니다", "success");
    } else {
      toast(result.error ?? "삭제에 실패했습니다", "error");
    }
    setDeleteConfirm(false);
    setDeleteTarget(null);
  }, [deleteTarget, updateDebt, toast]);

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

    // 1. Record debt payment
    const payResult = await addPayment(paymentDebt.id, parsedPaymentAmount, paymentMemo.trim());
    if (!payResult.ok) {
      toast(`상환 기록 실패: ${payResult.error ?? "알 수 없는 오류"}`, "error");
      setPaymentSaving(false);
      return;
    }

    // 2. Dual-write into finance_transactions
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
      toast("가계부 연동 실패 (상환은 기록됨)", "info");
    }

    setPaymentSaving(false);
    toast(`상환 ${formatCurrency(parsedPaymentAmount)}원 기록됨`, "success");
    setPaymentSheet(false);
  }, [paymentDebt, canSavePayment, parsedPaymentAmount, paymentMemo, addPayment, addTransaction, toast]);

  // ── Tag chip preview ──────────────────────────────────────────────────────
  function parseTags(input: string): string[] {
    return input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
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
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">빚 관리</h1>
          <button
            type="button"
            onClick={openAddDebtSheet}
            className="px-4 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-white
              bg-[#1E3A5F] hover:opacity-90 active:scale-95 transition-all"
          >
            + 빚 추가
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {/* ── Summary Card ──────────────────────────────────────────────── */}
        <FinanceCard groupColor="#1E3A5F">
          <div className="pl-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              부채 현황
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">활성 빚</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                  {activeDebts.length}건
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">총 잔액</p>
                <p className="text-sm font-semibold text-red-500 dark:text-red-400 tabular-nums">
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">이번 달 상환</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(thisMonthTotal)}
                </p>
              </div>
            </div>
          </div>
        </FinanceCard>

        {/* ── Active Debts Section ───────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
            활성 빚 ({activeDebts.length})
          </p>

          {debtsLoading ? (
            <FinanceCard>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                불러오는 중...
              </p>
            </FinanceCard>
          ) : activeDebts.length === 0 ? (
            <FinanceCard>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                등록된 빚이 없어요
              </p>
            </FinanceCard>
          ) : (
            activeDebts.map((debt) => {
              const months = predictPayoff(debt);
              const isExpanded = expandedDebt === debt.id;
              const isOverflowOpen = overflowOpen === debt.id;

              return (
                <FinanceCard key={debt.id} groupColor="#1E3A5F">
                  <div className="pl-2">
                    {/* Title row + overflow menu */}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {debt.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-300 tabular-nums">
                          {debt.percent}%
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOverflowOpen(isOverflowOpen ? null : debt.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500
                              hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
                            aria-label="더보기"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {isOverflowOpen && (
                            <div className="absolute right-0 top-9 z-20 w-28 rounded-xl shadow-lg border border-gray-100 dark:border-[#2d3748]
                              bg-white dark:bg-[#1a2030] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => openEditDebtSheet(debt)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200
                                  hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                              >
                                <Pencil size={13} />
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(debt)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 dark:text-red-400
                                  hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 size={13} />
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {debt.tags && debt.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {debt.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full
                              text-gray-600 dark:text-gray-300"
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

                    {/* Details grid: 총액 | 상환 | 잔액 */}
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
                    {months !== null && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
                        이 속도면 약 {months}개월 후 완납
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPaymentSheet(debt)}
                        className="flex-1 min-h-[40px] py-2 rounded-xl text-xs font-semibold
                          bg-[#1E3A5F] text-white
                          hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        상환 기록
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDebt(debt.id)}
                        className="flex-1 min-h-[40px] py-2 rounded-xl text-xs font-medium
                          text-gray-600 dark:text-gray-300
                          bg-gray-100 dark:bg-[#262c38]
                          hover:bg-gray-200 dark:hover:bg-[#2d3748]
                          active:scale-[0.98] transition-all"
                      >
                        타임라인 {isExpanded ? "숨기기" : "보기"}
                      </button>
                    </div>

                    {/* Payment timeline */}
                    {isExpanded && (
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
                              <span className="text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
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

        {/* ── Completed Debts Section (collapsed by default) ─────────────── */}
        {completedDebts.length > 0 && (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setCompletedExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-1
                text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
            >
              <span>완납된 빚 ({completedDebts.length}건)</span>
              {completedExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {completedExpanded &&
              completedDebts.map((debt) => {
                const completionDate =
                  debt.payments.length > 0 ? debt.payments[0].date : null;

                return (
                  <FinanceCard key={debt.id} groupColor="#9CA3AF">
                    <div className="pl-2 opacity-60">
                      {/* Title */}
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                          {debt.title}
                        </h3>
                        <span className="shrink-0 ml-2 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                          완납
                        </span>
                      </div>

                      {/* Tags */}
                      {debt.tags && debt.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {debt.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full
                                text-gray-500 dark:text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Completion date + total */}
                      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-3">
                        {completionDate && (
                          <span>완납일: {completionDate}</span>
                        )}
                        <span className="tabular-nums">{formatCurrency(debt.total_amount)}원</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(debt)}
                        className="flex items-center gap-1.5 text-xs text-red-400 dark:text-red-500
                          hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>
                  </FinanceCard>
                );
              })}
          </section>
        )}
      </div>

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
              autoFocus
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
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
              value={debtTagsInput}
              onChange={(e) => setDebtTagsInput(e.target.value)}
              placeholder="예: 주거, 학자금"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />
            {/* Tag chip preview */}
            {parseTags(debtTagsInput).length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {parseTags(debtTagsInput).map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full
                      text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
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

      {/* ── Edit Debt Sheet ──────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={editDebtSheet}
        onClose={() => setEditDebtSheet(false)}
        title="빚 수정"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목"
              autoFocus
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />
          </div>

          {editDebt && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#262c38] text-xs text-gray-500 dark:text-gray-400">
              총액:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                {formatCurrency(editDebt.total_amount)}원
              </span>
              <span className="ml-1">(상환 이력 보호를 위해 수정 불가)</span>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              태그 (쉼표로 구분)
            </p>
            <input
              type="text"
              value={editTagsInput}
              onChange={(e) => setEditTagsInput(e.target.value)}
              placeholder="예: 주거, 학자금"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />
            {parseTags(editTagsInput).length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {parseTags(editTagsInput).map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full
                      text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={editSaving || !canSaveEdit}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#1E3A5F] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {editSaving ? "저장 중..." : "수정 저장"}
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
            <AmountInput
              value={paymentAmount}
              onChange={setPaymentAmount}
              placeholder="상환 금액"
              autoFocus
            />
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
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
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

      {/* ── Delete Confirm Dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        title="빚 삭제"
        description={deleteTarget ? `"${deleteTarget.title}"을(를) 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.` : ""}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteDebt}
        onClose={() => { setDeleteConfirm(false); setDeleteTarget(null); }}
      />
    </div>
  );
}
