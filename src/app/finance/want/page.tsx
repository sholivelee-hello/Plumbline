"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronUp, ChevronDown, MoreVertical } from "lucide-react";

import { useWishlist } from "@/lib/hooks/use-wishlist";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from "@/lib/finance-utils";
import { getItemKey } from "@/lib/finance-config";
import type { FinanceTransaction, FinanceWishlist } from "@/types/database";

import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { MonthPicker } from "@/components/finance/month-picker";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { Fab } from "@/components/finance/fab";
import { AmountInput } from "@/components/finance/amount-input";
import { TransactionRow } from "@/components/finance/transaction-row";
import { GroupPageSkeleton } from "@/components/finance/finance-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

// ── Constants ─────────────────────────────────────────────────────────────────
const WANT_COLOR = "#EA580C"; // sunset orange

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WantPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { toast } = useToast();

  const { wishes, loading: wishesLoading, addWish, updateWish, updateSaved, reorderWishes, completeWish, deleteWish } =
    useWishlist();
  const { groups, loading: settingsLoading } = useBudgetSettings();
  const { transactions, byGroup, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } =
    useFinanceTransactions(month);
  const { budgets, loading: budgetLoading } = useBudget(month);

  const loading = settingsLoading || txLoading || budgetLoading;

  const wantGroup = groups.find((g) => g.id === "want");

  // ── Computed: group summary ──────────────────────────────────────────────────
  const totalBudget = wantGroup?.items.reduce((sum, item) => {
    return sum + (budgets[getItemKey("want", item.id)] ?? 0);
  }, 0) ?? 0;

  const totalActual = byGroup["want"]?.total ?? 0;
  const remaining = totalBudget - totalActual;

  // Want transactions this month
  const wantTransactions = transactions.filter(
    (t) => t.type === "expense" && t.group_id === "want"
  );

  // ── Add Wish Sheet ──────────────────────────────────────────────────────────
  const [addWishSheet, setAddWishSheet] = useState(false);
  const [wishTitle, setWishTitle] = useState("");
  const [wishAmount, setWishAmount] = useState("");
  const [wishSaving, setWishSaving] = useState(false);

  const parsedWishAmount = parseCurrencyInput(wishAmount);
  const canSaveWish = wishTitle.trim().length > 0 && parsedWishAmount > 0;

  function openAddWishSheet() {
    setWishTitle("");
    setWishAmount("");
    setAddWishSheet(true);
  }

  const handleAddWish = useCallback(async () => {
    if (!canSaveWish) return;
    setWishSaving(true);
    const result = await addWish(wishTitle.trim(), parsedWishAmount);
    setWishSaving(false);
    if (result.ok) {
      toast("위시 추가됨", "success");
      setAddWishSheet(false);
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [canSaveWish, wishTitle, parsedWishAmount, addWish, toast]);

  // ── Edit Wish Sheet ─────────────────────────────────────────────────────────
  const [editWishSheet, setEditWishSheet] = useState(false);
  const [editWish, setEditWish] = useState<FinanceWishlist | null>(null);
  const [editWishTitle, setEditWishTitle] = useState("");
  const [editWishAmount, setEditWishAmount] = useState("");
  const [editWishSaving, setEditWishSaving] = useState(false);

  function openEditWishSheet(wish: FinanceWishlist) {
    setEditWish(wish);
    setEditWishTitle(wish.title);
    setEditWishAmount(formatCurrency(wish.target_amount));
    setEditWishSheet(true);
  }

  const parsedEditWishAmount = parseCurrencyInput(editWishAmount);

  const handleSaveEditWish = useCallback(async () => {
    if (!editWish || parsedEditWishAmount <= 0) return;
    setEditWishSaving(true);
    const result = await updateWish(editWish.id, {
      title: editWishTitle.trim(),
      target_amount: parsedEditWishAmount,
    });
    setEditWishSaving(false);
    if (result.ok) {
      toast("수정되었습니다", "success");
      setEditWishSheet(false);
    } else {
      toast(result.error ?? "수정에 실패했습니다", "error");
    }
  }, [editWish, parsedEditWishAmount, editWishTitle, updateWish, toast]);

  // ── Save Sheet (저축하기) ──────────────────────────────────────────────────
  const [saveSheet, setSaveSheet] = useState(false);
  const [saveWish, setSaveWish] = useState<FinanceWishlist | null>(null);
  const [saveAmount, setSaveAmount] = useState("");
  const [savingSave, setSavingSave] = useState(false);

  function openSaveSheet(wish: FinanceWishlist) {
    setSaveWish(wish);
    setSaveAmount("");
    setSaveSheet(true);
  }

  const parsedSaveAmount = parseCurrencyInput(saveAmount);
  const canSave = parsedSaveAmount > 0;

  const handleSaveSaved = useCallback(async () => {
    if (!saveWish || !canSave) return;
    setSavingSave(true);
    const result = await updateSaved(saveWish.id, parsedSaveAmount);
    setSavingSave(false);
    if (result.ok) {
      toast(`${formatCurrency(parsedSaveAmount)}원 저축됨`, "success");
      setSaveSheet(false);
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [saveWish, canSave, parsedSaveAmount, updateSaved, toast]);

  // ── Complete Wish Dialog ───────────────────────────────────────────────────
  const [completeDialog, setCompleteDialog] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<FinanceWishlist | null>(null);
  const [completingWish, setCompletingWish] = useState(false);

  function openCompleteDialog(wish: FinanceWishlist) {
    setCompleteTarget(wish);
    setCompleteDialog(true);
  }

  const handleCompleteWish = useCallback(async () => {
    if (!completeTarget) return;
    setCompletingWish(true);
    const result = await completeWish(completeTarget.id);
    setCompletingWish(false);
    if (result.ok) {
      toast("구매 완료로 표시됨", "success");
      setCompleteDialog(false);
    } else {
      toast(result.error ?? "처리에 실패했습니다", "error");
    }
  }, [completeTarget, completeWish, toast]);

  // ── Delete Wish Dialog ─────────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceWishlist | null>(null);
  const [deletingWish, setDeletingWish] = useState(false);

  function openDeleteDialog(wish: FinanceWishlist) {
    setDeleteTarget(wish);
    setDeleteDialog(true);
  }

  const handleDeleteWish = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingWish(true);
    const result = await deleteWish(deleteTarget.id);
    setDeletingWish(false);
    if (result.ok) {
      toast("삭제됨", "success");
      setDeleteDialog(false);
    } else {
      toast(result.error ?? "삭제에 실패했습니다", "error");
    }
  }, [deleteTarget, deleteWish, toast]);

  // ── Wish menu ──────────────────────────────────────────────────────────────
  const [menuWishId, setMenuWishId] = useState<string | null>(null);

  function toggleMenu(id: string) {
    setMenuWishId((prev) => (prev === id ? null : id));
  }

  // ── Reorder (up/down arrows) ───────────────────────────────────────────────
  function moveWish(id: string, delta: number) {
    const idx = wishes.findIndex((w) => w.id === id);
    const target = idx + delta;
    if (target < 0 || target >= wishes.length) return;
    const newOrder = [...wishes];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    reorderWishes(newOrder.map((w) => w.id));
  }

  // ── Expense Sheet (FAB / "+ 지출 기록") ──────────────────────────────────
  const [expenseSheet, setExpenseSheet] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);

  function openExpenseSheet() {
    setExpenseAmount("");
    setExpenseDate(new Date().toLocaleDateString("sv-SE"));
    setExpenseDesc("");
    setExpenseSheet(true);
  }

  const parsedExpenseAmount = parseCurrencyInput(expenseAmount);
  const canSaveExpense = parsedExpenseAmount > 0;

  const handleSaveExpense = useCallback(async () => {
    if (!canSaveExpense) return;
    setExpenseSaving(true);
    const result = await addTransaction({
      type: "expense",
      amount: parsedExpenseAmount,
      description: expenseDesc.trim() || "요망 지출",
      date: expenseDate,
      group_id: "want",
    });
    setExpenseSaving(false);
    if (result.ok) {
      toast(`지출 ${formatCurrency(parsedExpenseAmount)}원 저장됨`, "success");
      setExpenseSheet(false);
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [canSaveExpense, parsedExpenseAmount, expenseDesc, expenseDate, addTransaction, toast]);

  // ── Edit transaction sheet ─────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">요망사항</h1>
          <MonthPicker month={month} onChange={setMonth} maxMonth={getCurrentMonth()} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading && wishesLoading ? (
          <GroupPageSkeleton />
        ) : (
          <>
            {/* ── Group Summary Card ────────────────────────────────────────── */}
            <FinanceCard groupColor={WANT_COLOR}>
              <div className="pl-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  이번 달 요망사항
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
                          ? "text-[#EA580C] dark:text-orange-300"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {formatCurrency(remaining, { sign: remaining < 0 })}
                    </p>
                  </div>
                </div>
                <FinanceProgressBar value={totalActual} max={totalBudget} color={WANT_COLOR} height="md" />
              </div>
            </FinanceCard>

            {/* ── Wishlist Section ──────────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  위시리스트
                </p>
                <button
                  type="button"
                  onClick={openAddWishSheet}
                  className="text-xs font-medium text-[#EA580C] dark:text-orange-300 px-3 py-1.5 rounded-full
                    bg-[#EA580C]/8 dark:bg-[#EA580C]/20 hover:bg-[#EA580C]/12 dark:hover:bg-[#EA580C]/30
                    transition-colors active:scale-95"
                >
                  + 위시 추가
                </button>
              </div>

              {wishesLoading ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    불러오는 중...
                  </p>
                </FinanceCard>
              ) : wishes.length === 0 ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    위시리스트가 비어 있어요
                  </p>
                  <div className="flex justify-center mt-2">
                    <button
                      type="button"
                      onClick={openAddWishSheet}
                      className="text-xs font-medium text-[#EA580C] dark:text-orange-300 px-4 py-2 rounded-full
                        bg-[#EA580C]/8 dark:bg-[#EA580C]/20 hover:bg-[#EA580C]/12 dark:hover:bg-[#EA580C]/30
                        transition-colors active:scale-95"
                    >
                      첫 번째 위시 추가
                    </button>
                  </div>
                </FinanceCard>
              ) : (
                wishes.map((wish, index) => {
                  const percent = wish.target_amount > 0
                    ? Math.round((wish.saved_amount / wish.target_amount) * 100)
                    : 0;
                  const isMenuOpen = menuWishId === wish.id;

                  return (
                    <FinanceCard key={wish.id} groupColor={WANT_COLOR}>
                      <div className="pl-2">
                        {/* Top row: priority badge + title + menu */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Priority badge */}
                            <span
                              className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full
                                text-[10px] font-bold text-white"
                              style={{ backgroundColor: WANT_COLOR }}
                            >
                              {wish.priority}
                            </span>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                              {wish.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {/* Up/Down reorder */}
                            <button
                              type="button"
                              onClick={() => moveWish(wish.id, -1)}
                              disabled={index === 0}
                              className="p-1 rounded-lg text-gray-400 dark:text-gray-500
                                hover:bg-gray-100 dark:hover:bg-[#262c38]
                                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="위로 이동"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveWish(wish.id, 1)}
                              disabled={index === wishes.length - 1}
                              className="p-1 rounded-lg text-gray-400 dark:text-gray-500
                                hover:bg-gray-100 dark:hover:bg-[#262c38]
                                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="아래로 이동"
                            >
                              <ChevronDown size={14} />
                            </button>

                            {/* Menu toggle */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => toggleMenu(wish.id)}
                                className="p-1 rounded-lg text-gray-400 dark:text-gray-500
                                  hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
                                aria-label="메뉴"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {isMenuOpen && (
                                <>
                                  {/* Backdrop to close menu */}
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setMenuWishId(null)}
                                  />
                                  <div className="absolute right-0 top-7 z-20 bg-white dark:bg-[#1a2030]
                                    border border-gray-100 dark:border-[#2d3748] rounded-xl shadow-lg
                                    overflow-hidden min-w-[120px]">
                                    <button
                                      type="button"
                                      onClick={() => { setMenuWishId(null); openEditWishSheet(wish); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-medium
                                        text-gray-700 dark:text-gray-300
                                        hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                                    >
                                      수정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setMenuWishId(null); openCompleteDialog(wish); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-medium
                                        text-[#EA580C] dark:text-orange-300
                                        hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                                    >
                                      구매 완료
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setMenuWishId(null); openDeleteDialog(wish); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-medium
                                        text-red-500 dark:text-red-400
                                        hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Target amount */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">목표</span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                            {formatCurrency(wish.target_amount)}원
                          </span>
                        </div>

                        {/* Saved amount + progress bar */}
                        <div className="mb-1.5">
                          <FinanceProgressBar
                            value={wish.saved_amount}
                            max={wish.target_amount}
                            color={WANT_COLOR}
                            height="md"
                          />
                        </div>

                        {/* Saved info row */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {percent}% 저축됨
                          </span>
                          <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                            {formatCurrency(wish.saved_amount)}
                            <span className="text-gray-300 dark:text-gray-600">
                              {" / "}{formatCurrency(wish.target_amount)}
                            </span>
                          </span>
                        </div>

                        {/* 저축하기 button */}
                        <button
                          type="button"
                          onClick={() => openSaveSheet(wish)}
                          className="w-full min-h-[40px] py-2 rounded-xl text-xs font-medium
                            text-[#EA580C] dark:text-orange-300 bg-[#EA580C]/8 dark:bg-[#EA580C]/20
                            hover:bg-[#EA580C]/12 dark:hover:bg-[#EA580C]/30
                            transition-colors active:scale-[0.98]"
                        >
                          저축하기
                        </button>
                      </div>
                    </FinanceCard>
                  );
                })
              )}
            </section>

            {/* ── Divider ──────────────────────────────────────────────────── */}
            <div className="border-t border-gray-200 dark:border-[#2d3748]" />

            {/* ── Want Transactions Section ─────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                이번 달 요망 지출
              </p>

              {loading ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    불러오는 중...
                  </p>
                </FinanceCard>
              ) : wantTransactions.length === 0 ? (
                <FinanceCard>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    아직 지출 기록 없음
                  </p>
                </FinanceCard>
              ) : (
                <FinanceCard>
                  <div className="space-y-1.5">
                    {wantTransactions.map((tx) => (
                      <TransactionRow
                        key={tx.id}
                        transaction={tx}
                        groups={groups}
                        onEdit={openEditSheet}
                        onDelete={handleDeleteTx}
                      />
                    ))}
                  </div>
                </FinanceCard>
              )}
            </section>
          </>
        )}
      </div>

      {/* FAB */}
      <Fab onClick={openExpenseSheet} label="지출 기록" />

      {/* ── Add Wish Sheet ──────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={addWishSheet}
        onClose={() => setAddWishSheet(false)}
        title="위시 추가"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
            <input
              type="text"
              value={wishTitle}
              onChange={(e) => setWishTitle(e.target.value)}
              placeholder="예: 무선 이어폰"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddWish(); }}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">목표 금액 (원)</p>
            <AmountInput value={wishAmount} onChange={setWishAmount} placeholder="목표 금액" />
          </div>
          <button
            type="button"
            onClick={handleAddWish}
            disabled={wishSaving || !canSaveWish}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#EA580C] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {wishSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit Wish Sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={editWishSheet}
        onClose={() => setEditWishSheet(false)}
        title="위시 수정"
      >
        {editWish && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">제목</p>
              <input
                type="text"
                value={editWishTitle}
                onChange={(e) => setEditWishTitle(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                  bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">목표 금액 (원)</p>
              <AmountInput value={editWishAmount} onChange={setEditWishAmount} placeholder="목표 금액" autoFocus />
            </div>
            <button
              type="button"
              onClick={handleSaveEditWish}
              disabled={editWishSaving || parsedEditWishAmount <= 0}
              className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
                bg-[#EA580C] hover:opacity-90
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-opacity active:scale-[0.98]"
            >
              {editWishSaving ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── Save Sheet (저축하기) ───────────────────────────────────────────── */}
      <BottomSheet
        isOpen={saveSheet}
        onClose={() => setSaveSheet(false)}
        title={saveWish ? `${saveWish.title} 저축` : "저축하기"}
      >
        {saveWish && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#262c38] text-xs text-gray-500 dark:text-gray-400">
              남은 금액:{" "}
              <span className="font-semibold text-[#EA580C] dark:text-orange-300 tabular-nums">
                {formatCurrency(saveWish.target_amount - saveWish.saved_amount)}원
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">저축 금액 (원)</p>
              <AmountInput value={saveAmount} onChange={setSaveAmount} placeholder="저축 금액" autoFocus />
            </div>
            <button
              type="button"
              onClick={handleSaveSaved}
              disabled={savingSave || !canSave}
              className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
                bg-[#EA580C] hover:opacity-90
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-opacity active:scale-[0.98]"
            >
              {savingSave ? "저장 중..." : "저축 기록"}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── Expense Sheet ───────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={expenseSheet}
        onClose={() => setExpenseSheet(false)}
        title="요망 지출 입력"
      >
        <div className="space-y-5">
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
                focus:outline-none focus:ring-2 focus:ring-orange-400/40"
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
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveExpense(); }}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={expenseSaving || !canSaveExpense}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-[#EA580C] hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {expenseSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit Transaction Sheet ──────────────────────────────────────────── */}
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
                  focus:outline-none focus:ring-2 focus:ring-orange-400/40"
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
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
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

      {/* ── Complete Wish Dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={completeDialog}
        onClose={() => setCompleteDialog(false)}
        onConfirm={handleCompleteWish}
        title="구매 완료로 표시하시겠어요?"
        description={completeTarget ? `"${completeTarget.title}"을(를) 구매 완료 처리합니다. 위시리스트에서 제거됩니다.` : undefined}
        confirmLabel="완료 처리"
        loading={completingWish}
      />

      {/* ── Delete Wish Dialog ──────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteWish}
        title="위시를 삭제하시겠어요?"
        description={deleteTarget ? `"${deleteTarget.title}"이(가) 영구 삭제됩니다.` : undefined}
        confirmLabel="삭제"
        variant="danger"
        loading={deletingWish}
      />
    </div>
  );
}
