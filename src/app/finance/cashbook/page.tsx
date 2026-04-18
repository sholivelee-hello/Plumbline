"use client";

import { useState, useCallback, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudget } from "@/lib/hooks/use-budget";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { addWishContribution } from "@/lib/finance-actions";
import {
  getCurrentMonth,
  formatCurrency,
  parseCurrencyInput,
  getLastDayOfMonth,
} from "@/lib/finance-utils";
import { getItemKey } from "@/lib/finance-config";
import { formatDateKR } from "@/lib/utils/date";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { MonthPicker } from "@/components/finance/month-picker";
import { Fab } from "@/components/finance/fab";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { TransactionRow } from "@/components/finance/transaction-row";
import { AmountInput } from "@/components/finance/amount-input";
import { CashbookSkeleton } from "@/components/finance/finance-skeleton";
import type { FinanceTransaction } from "@/types/database";

// ── Style maps ────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(txs: FinanceTransaction[]): [string, FinanceTransaction[]][] {
  const map: Record<string, FinanceTransaction[]> = {};
  for (const tx of txs) {
    if (!map[tx.date]) map[tx.date] = [];
    map[tx.date].push(tx);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CashbookPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const { toast } = useToast();

  // Data hooks
  const {
    transactions,
    totalIncome,
    totalExpense,
    byGroup,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinanceTransactions(month);

  const { groupTotals, grandTotal: budgetTotal } = useBudget(month);
  const { groups, incomeCategories } = useBudgetSettings();
  const { wishes, addWish } = useWishlist();

  const balance = totalIncome - totalExpense;

  // ── Delete state ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTransaction(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast(`'${deleteTarget.desc}' 삭제됨`, "success");
    } else {
      toast(result.error || "삭제에 실패했습니다", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteTransaction, toast]);

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<FinanceTransaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(tx: FinanceTransaction) {
    setEditTarget(tx);
    setEditAmount(tx.amount > 0 ? formatCurrency(tx.amount) : "");
    setEditDesc(tx.description || "");
    setEditGroupId(tx.group_id ?? null);
    setEditItemId(tx.item_id ?? null);
  }

  const handleEditSave = useCallback(async () => {
    if (!editTarget) return;
    const amount = parseCurrencyInput(editAmount);
    if (!editDesc.trim() || amount <= 0) return;
    setSaving(true);
    const result = await updateTransaction(editTarget.id, {
      description: editDesc.trim(),
      amount,
      group_id: editTarget.type === "expense" ? (editGroupId ?? null) : null,
      item_id: editTarget.type === "expense" ? (editItemId ?? null) : null,
    });
    setSaving(false);
    if (result.ok) {
      toast("수정됨", "success");
      setEditTarget(null);
    } else {
      toast(result.error || "수정에 실패했습니다", "error");
    }
  }, [editTarget, editAmount, editDesc, editGroupId, editItemId, updateTransaction, toast]);

  // ── Add transaction state (FAB) ──────────────────────────────────────────
  const [inputOpen, setInputOpen] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedWishId, setSelectedWishId] = useState<string | null>(null);
  const [newWishOpen, setNewWishOpen] = useState(false);
  const [newWishTitle, setNewWishTitle] = useState("");
  const [newWishTarget, setNewWishTarget] = useState("");
  const [creatingWish, setCreatingWish] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [description, setDescription] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  function resetInput() {
    setIsIncome(false);
    setSelectedGroupId(null);
    setSelectedItemId(null);
    setSelectedWishId(null);
    setNewWishOpen(false);
    setNewWishTitle("");
    setNewWishTarget("");
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
    : parsedAmount > 0 &&
      selectedGroupId !== null &&
      (selectedGroupId !== "want" || selectedWishId !== null);

  const handleAddSave = useCallback(async () => {
    if (!canSave || parsedAmount <= 0) return;
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    const selectedItem = selectedGroup?.items.find((i) => i.id === selectedItemId);
    const selectedWish = wishes.find((w) => w.id === selectedWishId);
    const isWantWithWish =
      selectedGroupId === "want" && selectedWishId !== null && selectedWish !== undefined;

    setAddSaving(true);
    const result = isWantWithWish
      ? await addWishContribution({
          wishId: selectedWish.id,
          amount: parsedAmount,
          date,
          description: description.trim() || selectedWish.title,
        })
      : await addTransaction(
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
                wishlist_id: null,
              }
        );
    setAddSaving(false);
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
    selectedWishId,
    groups,
    wishes,
    addTransaction,
    toast,
  ]);

  const handleCreateWish = useCallback(async () => {
    const title = newWishTitle.trim();
    const target = parseCurrencyInput(newWishTarget);
    if (!title || target <= 0) return;
    setCreatingWish(true);
    const result = await addWish(title, target);
    setCreatingWish(false);
    if (result.ok && result.id) {
      setSelectedWishId(result.id);
      setNewWishOpen(false);
      setNewWishTitle("");
      setNewWishTarget("");
      toast(`'${title}' 요망사항이 생성됐습니다`, "success");
    } else {
      toast(result.error ?? "요망사항 생성에 실패했습니다", "error");
    }
  }, [newWishTitle, newWishTarget, addWish, toast]);

  // ── Monthly tab data ─────────────────────────────────────────────────────

  // Group spending summary
  const groupSummary = useMemo(
    () =>
      groups.map((g) => {
        const actual = byGroup[g.id]?.total ?? 0;
        const budget = groupTotals[g.id] ?? 0;
        const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
        return { id: g.id, title: g.title, color: g.color, actual, budget, pct };
      }),
    [groups, byGroup, groupTotals]
  );

  const totalActual = useMemo(
    () => groupSummary.reduce((s, g) => s + g.actual, 0),
    [groupSummary]
  );
  const totalBudget = useMemo(
    () => groupSummary.reduce((s, g) => s + g.budget, 0),
    [groupSummary]
  );

  // Date x group matrix
  const lastDay = getLastDayOfMonth(month);
  const [showAllDays, setShowAllDays] = useState(false);

  const matrixData = useMemo(() => {
    // Build: date -> groupId -> amount
    const map: Record<string, Record<string, number>> = {};
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      if (!map[tx.date]) map[tx.date] = {};
      const gid = tx.group_id ?? "__none__";
      map[tx.date][gid] = (map[tx.date][gid] ?? 0) + tx.amount;
    }
    return map;
  }, [transactions]);

  const activeDays = useMemo(() => {
    const days = new Set(Object.keys(matrixData));
    return days;
  }, [matrixData]);

  // Days to render in matrix
  const matrixDays = useMemo(() => {
    const all: number[] = [];
    for (let d = 1; d <= lastDay; d++) all.push(d);
    if (showAllDays) return all;
    return all.filter((d) => {
      const key = `${month}-${String(d).padStart(2, "0")}`;
      return activeDays.has(key);
    });
  }, [lastDay, month, showAllDays, activeDays]);

  // Expanded matrix row state
  const [expandedCell, setExpandedCell] = useState<{ date: string; groupId: string } | null>(null);

  function toggleCell(date: string, groupId: string) {
    if (expandedCell?.date === date && expandedCell?.groupId === groupId) {
      setExpandedCell(null);
    } else {
      setExpandedCell({ date, groupId });
    }
  }

  const expandedTxs = useMemo(() => {
    if (!expandedCell) return [];
    return transactions.filter(
      (tx) =>
        tx.type === "expense" &&
        tx.date === expandedCell.date &&
        (tx.group_id ?? "__none__") === expandedCell.groupId
    );
  }, [expandedCell, transactions]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="출납부" backHref="/finance" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {/* Month Picker */}
        <MonthPicker month={month} onChange={setMonth} maxMonth={getCurrentMonth()} />

        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#262c38]">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
              activeTab === "daily"
                ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            일일 출납부
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
              activeTab === "monthly"
                ? "bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            월별 출납부
          </button>
        </div>

        {loading ? (
          <CashbookSkeleton />
        ) : activeTab === "daily" ? (
          // ── Tab 1: 일일 출납부 ────────────────────────────────────────────
          <DailyTab
            transactions={transactions}
            groups={groups}
            onEdit={openEdit}
            onDelete={(id, desc) => setDeleteTarget({ id, desc })}
          />
        ) : (
          // ── Tab 2: 월별 출납부 ────────────────────────────────────────────
          <MonthlyTab
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            groupSummary={groupSummary}
            totalActual={totalActual}
            totalBudget={totalBudget}
            budgetTotal={budgetTotal}
            month={month}
            matrixData={matrixData}
            matrixDays={matrixDays}
            groups={groups}
            lastDay={lastDay}
            showAllDays={showAllDays}
            onToggleShowAll={() => setShowAllDays((v) => !v)}
            expandedCell={expandedCell}
            expandedTxs={expandedTxs}
            onToggleCell={toggleCell}
            onEditTx={openEdit}
            onDeleteTx={(id, desc) => setDeleteTarget({ id, desc })}
          />
        )}
      </div>

      {/* FAB */}
      <Fab onClick={openInput} label="거래 추가" />

      {/* Add transaction BottomSheet */}
      <BottomSheet isOpen={inputOpen} onClose={() => setInputOpen(false)} title="거래 입력">
        <div className="space-y-5">
          {/* Income / Expense toggle */}
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
              onClick={() => { setIsIncome(true); setSelectedGroupId(null); setSelectedItemId(null); setSelectedWishId(null); setNewWishOpen(false); }}
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
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">수입 분류</p>
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
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">그룹 선택</p>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const style = GROUP_CHIP_STYLES[g.id] ?? GROUP_CHIP_STYLES.want;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setSelectedGroupId(g.id); setSelectedItemId(null); setSelectedWishId(null); setNewWishOpen(false); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                          selectedGroupId === g.id ? style.active : style.base
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        {g.title}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedGroupId && selectedGroupId !== "want" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">항목 선택</p>
                  <div className="flex flex-wrap gap-2">
                    {groups
                      .find((g) => g.id === selectedGroupId)
                      ?.items.map((item) => {
                        const style = GROUP_CHIP_STYLES[selectedGroupId] ?? GROUP_CHIP_STYLES.want;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 ${
                              selectedItemId === item.id ? style.active : style.base
                            }`}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {selectedGroupId === "want" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">요망사항 선택</p>
                  <div className="space-y-1.5">
                    {wishes.map((w) => {
                      const isSelected = selectedWishId === w.id;
                      const pct = w.target_amount > 0
                        ? Math.min(100, Math.round((w.cumulative_saved / w.target_amount) * 100))
                        : 0;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedWishId(w.id)}
                          className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-all active:scale-[0.98] ${
                            isSelected
                              ? "border-[#EA580C] bg-[#EA580C]/5 dark:bg-[#EA580C]/15"
                              : "border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {w.title}
                            </span>
                            <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                              {formatCurrency(w.cumulative_saved)} / {formatCurrency(w.target_amount)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-[#262c38] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#EA580C] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}

                    {!newWishOpen ? (
                      <button
                        type="button"
                        onClick={() => setNewWishOpen(true)}
                        className="w-full min-h-[44px] rounded-xl border border-dashed border-[#EA580C]/50 text-xs font-medium text-[#EA580C] hover:bg-[#EA580C]/5 transition-colors"
                      >
                        + 새 요망사항 만들기
                      </button>
                    ) : (
                      <div className="rounded-xl border border-[#EA580C]/50 bg-[#EA580C]/5 dark:bg-[#EA580C]/10 p-3 space-y-2">
                        <input
                          type="text"
                          value={newWishTitle}
                          onChange={(e) => setNewWishTitle(e.target.value)}
                          placeholder="요망사항 제목"
                          autoFocus
                          className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/40"
                        />
                        <AmountInput value={newWishTarget} onChange={setNewWishTarget} placeholder="목표 금액" />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setNewWishOpen(false); setNewWishTitle(""); setNewWishTarget(""); }}
                            className="flex-1 min-h-[40px] py-2 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 dark:bg-[#262c38]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateWish}
                            disabled={creatingWish || !newWishTitle.trim() || parseCurrencyInput(newWishTarget) <= 0}
                            className="flex-1 min-h-[40px] py-2 rounded-lg text-xs font-semibold text-white bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {creatingWish ? "생성 중..." : "생성"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">금액 (원)</p>
            <AmountInput value={amount} onChange={setAmount} placeholder="금액" autoFocus />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">메모 (선택)</p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="내역 설명"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSave(); }}
            />
          </div>

          <button
            type="button"
            onClick={handleAddSave}
            disabled={addSaving || !canSave}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {addSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </BottomSheet>

      {/* Edit BottomSheet */}
      <BottomSheet
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="기록 수정"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">내역</p>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="내역을 입력하세요"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">금액 (원)</p>
            <AmountInput value={editAmount} onChange={setEditAmount} placeholder="0" />
          </div>
          {editTarget?.type === "expense" && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">그룹</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setEditGroupId(null); setEditItemId(null); }}
                  className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
                    editGroupId === null
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  분류 없음
                </button>
                {groups.map((g) => {
                  const style = GROUP_CHIP_STYLES[g.id] ?? GROUP_CHIP_STYLES.want;
                  return (
                    <div key={g.id} className="space-y-1">
                      <span className="text-[10px] font-medium text-gray-400">{g.title}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((item) => {
                          const key = getItemKey(g.id, item.id);
                          const isSelected = editGroupId === g.id && editItemId === item.id;
                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => { setEditGroupId(g.id); setEditItemId(item.id); }}
                              className={`px-3 py-1.5 min-h-[44px] rounded-full text-[11px] font-medium transition-all flex items-center active:scale-95 ${
                                isSelected ? style.active : style.base
                              }`}
                            >
                              {item.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleEditSave}
            disabled={saving || !editDesc.trim() || parseCurrencyInput(editAmount) <= 0}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "수정"}
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="기록 삭제"
        description={deleteTarget ? `"${deleteTarget.desc}" 기록을 삭제하시겠습니까?` : ""}
        confirmLabel="삭제"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

// ── Tab 1: 일일 출납부 ────────────────────────────────────────────────────────

interface DailyTabProps {
  transactions: FinanceTransaction[];
  groups: ReturnType<typeof useBudgetSettings>["groups"];
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (id: string, desc: string) => void;
}

function DailyTab({ transactions, groups, onEdit, onDelete }: DailyTabProps) {
  const dateGroups = useMemo(() => groupByDate(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          className="text-gray-300 dark:text-gray-600"
        >
          <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="20" y1="8" x2="20" y2="56" stroke="currentColor" strokeWidth="1.5" />
          <line x1="26" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="26" y1="30" x2="40" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          <line x1="26" y1="38" x2="44" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
        </svg>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">이번 달 기록이 없어요</p>
        <p className="text-xs text-gray-300 dark:text-gray-600">FAB 버튼으로 거래를 추가하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dateGroups.map(([date, items]) => {
        const dayIncome = items.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
        const dayExpense = items.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

        return (
          <section key={date}>
            {/* Date header */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {formatDateKR(date)}
              </span>
              <div className="flex items-center gap-2 text-[11px] tabular-nums">
                {dayIncome > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    수입 {formatCurrency(dayIncome)}
                  </span>
                )}
                {dayIncome > 0 && dayExpense > 0 && (
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                )}
                {dayExpense > 0 && (
                  <span className="text-red-500 dark:text-red-400">
                    지출 {formatCurrency(dayExpense)}
                  </span>
                )}
              </div>
            </div>
            {/* Transaction rows */}
            <div className="space-y-1.5">
              {items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  groups={groups}
                  onEdit={onEdit}
                  onDelete={(id) => onDelete(id, tx.description || "")}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Tab 2: 월별 출납부 ───────────────────────────────────────────────────────

interface GroupSummaryItem {
  id: string;
  title: string;
  color: string;
  actual: number;
  budget: number;
  pct: number;
}

interface MonthlyTabProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  groupSummary: GroupSummaryItem[];
  totalActual: number;
  totalBudget: number;
  budgetTotal: number;
  month: string;
  matrixData: Record<string, Record<string, number>>;
  matrixDays: number[];
  groups: ReturnType<typeof useBudgetSettings>["groups"];
  lastDay: number;
  showAllDays: boolean;
  onToggleShowAll: () => void;
  expandedCell: { date: string; groupId: string } | null;
  expandedTxs: FinanceTransaction[];
  onToggleCell: (date: string, groupId: string) => void;
  onEditTx: (tx: FinanceTransaction) => void;
  onDeleteTx: (id: string, desc: string) => void;
}

function MonthlyTab({
  totalIncome,
  totalExpense,
  balance,
  groupSummary,
  totalActual,
  totalBudget,
  month,
  matrixData,
  matrixDays,
  groups,
  showAllDays,
  onToggleShowAll,
  expandedCell,
  expandedTxs,
  onToggleCell,
  onEditTx,
  onDeleteTx,
}: MonthlyTabProps) {
  return (
    <div className="space-y-5">
      {/* Section 1: Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <FinanceCard>
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp size={12} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">수입</span>
          </div>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatCurrency(totalIncome)}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5">원</span>
        </FinanceCard>

        <FinanceCard>
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingDown size={12} className="text-red-500 shrink-0" />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">지출</span>
          </div>
          <p className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums">
            -{formatCurrency(totalExpense)}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5">원</span>
        </FinanceCard>

        <FinanceCard>
          <div className="flex items-center gap-1 mb-1.5">
            <Wallet size={12} className="text-[#2563EB] dark:text-blue-300 shrink-0" />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">잔액</span>
          </div>
          <p
            className={`text-sm font-bold tabular-nums ${
              balance >= 0
                ? "text-[#2563EB] dark:text-blue-300"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {formatCurrency(balance, { sign: true })}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5">원</span>
        </FinanceCard>
      </div>

      {/* Section 2: Group Spending Table */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            그룹별 지출
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-[#262c38]">
          {groupSummary.map((g) => (
            <div key={g.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {g.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-gray-400 dark:text-gray-500">
                    {g.budget > 0 ? formatCurrency(g.budget) : "-"}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(g.actual)}
                  </span>
                  <span
                    className={`w-10 text-right font-medium ${
                      g.pct >= 100
                        ? "text-red-500"
                        : g.pct >= 80
                        ? "text-amber-500"
                        : "text-gray-400"
                    }`}
                  >
                    {g.budget > 0 ? `${g.pct}%` : "-"}
                  </span>
                </div>
              </div>
              {g.budget > 0 && (
                <FinanceProgressBar value={g.actual} max={g.budget} color={g.color} height="sm" />
              )}
            </div>
          ))}

          {/* Total row */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-[#1e2538]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">합계</span>
              <div className="flex items-center gap-3 text-xs tabular-nums">
                <span className="text-gray-400 dark:text-gray-500">
                  {totalBudget > 0 ? formatCurrency(totalBudget) : "-"}
                </span>
                <span className="text-sm font-bold text-red-500 dark:text-red-400">
                  {formatCurrency(totalActual)}
                </span>
                <span
                  className={`w-10 text-right text-xs font-semibold ${
                    totalBudget > 0 && totalActual / totalBudget >= 1
                      ? "text-red-500"
                      : totalBudget > 0 && totalActual / totalBudget >= 0.8
                      ? "text-amber-500"
                      : "text-gray-500"
                  }`}
                >
                  {totalBudget > 0
                    ? `${Math.round((totalActual / totalBudget) * 100)}%`
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Date x Group Matrix */}
      <div className="rounded-2xl bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            날짜별 지출
          </p>
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {showAllDays ? "거래 있는 날만" : "모든 날짜 보기"}
          </button>
        </div>

        {matrixDays.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">이번 달 지출 기록이 없어요</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[480px] w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e2538] border-b border-gray-100 dark:border-[#2d3748]">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-16 shrink-0">
                    날짜
                  </th>
                  {groups.map((g) => (
                    <th
                      key={g.id}
                      className="px-2 py-2.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: g.color }}
                    >
                      {g.title.length > 4 ? g.title.slice(0, 4) + "…" : g.title}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2d3748]">
                {matrixDays.map((day) => {
                  const dateStr = `${month}-${String(day).padStart(2, "0")}`;
                  const dayData = matrixData[dateStr] ?? {};
                  const dayTotal = Object.values(dayData).reduce((s, v) => s + v, 0);
                  const dateLabel = (() => {
                    const d = new Date(`${dateStr}T00:00:00`);
                    const days = ["일", "월", "화", "수", "목", "금", "토"];
                    return `${day}일(${days[d.getDay()]})`;
                  })();

                  return (
                    <>
                      <tr
                        key={dateStr}
                        className="hover:bg-gray-50 dark:hover:bg-[#1e2538] transition-colors"
                      >
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {dateLabel}
                        </td>
                        {groups.map((g) => {
                          const cellAmt = dayData[g.id] ?? 0;
                          const isExpanded =
                            expandedCell?.date === dateStr &&
                            expandedCell?.groupId === g.id;
                          return (
                            <td
                              key={g.id}
                              className="px-2 py-2 text-right tabular-nums"
                            >
                              {cellAmt > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => onToggleCell(dateStr, g.id)}
                                  className={`text-xs tabular-nums font-medium transition-colors underline-offset-2 ${
                                    isExpanded
                                      ? "text-indigo-600 dark:text-indigo-400 underline"
                                      : "text-gray-700 dark:text-gray-300 hover:text-indigo-500"
                                  }`}
                                >
                                  {formatCurrency(cellAmt)}
                                </button>
                              ) : (
                                <span className="text-gray-200 dark:text-gray-700">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                          {dayTotal > 0 ? formatCurrency(dayTotal) : (
                            <span className="text-gray-200 dark:text-gray-700">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedCell?.date === dateStr && expandedTxs.length > 0 && (
                        <tr key={`${dateStr}-expanded`} className="bg-indigo-50/50 dark:bg-indigo-900/10">
                          <td
                            colSpan={groups.length + 2}
                            className="px-3 py-2"
                          >
                            <div className="space-y-1">
                              {expandedTxs.map((tx) => (
                                <TransactionRow
                                  key={tx.id}
                                  transaction={tx}
                                  groups={groups}
                                  onEdit={onEditTx}
                                  onDelete={(id) => onDeleteTx(id, tx.description || "")}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}

                {/* Footer: column totals */}
                <tr className="bg-gray-50 dark:bg-[#1e2538] font-semibold border-t border-gray-200 dark:border-[#2d3748]">
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">합계</td>
                  {groups.map((g) => {
                    const total = Object.values(matrixData).reduce(
                      (s, dayData) => s + (dayData[g.id] ?? 0),
                      0
                    );
                    return (
                      <td
                        key={g.id}
                        className="px-2 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300"
                      >
                        {total > 0 ? formatCurrency(total) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-500 dark:text-red-400">
                    {formatCurrency(totalActual)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
