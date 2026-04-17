"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useFaithBudget } from "@/lib/hooks/use-faith-budget";
import { useCashbook } from "@/lib/hooks/use-cashbook";
import {
  getCurrentMonth,
  prevMonth,
  nextMonth,
  formatMonthKR,
} from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import {
  getCustomItems,
  saveCustomItems,
  clearCustomItems,
  FAITH_BUDGET_GROUPS,
} from "@/lib/faith-budget-config";
import type { FaithBudgetItem } from "@/lib/faith-budget-config";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { BudgetGroupData } from "@/lib/hooks/use-faith-budget";

const GROUP_STYLES: Record<
  string,
  {
    headerBg: string;
    headerText: string;
    accentText: string;
    badge: string;
    bar: string;
    barOver: string;
  }
> = {
  obligation: {
    headerBg: "bg-rose-50 dark:bg-rose-900/15",
    headerText: "text-rose-700 dark:text-rose-300",
    accentText: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400",
    bar: "bg-rose-400",
    barOver: "bg-red-500",
  },
  necessity: {
    headerBg: "bg-blue-50 dark:bg-blue-900/15",
    headerText: "text-blue-700 dark:text-blue-300",
    accentText: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400",
    bar: "bg-blue-400",
    barOver: "bg-red-500",
  },
  sowing: {
    headerBg: "bg-amber-50 dark:bg-amber-900/15",
    headerText: "text-amber-700 dark:text-amber-300",
    accentText: "text-amber-600 dark:text-amber-400",
    badge:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400",
    bar: "bg-amber-400",
    barOver: "bg-red-500",
  },
  want: {
    headerBg: "bg-purple-50 dark:bg-purple-900/15",
    headerText: "text-purple-700 dark:text-purple-300",
    accentText: "text-purple-600 dark:text-purple-400",
    badge:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400",
    bar: "bg-purple-400",
    barOver: "bg-red-500",
  },
};

function formatBudgetInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseBudgetInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

function parsePercentGuide(guide: string): number {
  const match = guide.match(/(\d+)~(\d+)/);
  if (!match) return 0;
  return (parseInt(match[1]) + parseInt(match[2])) / 2 / 100;
}

function BudgetSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] overflow-hidden"
        >
          <Skeleton className="h-10 rounded-none" />
          <div className="p-4 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-10 rounded-none" />
        </div>
      ))}
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}

function BudgetGroup({
  group,
  actualMap,
  onUpdateAmount,
  grandTotal,
  onEditItems,
}: {
  group: BudgetGroupData;
  actualMap: Record<string, number>;
  onUpdateAmount: (key: string, amount: number) => void;
  grandTotal: number;
  onEditItems: (groupId: string) => void;
}) {
  const style = GROUP_STYLES[group.id] || GROUP_STYLES.obligation;
  const actualPercent =
    grandTotal > 0 ? Math.round((group.subtotal / grandTotal) * 100) : 0;

  const groupActual = group.items.reduce(
    (s, item) => s + (actualMap[item.key] || 0),
    0,
  );

  // Track formatted values for each input
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  function getDisplayValue(key: string, amount: number): string {
    if (key in inputValues) return inputValues[key];
    return amount === 0 ? "" : amount.toLocaleString("ko-KR");
  }

  function handleInputChange(key: string, rawValue: string) {
    const formatted = formatBudgetInput(rawValue);
    setInputValues((prev) => ({ ...prev, [key]: formatted }));
    onUpdateAmount(key, parseBudgetInput(rawValue));
  }

  function handleInputBlur(key: string) {
    setInputValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <section aria-label={`${group.title} 예산 그룹`} className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden">
      {/* Group header */}
      <div
        className={`px-4 py-3 ${style.headerBg} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${style.headerText}`}>
            {group.title}
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}
          >
            {group.percentGuide}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {grandTotal > 0 && (
            <span className={`text-xs font-medium ${style.accentText}`}>
              {actualPercent}%
            </span>
          )}
          <button
            onClick={() => onEditItems(group.id)}
            aria-label={`${group.title} 항목 편집`}
            className={`p-2 min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-lg transition-colors ${style.headerText} opacity-60 hover:opacity-100`}
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50 dark:divide-[#262c38]">
        {group.items.map((item) => {
          const actual = actualMap[item.key] || 0;
          const rawPct =
            item.amount > 0
              ? Math.round((actual / item.amount) * 100)
              : 0;
          const isOver = actual > item.amount && item.amount > 0;
          const isUnbudgeted = item.amount === 0 && actual > 0;
          const excess = actual - item.amount;

          return (
            <div key={item.key} className="px-4 py-3 space-y-2.5">
              {/* Title + budget input */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.title}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">₩</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getDisplayValue(item.key, item.amount)}
                    onChange={(e) =>
                      handleInputChange(item.key, e.target.value)
                    }
                    onBlur={() => handleInputBlur(item.key)}
                    placeholder="예산"
                    aria-label={`${item.title} 예산`}
                    className="w-28 min-h-[36px] text-right text-sm font-medium px-2 py-1.5 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent tabular-nums"
                  />
                </div>
              </div>

              {/* Budget vs Actual comparison */}
              {(item.amount > 0 || actual > 0) && (
                <div className="space-y-1.5">
                  {/* Amount comparison row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">
                        예산{" "}
                        <span className="font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                          ₩{formatWon(item.amount)}
                        </span>
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">
                        →
                      </span>
                      <span
                        className={
                          isOver ? "text-red-500 font-semibold" : "text-gray-400"
                        }
                      >
                        실적{" "}
                        <span
                          className={`font-medium tabular-nums ${
                            isOver
                              ? "text-red-500"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          ₩{formatWon(actual)}
                        </span>
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isOver
                          ? "text-red-500"
                          : rawPct >= 80
                            ? "text-amber-500"
                            : "text-gray-400"
                      }`}
                    >
                      {rawPct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? style.barOver : style.bar
                      }`}
                      style={{
                        width: `${Math.min(rawPct, 100)}%`,
                      }}
                    />
                  </div>

                  {/* Over-budget warning */}
                  {isOver && (
                    <p className="text-xs font-semibold text-red-500 tabular-nums">
                      ₩{formatWon(excess)} 초과
                    </p>
                  )}
                  {isUnbudgeted && (
                    <p className="text-xs font-medium text-amber-500">
                      예산 미설정 · 실적 ₩{formatWon(actual)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtotal */}
      <div
        className={`px-4 py-3 ${style.headerBg} flex items-center justify-between border-t border-gray-100 dark:border-[#262c38]`}
      >
        <span className={`text-sm font-semibold ${style.headerText}`}>
          소계
        </span>
        <div className="text-right">
          <span className={`text-sm font-bold tabular-nums ${style.accentText}`}>
            ₩{formatWon(group.subtotal)}
          </span>
          {groupActual > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
              실적 ₩{formatWon(groupActual)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function FaithBudgetPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [categoryVersion, setCategoryVersion] = useState(0);
  const { groups, grandTotal, updateAmount, bulkUpdateAmounts } = useFaithBudget(month, categoryVersion);
  const { actualByBudgetKey, loading } = useCashbook(month);
  const monthLabel = formatMonthKR(month);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [saved, setSaved] = useState(false);

  // Category editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<FaithBudgetItem[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const editingGroupTitle = editingGroupId
    ? FAITH_BUDGET_GROUPS.find((g) => g.id === editingGroupId)?.title ?? ""
    : "";

  function openCategoryEditor(groupId: string) {
    const defaultGroup = FAITH_BUDGET_GROUPS.find((g) => g.id === groupId);
    if (!defaultGroup) return;
    const custom = getCustomItems(groupId);
    setEditItems(custom && custom.length > 0 ? custom.map((i) => ({ ...i })) : defaultGroup.items.map((i) => ({ ...i })));
    setEditingGroupId(groupId);
  }

  function handleAddItem() {
    const id = `custom${Date.now()}`;
    setEditItems((prev) => [...prev, { id, title: "" }]);
  }

  function handleRemoveItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleItemTitleChange(index: number, title: string) {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title } : item)),
    );
  }

  function handleSaveItems() {
    if (!editingGroupId) return;
    const valid = editItems.filter((item) => item.title.trim() !== "");
    if (valid.length === 0) return;
    saveCustomItems(editingGroupId, valid);
    setCategoryVersion((v) => v + 1);
    setEditingGroupId(null);
  }

  function handleResetToDefault() {
    if (!editingGroupId) return;
    clearCustomItems(editingGroupId);
    setCategoryVersion((v) => v + 1);
    setShowResetConfirm(false);
    setEditingGroupId(null);
  }

  // Income-based recommendation
  const [recommendIncome, setRecommendIncome] = useState("");
  const [showRecommendConfirm, setShowRecommendConfirm] = useState(false);
  const recIncome = parseBudgetInput(recommendIncome);

  const applyRecommendations = useCallback(() => {
    if (recIncome <= 0) return;
    const recs: Record<string, number> = {};
    for (const group of groups) {
      const pct = parsePercentGuide(group.percentGuide);
      const groupBudget = Math.round(recIncome * pct);
      const perItem = Math.round(groupBudget / group.items.length);
      for (const item of group.items) {
        recs[item.key] = perItem;
      }
    }
    bulkUpdateAmounts(recs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setShowRecommendConfirm(false);
  }, [recIncome, groups, bulkUpdateAmounts]);

  const totalActual = Object.values(actualByBudgetKey).reduce(
    (s, v) => s + v,
    0,
  );

  const handleUpdateAmount = useCallback(
    (key: string, amount: number) => {
      updateAmount(key, amount);
      setSaved(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, 500);
    },
    [updateAmount],
  );

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader
        title="믿음의 예산안"
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
          <div className="min-w-[120px] text-center">
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {monthLabel}
            </span>
            {saved && (
              <p className="text-[10px] text-surplus-500 font-medium flex items-center justify-center gap-0.5 animate-slide-up-fade">
                <Check size={10} /> 저장됨
              </p>
            )}
          </div>
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
          <BudgetSkeleton />
        ) : (
          <>
            {/* Income-based recommendation */}
            <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/15 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  수입 기반 추천
                </span>
                {recIncome > 0 && (
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">
                    비율 가이드 기준
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">₩</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={recommendIncome}
                    onChange={(e) => setRecommendIncome(formatBudgetInput(e.target.value))}
                    placeholder="이번 달 총 수입을 입력하세요"
                    aria-label="이번 달 총 수입"
                    className="flex-1 min-h-[44px] text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 tabular-nums"
                  />
                </div>
                {recIncome > 0 && (
                  <>
                    <div className="space-y-1.5">
                      {groups.map((group) => {
                        const pct = parsePercentGuide(group.percentGuide);
                        const amount = Math.round(recIncome * pct);
                        return (
                          <div key={group.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              {group.title}{" "}
                              <span className="text-gray-300 dark:text-gray-600">({group.percentGuide})</span>
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                              ₩{formatWon(amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        if (grandTotal > 0) {
                          setShowRecommendConfirm(true);
                        } else {
                          applyRecommendations();
                        }
                      }}
                      className="w-full py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors active:scale-[0.98]"
                    >
                      추천 적용
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Budget groups */}
            {groups.map((group) => (
              <BudgetGroup
                key={group.id}
                group={group}
                actualMap={actualByBudgetKey}
                onUpdateAmount={handleUpdateAmount}
                grandTotal={grandTotal}
                onEditItems={openCategoryEditor}
              />
            ))}

            {/* Grand total */}
            <div className="rounded-2xl bg-gray-900 dark:bg-[#1e2330] p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">총 예산</span>
                <span className="text-xl font-bold text-white tabular-nums">
                  ₩{formatWon(grandTotal)}
                </span>
              </div>
              {totalActual > 0 && (
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-sm text-gray-400">총 실적</span>
                  <span className="text-base font-semibold text-gray-300 tabular-nums">
                    ₩{formatWon(totalActual)}
                  </span>
                </div>
              )}
              {grandTotal > 0 && totalActual > 0 && (
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-sm text-gray-400">달성률</span>
                  <span
                    className={`text-base font-semibold tabular-nums ${
                      totalActual > grandTotal
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {Math.round((totalActual / grandTotal) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Cross-navigation */}
            <Link
              href="/finance/cashbook"
              className="flex items-center justify-between rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 flex items-center justify-center">
                  <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">월별 출납부</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">전체 내역 조회</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </Link>
          </>
        )}
      </div>

      {/* Recommendation confirm */}
      <ConfirmDialog
        isOpen={showRecommendConfirm}
        onClose={() => setShowRecommendConfirm(false)}
        onConfirm={applyRecommendations}
        title="추천 금액 적용"
        description="기존 예산 금액을 추천 금액으로 덮어쓰시겠습니까?"
        confirmLabel="적용"
        variant="danger"
      />

      {/* Category edit modal */}
      <Modal
        isOpen={!!editingGroupId}
        onClose={() => setEditingGroupId(null)}
        title={`${editingGroupTitle} 항목 편집`}
      >
        <div className="space-y-4">
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {editItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleItemTitleChange(index, e.target.value)}
                  placeholder="항목 이름"
                  aria-label={`항목 ${index + 1} 이름`}
                  className="flex-1 px-3 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={editItems.length <= 1}
                  aria-label={`${item.title || "항목"} 삭제`}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg disabled:opacity-20 disabled:pointer-events-none"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-xl border-2 border-dashed border-gray-200 dark:border-[#333] text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Plus size={14} />
            항목 추가
          </button>

          <button
            type="button"
            onClick={handleSaveItems}
            disabled={editItems.filter((i) => i.title.trim()).length === 0}
            className="w-full py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            저장
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            기본값으로 초기화
          </button>
        </div>
      </Modal>

      {/* Reset confirm */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetToDefault}
        title="기본값으로 초기화"
        description="커스텀 항목을 모두 삭제하고 기본 항목으로 되돌리시겠습니까?"
        confirmLabel="초기화"
        variant="danger"
      />
    </div>
  );
}
