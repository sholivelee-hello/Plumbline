"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { useCashbook } from "@/lib/hooks/use-cashbook";
import { useFaithBudget } from "@/lib/hooks/use-faith-budget";
import {
  getCurrentMonth,
  prevMonth,
  nextMonth,
  formatMonthKR,
  formatDateKR,
} from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import {
  getEffectiveGroups,
  getItemKey,
  getBudgetItemTitle,
  getBudgetGroupId,
} from "@/lib/faith-budget-config";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { FinanceTransaction } from "@/types/database";

const CHIP_STYLES: Record<string, { base: string; active: string }> = {
  obligation: {
    base: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    active: "bg-rose-500 text-white dark:bg-rose-500",
  },
  necessity: {
    base: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    active: "bg-blue-500 text-white dark:bg-blue-500",
  },
  sowing: {
    base: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    active: "bg-amber-500 text-white dark:bg-amber-500",
  },
  want: {
    base: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    active: "bg-purple-500 text-white dark:bg-purple-500",
  },
};

const BADGE_STYLES: Record<string, string> = {
  obligation:
    "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  necessity:
    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  sowing:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  want: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const GROUP_BAR_COLORS: Record<string, string> = {
  obligation: "bg-rose-400",
  necessity: "bg-blue-400",
  sowing: "bg-amber-400",
  want: "bg-purple-400",
};

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

function groupByDate(entries: FinanceTransaction[]) {
  const groups: Record<string, FinanceTransaction[]> = {};
  for (const e of entries) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function CashbookSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] p-5 space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-6 w-2/3 mx-auto mt-2" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function CashbookPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const {
    entries,
    totalIncome,
    totalExpense,
    loading,
    deleteEntry,
    updateEntry,
    actualByBudgetKey,
  } = useCashbook(month);
  const { toast } = useToast();
  const budgetGroups = useMemo(() => getEffectiveGroups(), []);

  const { grandTotal: budgetTotal } = useFaithBudget(month);
  const balance = totalIncome - totalExpense;
  const monthLabel = formatMonthKR(month);
  const budgetPct = budgetTotal > 0 ? Math.round((totalExpense / budgetTotal) * 100) : 0;
  const isOverBudget = totalExpense > budgetTotal && budgetTotal > 0;

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    desc: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<FinanceTransaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBudgetKey, setEditBudgetKey] = useState("");

  function openEdit(entry: FinanceTransaction) {
    setEditTarget(entry);
    setEditDesc(entry.description || "");
    setEditAmount(entry.amount > 0 ? entry.amount.toLocaleString("ko-KR") : "");
    setEditBudgetKey(entry.account_id || "");
  }

  const handleEditSave = useCallback(async () => {
    if (!editTarget) return;
    const amount = parseCurrencyInput(editAmount);
    if (!editDesc.trim() || !amount || amount <= 0) return;
    setSaving(true);
    const result = await updateEntry(editTarget.id, {
      description: editDesc.trim(),
      amount,
      account_id: editTarget.type === "expense" ? (editBudgetKey || null) : null,
    });
    setSaving(false);
    if (result.ok) {
      toast("수정됨", "success");
      setEditTarget(null);
    } else {
      toast(result.error || "수정에 실패했습니다", "error");
    }
  }, [editTarget, editDesc, editAmount, editBudgetKey, updateEntry, toast]);

  // View mode & filter
  const [viewMode, setViewMode] = useState<"detail" | "summary">("detail");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filteredEntries = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter],
  );

  const groupSpending = useMemo(
    () =>
      budgetGroups.map((group) => {
        const total = group.items.reduce((sum, item) => {
          const key = getItemKey(group.id, item.id);
          return sum + (actualByBudgetKey[key] || 0);
        }, 0);
        return { id: group.id, title: group.title, total };
      }),
    [actualByBudgetKey],
  );

  const ungroupedExpense = useMemo(
    () =>
      entries
        .filter((e) => e.type === "expense" && !e.account_id)
        .reduce((s, e) => s + e.amount, 0),
    [entries],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteEntry(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast(`'${deleteTarget.desc}' 삭제됨`, "success");
    } else {
      toast(result.error || "삭제에 실패했습니다", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteEntry, toast]);

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader
        title="월별 출납부"
        backHref="/finance"
        subtitle={monthLabel}
        contentMaxWidth="max-w-3xl"
      />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setMonth(prevMonth(month))}
            aria-label="이전 달"
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={month >= getCurrentMonth()}
            aria-label="다음 달"
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>

        {loading ? (
          <CashbookSkeleton />
        ) : (
          <>
            {/* Summary card */}
            <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    총 수입
                  </span>
                </div>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  ₩{formatWon(totalIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-red-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    총 지출
                  </span>
                </div>
                <span className="text-base font-bold text-red-500 dark:text-red-400 tabular-nums">
                  ₩{formatWon(totalExpense)}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-[#262c38] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    잔액
                  </span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      balance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {balance >= 0 ? "+" : "-"}₩{formatWon(Math.abs(balance))}
                  </span>
                </div>
              </div>
              {budgetTotal > 0 && (
                <div className="border-t border-gray-100 dark:border-[#262c38] pt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      예산 대비 지출
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isOverBudget
                          ? "text-red-500"
                          : budgetPct >= 80
                            ? "text-amber-500"
                            : "text-gray-500"
                      }`}
                    >
                      {budgetPct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget
                          ? "bg-red-500"
                          : budgetPct >= 80
                            ? "bg-amber-400"
                            : "bg-blue-400"
                      }`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 tabular-nums">
                    <span>₩{formatWon(totalExpense)} 사용</span>
                    <span>₩{formatWon(budgetTotal)} 예산</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tab toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 self-start">
              <button
                onClick={() => setViewMode("detail")}
                className={`px-4 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-all ${
                  viewMode === "detail"
                    ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                상세
              </button>
              <button
                onClick={() => setViewMode("summary")}
                className={`px-4 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-all ${
                  viewMode === "summary"
                    ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                요약
              </button>
            </div>

            {viewMode === "summary" ? (
              /* Summary view */
              <div className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden divide-y divide-gray-50 dark:divide-[#262c38]">
                {groupSpending.map(({ id, title, total }) => {
                  const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
                  const barColor = GROUP_BAR_COLORS[id] || "bg-gray-400";
                  return (
                    <div key={id} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${BADGE_STYLES[id] || ""}`}>
                          {title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400 tabular-nums">{pct}%</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            ₩{formatWon(total)}
                          </span>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {ungroupedExpense > 0 && (
                  <div className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        미분류
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 tabular-nums">
                          {totalExpense > 0 ? Math.round((ungroupedExpense / totalExpense) * 100) : 0}%
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                          ₩{formatWon(ungroupedExpense)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gray-400"
                        style={{ width: `${totalExpense > 0 ? Math.min(Math.round((ungroupedExpense / totalExpense) * 100), 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1f29]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">총 지출</span>
                    <span className="text-base font-bold text-red-500 dark:text-red-400 tabular-nums">
                      ₩{formatWon(totalExpense)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Detail view */
              <>
                {/* Filter chips */}
                <div className="flex gap-2">
                  {(["all", "income", "expense"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-all ${
                        filter === f
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {f === "all" ? "전체" : f === "income" ? "수입" : "지출"}
                    </button>
                  ))}
                </div>

                {/* Entries by date */}
                {filteredEntries.length === 0 ? (
                  <EmptyState
                    illustration={
                      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 dark:text-gray-600">
                        {/* Ledger/notebook body */}
                        <rect x="20" y="12" width="48" height="64" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                        {/* Spine binding */}
                        <line x1="28" y1="12" x2="28" y2="76" stroke="currentColor" strokeWidth="1.5" />
                        {/* Line rows */}
                        <line x1="34" y1="28" x2="58" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                        <line x1="34" y1="36" x2="54" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
                        <line x1="34" y1="44" x2="60" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                        <line x1="34" y1="52" x2="50" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
                        {/* Pencil */}
                        <g transform="translate(56, 56) rotate(-45)">
                          <rect x="0" y="0" width="4" height="20" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <path d="M0 20 L2 24 L4 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <line x1="0" y1="4" x2="4" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                        </g>
                      </svg>
                    }
                    title={filter === "all" ? "이 달의 기록이 없습니다" : filter === "income" ? "수입 기록이 없습니다" : "지출 기록이 없습니다"}
                    description="재정 관리 페이지에서 수입/지출을 기록해보세요"
                  />
                ) : (
                  <div className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden">
                    {groupByDate(filteredEntries).map(([date, items]) => {
                  const dayIncome = items
                    .filter((e) => e.type === "income")
                    .reduce((s, e) => s + e.amount, 0);
                  const dayExpense = items
                    .filter((e) => e.type === "expense")
                    .reduce((s, e) => s + e.amount, 0);

                  return (
                    <section key={date} aria-label={formatDateKR(date)}>
                      {/* Date header */}
                      <div className="px-4 py-2 bg-gray-50/80 dark:bg-[#1e2430] border-b-2 border-gray-100 dark:border-[#333a48] flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {formatDateKR(date)}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-medium tabular-nums">
                          {dayIncome > 0 && (
                            <span className="text-blue-500">
                              +₩{formatWon(dayIncome)}
                            </span>
                          )}
                          {dayExpense > 0 && (
                            <span className="text-red-400">
                              -₩{formatWon(dayExpense)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Day entries */}
                      {items.map((entry) => {
                        const groupId = entry.account_id
                          ? getBudgetGroupId(entry.account_id)
                          : null;
                        const badgeStyle = groupId
                          ? BADGE_STYLES[groupId]
                          : null;
                        const budgetTitle = entry.account_id
                          ? getBudgetItemTitle(entry.account_id)
                          : null;
                        const isIncome = entry.type === "income";

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-[#262c38] last:border-0 cursor-pointer active:bg-gray-50 dark:active:bg-[#1a1f29] transition-colors"
                            onClick={() => openEdit(entry)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openEdit(entry); }}
                          >
                            {budgetTitle && badgeStyle ? (
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium ${badgeStyle}`}
                              >
                                {budgetTitle}
                              </span>
                            ) : isIncome ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                수입
                              </span>
                            ) : null}
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0">
                              {entry.description}
                            </span>
                            <span
                              className={`shrink-0 text-sm font-semibold tabular-nums ${
                                isIncome
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {isIncome ? "+" : "-"}₩{formatWon(entry.amount)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  id: entry.id,
                                  desc: entry.description || "",
                                });
                              }}
                              disabled={deleting}
                              aria-label={`${entry.description} 삭제`}
                              className="shrink-0 p-2.5 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-400 active:text-red-500 transition-colors rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
                )}
              </>
            )}

            {/* Cross-navigation */}
            <Link
              href="/finance/budget"
              className="flex items-center justify-between rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/25 flex items-center justify-center">
                  <ClipboardList size={14} className="text-indigo-600 dark:text-indigo-400" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">믿음의 예산안</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">예산 vs 실적 비교</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </Link>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="기록 삭제"
        description={
          deleteTarget
            ? `"${deleteTarget.desc}" 기록을 삭제하시겠습니까?`
            : ""
        }
        confirmLabel="삭제"
        variant="danger"
        loading={deleting}
      />

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="기록 수정"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="cb-edit-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              내역
            </label>
            <input
              id="cb-edit-desc"
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="내역을 입력하세요"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("cb-edit-amount")?.focus();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="cb-edit-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              금액 (원)
            </label>
            <input
              id="cb-edit-amount"
              type="text"
              inputMode="numeric"
              value={editAmount}
              onChange={(e) => setEditAmount(formatCurrencyInput(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSave();
              }}
            />
          </div>
          {editTarget?.type === "expense" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                분류
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setEditBudgetKey("")}
                  className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
                    editBudgetKey === ""
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  분류 없음
                </button>
                {budgetGroups.map((group) => {
                  const styles = CHIP_STYLES[group.id];
                  return (
                    <div key={group.id} className="space-y-1">
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {group.title}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => {
                          const key = getItemKey(group.id, item.id);
                          const isSelected = editBudgetKey === key;
                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => setEditBudgetKey(key)}
                              className={`px-3 py-1.5 min-h-[44px] rounded-full text-[11px] font-medium transition-all flex items-center ${
                                isSelected ? styles.active : styles.base
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
            onClick={handleEditSave}
            disabled={saving || !editDesc.trim() || parseCurrencyInput(editAmount) <= 0}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "수정"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
