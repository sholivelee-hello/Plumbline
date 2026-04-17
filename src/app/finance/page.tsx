"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Plus,
  TrendingUp,
  X,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCashbook } from "@/lib/hooks/use-cashbook";
import {
  getEffectiveGroups,
  getItemKey,
  getBudgetItemTitle,
  getBudgetGroupId,
} from "@/lib/faith-budget-config";
import {
  getCurrentMonth,
  toLocalDateString,
  formatDateKR,
  formatMonthKR,
} from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { FinanceTransaction } from "@/types/database";

const GROUP_CHIP_STYLES: Record<
  string,
  { base: string; active: string; badge: string }
> = {
  obligation: {
    base: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    active: "bg-rose-500 text-white dark:bg-rose-500",
    badge:
      "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  },
  necessity: {
    base: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    active: "bg-blue-500 text-white dark:bg-blue-500",
    badge:
      "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sowing: {
    base: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    active: "bg-amber-500 text-white dark:bg-amber-500",
    badge:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  want: {
    base: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    active: "bg-purple-500 text-white dark:bg-purple-500",
    badge:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

function FinanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}

export default function FinancePage() {
  const today = toLocalDateString(new Date());
  const month = getCurrentMonth();
  const { entries, totalIncome, totalExpense, addEntry, deleteEntry, updateEntry, loading } =
    useCashbook(month);
  const { toast } = useToast();
  const budgetGroups = useMemo(() => getEffectiveGroups(), []);

  const todayEntries = entries.filter((e) => e.date === today);
  const todayIncome = todayEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const todayExpense = todayEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  // Chip input
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [activeChipTitle, setActiveChipTitle] = useState("");
  const [chipAmount, setChipAmount] = useState("");
  const [chipMemo, setChipMemo] = useState("");
  const [saving, setSaving] = useState(false);

  // Income modal
  const [showIncome, setShowIncome] = useState(false);
  const [incomeDesc, setIncomeDesc] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  // Free input modal
  const [showFree, setShowFree] = useState(false);
  const [freeDesc, setFreeDesc] = useState("");
  const [freeAmount, setFreeAmount] = useState("");
  const [freeBudgetKey, setFreeBudgetKey] = useState("");

  // Chip form ref for auto-scroll + exit animation
  const chipFormRef = useRef<HTMLDivElement>(null);
  const chipAmountRef = useRef<HTMLInputElement>(null);
  const [chipFormExiting, setChipFormExiting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    desc: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<FinanceTransaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editBudgetKey, setEditBudgetKey] = useState("");

  useEffect(() => {
    if (activeChip && chipFormRef.current) {
      chipFormRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeChip]);

  const closeChipForm = useCallback(() => {
    setChipFormExiting(true);
    setTimeout(() => {
      setActiveChip(null);
      setChipFormExiting(false);
    }, 250);
  }, []);

  function handleChipTap(key: string, title: string) {
    if (activeChip === key) {
      closeChipForm();
      return;
    }
    setChipFormExiting(false);
    setActiveChip(key);
    setActiveChipTitle(title);
    setChipAmount("");
    setChipMemo("");
  }

  const handleChipSave = useCallback(async () => {
    const amount = parseCurrencyInput(chipAmount);
    if (!amount || amount <= 0 || !activeChip) {
      if (chipAmountRef.current) {
        chipAmountRef.current.focus();
        chipAmountRef.current.classList.remove("animate-shake");
        void chipAmountRef.current.offsetWidth;
        chipAmountRef.current.classList.add("animate-shake");
      }
      return;
    }
    setSaving(true);
    const result = await addEntry({
      type: "expense",
      description: chipMemo.trim() || activeChipTitle,
      amount,
      date: today,
      budgetKey: activeChip,
    });
    setSaving(false);
    if (result.ok) {
      toast(`${activeChipTitle} ₩${formatWon(amount)} 저장됨`, "success");
      closeChipForm();
    } else {
      toast(result.error || "저장에 실패했습니다", "error");
    }
  }, [chipAmount, chipMemo, activeChip, activeChipTitle, today, addEntry, toast, closeChipForm]);

  const handleIncomeSave = useCallback(async () => {
    const amount = parseCurrencyInput(incomeAmount);
    if (!incomeDesc.trim() || !amount || amount <= 0) return;
    setSaving(true);
    const result = await addEntry({
      type: "income",
      description: incomeDesc.trim(),
      amount,
      date: today,
    });
    setSaving(false);
    if (result.ok) {
      toast(`수입 ₩${formatWon(amount)} 저장됨`, "success");
      setShowIncome(false);
      setIncomeDesc("");
      setIncomeAmount("");
    } else {
      toast(result.error || "저장에 실패했습니다", "error");
    }
  }, [incomeDesc, incomeAmount, today, addEntry, toast]);

  const handleFreeSave = useCallback(async () => {
    const amount = parseCurrencyInput(freeAmount);
    if (!freeDesc.trim() || !amount || amount <= 0) return;
    setSaving(true);
    const result = await addEntry({
      type: "expense",
      description: freeDesc.trim(),
      amount,
      date: today,
      budgetKey: freeBudgetKey || null,
    });
    setSaving(false);
    if (result.ok) {
      toast(`₩${formatWon(amount)} 저장됨`, "success");
      setShowFree(false);
      setFreeDesc("");
      setFreeAmount("");
      setFreeBudgetKey("");
    } else {
      toast(result.error || "저장에 실패했습니다", "error");
    }
  }, [freeDesc, freeAmount, freeBudgetKey, today, addEntry, toast]);

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

  const monthBalance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="재정 관리" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <FinanceSkeleton />
        ) : (
          <>
            {/* Today header */}
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                {formatDateKR(today)}
              </p>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  todayExpense > todayIncome
                    ? "text-red-500 dark:text-red-400"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {todayExpense > 0 ? "-" : ""}₩{formatWon(todayExpense)}
              </p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="text-blue-500 font-medium tabular-nums">
                  수입 +₩{formatWon(todayIncome)}
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-red-400 font-medium tabular-nums">
                  지출 -₩{formatWon(todayExpense)}
                </span>
              </div>
            </div>

            {/* Monthly summary card */}
            <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {formatMonthKR(month)} 요약
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">수입</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    ₩{formatWon(totalIncome)}
                  </p>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-[#262c38]">
                  <p className="text-[11px] text-gray-400 mb-0.5">지출</p>
                  <p className="text-base font-bold text-red-500 dark:text-red-400 tabular-nums">
                    ₩{formatWon(totalExpense)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">잔액</p>
                  <p
                    className={`text-base font-bold tabular-nums ${
                      monthBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {monthBalance >= 0 ? "+" : ""}₩
                    {formatWon(Math.abs(monthBalance))}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick input chips */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                빠른 입력
              </p>

              {budgetGroups.map((group) => {
                const styles = GROUP_CHIP_STYLES[group.id];
                return (
                  <div key={group.id} className="space-y-1.5">
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {group.title}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const key = getItemKey(group.id, item.id);
                        const isActive = activeChip === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleChipTap(key, item.title)}
                            aria-expanded={isActive}
                            aria-controls={isActive ? "chip-input-form" : undefined}
                            className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all active:scale-95 flex items-center ${
                              isActive ? styles.active : styles.base
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

              {/* Extra buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowIncome(true);
                    setIncomeDesc("");
                    setIncomeAmount("");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 active:scale-95 transition-transform"
                >
                  <TrendingUp size={12} /> 수입 기록
                </button>
                <button
                  onClick={() => {
                    setShowFree(true);
                    setFreeDesc("");
                    setFreeAmount("");
                    setFreeBudgetKey("");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 active:scale-95 transition-transform"
                >
                  <Plus size={12} /> 직접 입력
                </button>
              </div>
            </section>

            {/* Inline chip form */}
            {activeChip && (
              <div ref={chipFormRef} id="chip-input-form" role="region" aria-label={`${activeChipTitle} 입력`} className={`rounded-xl bg-white dark:bg-[#161a22] border border-gray-200 dark:border-[#262c38] shadow-card p-4 space-y-3 transition-all duration-250 ${chipFormExiting ? "opacity-0 translate-y-2 scale-[0.98]" : "animate-slide-up-fade"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {activeChipTitle}
                  </span>
                  <button
                    onClick={closeChipForm}
                    className="p-2.5 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">₩</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={chipAmount}
                    onChange={(e) =>
                      setChipAmount(formatCurrencyInput(e.target.value))
                    }
                    ref={chipAmountRef}
                    placeholder="금액"
                    aria-label={`${activeChipTitle} 금액`}
                    autoFocus
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleChipSave();
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={chipMemo}
                  onChange={(e) => setChipMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  aria-label={`${activeChipTitle} 메모`}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleChipSave();
                  }}
                />
                <button
                  onClick={handleChipSave}
                  disabled={saving || parseCurrencyInput(chipAmount) <= 0}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            )}

            {/* Today's entries */}
            <section className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                오늘 기록
              </p>

              {todayEntries.length === 0 ? (
                <EmptyState
                  illustration={
                    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 dark:text-gray-600">
                      {/* Wallet body */}
                      <rect x="14" y="28" width="60" height="38" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
                      {/* Wallet flap */}
                      <path d="M14 34V26a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8" stroke="currentColor" strokeWidth="2" fill="none" />
                      {/* Card slot */}
                      <rect x="54" y="40" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                      {/* Snap circle */}
                      <circle cx="64" cy="47" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      {/* Floating coin 1 */}
                      <circle cx="30" cy="14" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
                      <text x="30" y="17" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="600">&#8361;</text>
                      {/* Floating coin 2 */}
                      <circle cx="48" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
                    </svg>
                  }
                  title="아직 오늘 기록이 없습니다"
                  description="위의 카테고리를 눌러 빠르게 입력해보세요"
                />
              ) : (
                <div className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden divide-y divide-gray-50 dark:divide-[#262c38]">
                  {todayEntries.map((entry) => {
                    const groupId = entry.account_id
                      ? getBudgetGroupId(entry.account_id)
                      : null;
                    const chipStyle = groupId
                      ? GROUP_CHIP_STYLES[groupId]
                      : null;
                    const budgetTitle = entry.account_id
                      ? getBudgetItemTitle(entry.account_id)
                      : null;
                    const isIncome = entry.type === "income";

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-[#1a1f29] transition-colors"
                        onClick={() => openEdit(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openEdit(entry); }}
                      >
                        {budgetTitle && chipStyle ? (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium ${chipStyle.badge}`}
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
                </div>
              )}
            </section>

            {/* Quick links */}
            <section className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/finance/cashbook"
                className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 flex items-center justify-center">
                    <BookOpen
                      size={14}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      월별 출납부
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      전체 내역 조회
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-300 dark:text-gray-600" />
                </div>
              </Link>
              <Link
                href="/finance/budget"
                className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/25 flex items-center justify-center">
                    <ClipboardList
                      size={14}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      믿음의 예산안
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      예산 vs 실적
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-300 dark:text-gray-600" />
                </div>
              </Link>
            </section>
          </>
        )}
      </div>

      {/* Income modal */}
      <Modal
        isOpen={showIncome}
        onClose={() => setShowIncome(false)}
        title="수입 기록"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="income-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              내역
            </label>
            <input
              id="income-desc"
              type="text"
              value={incomeDesc}
              onChange={(e) => setIncomeDesc(e.target.value)}
              placeholder="예: 급여, 부수입"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("income-amount")?.focus();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="income-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              금액 (원)
            </label>
            <input
              id="income-amount"
              type="text"
              inputMode="numeric"
              value={incomeAmount}
              onChange={(e) =>
                setIncomeAmount(formatCurrencyInput(e.target.value))
              }
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleIncomeSave();
              }}
            />
          </div>
          <button
            onClick={handleIncomeSave}
            disabled={
              saving ||
              !incomeDesc.trim() ||
              parseCurrencyInput(incomeAmount) <= 0
            }
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </Modal>

      {/* Free input modal */}
      <Modal
        isOpen={showFree}
        onClose={() => setShowFree(false)}
        title="직접 입력"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="free-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              내역
            </label>
            <input
              id="free-desc"
              type="text"
              value={freeDesc}
              onChange={(e) => setFreeDesc(e.target.value)}
              placeholder="내역을 입력하세요"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("free-amount")?.focus();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="free-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              금액 (원)
            </label>
            <input
              id="free-amount"
              type="text"
              inputMode="numeric"
              value={freeAmount}
              onChange={(e) =>
                setFreeAmount(formatCurrencyInput(e.target.value))
              }
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFreeSave();
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              분류
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setFreeBudgetKey("")}
                className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
                  freeBudgetKey === ""
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                분류 없음
              </button>
              {budgetGroups.map((group) => {
                const styles = GROUP_CHIP_STYLES[group.id];
                return (
                  <div key={group.id} className="space-y-1">
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {group.title}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => {
                        const key = getItemKey(group.id, item.id);
                        const isSelected = freeBudgetKey === key;
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setFreeBudgetKey(key)}
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
          <button
            onClick={handleFreeSave}
            disabled={
              saving ||
              !freeDesc.trim() ||
              parseCurrencyInput(freeAmount) <= 0
            }
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </Modal>

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
            <label htmlFor="edit-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              내역
            </label>
            <input
              id="edit-desc"
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="내역을 입력하세요"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("edit-amount")?.focus();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              금액 (원)
            </label>
            <input
              id="edit-amount"
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
                  const styles = GROUP_CHIP_STYLES[group.id];
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
