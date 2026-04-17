"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BookOpen,
  ClipboardList,
  CreditCard,
  BarChart2,
  Settings,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useFinanceHub } from "@/lib/hooks/use-finance-hub";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useBudgetSettings } from "@/lib/hooks/use-budget-settings";
import {
  getCurrentMonth,
  prevMonth,
  nextMonth,
  formatMonthKR,
} from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft } from "lucide-react";

// ─── Group color helpers ──────────────────────────────────────────────────────

const GROUP_CHIP_STYLES: Record<string, { base: string; active: string; dot: string }> = {
  obligation: {
    base: "bg-blue-50 text-[#1E3A5F] dark:bg-[#1E3A5F]/20 dark:text-blue-300",
    active: "bg-[#1E3A5F] text-white",
    dot: "bg-[#1E3A5F]",
  },
  necessity: {
    base: "bg-emerald-50 text-[#059669] dark:bg-[#059669]/20 dark:text-emerald-300",
    active: "bg-[#059669] text-white",
    dot: "bg-[#059669]",
  },
  sowing: {
    base: "bg-purple-50 text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-purple-300",
    active: "bg-[#7C3AED] text-white",
    dot: "bg-[#7C3AED]",
  },
  want: {
    base: "bg-orange-50 text-[#EA580C] dark:bg-[#EA580C]/20 dark:text-orange-300",
    active: "bg-[#EA580C] text-white",
    dot: "bg-[#EA580C]",
  },
};

const GROUP_PROGRESS_COLORS: Record<string, string> = {
  obligation: "bg-[#1E3A5F]",
  necessity: "bg-[#059669]",
  sowing: "bg-[#7C3AED]",
  want: "bg-[#EA580C]",
};

const GROUP_BADGE_STYLES: Record<string, string> = {
  obligation: "bg-blue-100 text-[#1E3A5F] dark:bg-[#1E3A5F]/20 dark:text-blue-300",
  necessity: "bg-emerald-100 text-[#059669] dark:bg-[#059669]/20 dark:text-emerald-300",
  sowing: "bg-purple-100 text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-purple-300",
  want: "bg-orange-100 text-[#EA580C] dark:bg-[#EA580C]/20 dark:text-orange-300",
};

// ─── Currency helpers ─────────────────────────────────────────────────────────

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HubSkeleton() {
  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      {/* Donut */}
      <Skeleton className="h-40 rounded-2xl" />
      {/* Group cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {/* Shortcuts */}
      <Skeleton className="h-16 rounded-2xl" />
      {/* Today */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonth());
  const { toast } = useToast();

  const { summary, donutData, groupCards, todayTransactions, loading } =
    useFinanceHub(month);

  const { addTransaction } = useFinanceTransactions(month);
  const { groups, incomeCategories } = useBudgetSettings();

  // BottomSheet input state
  const [inputOpen, setInputOpen] = useState(false);
  const [isIncome, setIsIncome] = useState(false);

  // Expense flow
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    () => new Date().toLocaleDateString("sv-SE")
  );
  const [description, setDescription] = useState("");

  // Income flow
  const [incomeCategory, setIncomeCategory] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  function resetInput() {
    setIsIncome(false);
    setSelectedGroupId(null);
    setSelectedItemId(null);
    setAmount("");
    setDate(new Date().toLocaleDateString("sv-SE"));
    setDescription("");
    setIncomeCategory(null);
  }

  function openInput() {
    resetInput();
    setInputOpen(true);
  }

  const canSave = isIncome
    ? parseCurrencyInput(amount) > 0 && incomeCategory !== null
    : parseCurrencyInput(amount) > 0 && selectedGroupId !== null;

  const handleSave = useCallback(async () => {
    const amt = parseCurrencyInput(amount);
    if (!canSave || amt <= 0) return;

    setSaving(true);
    const result = await addTransaction(
      isIncome
        ? {
            type: "income",
            amount: amt,
            description: description.trim() || incomeCategory || "수입",
            date,
            income_category: incomeCategory,
          }
        : {
            type: "expense",
            amount: amt,
            description:
              description.trim() ||
              (selectedGroupId && selectedItemId
                ? groups
                    .find((g) => g.id === selectedGroupId)
                    ?.items.find((i) => i.id === selectedItemId)?.title ??
                  "지출"
                : "지출"),
            date,
            group_id: selectedGroupId,
            item_id: selectedItemId,
          }
    );
    setSaving(false);

    if (result.ok) {
      toast(
        isIncome
          ? `수입 ₩${formatWon(amt)} 저장됨`
          : `지출 ₩${formatWon(amt)} 저장됨`,
        "success"
      );
      setInputOpen(false);
      resetInput();
    } else {
      toast(result.error ?? "저장에 실패했습니다", "error");
    }
  }, [
    amount,
    canSave,
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

  // Total expense percent for donut (use largest group or overall)
  const totalDonutPercent =
    donutData.length > 0
      ? Math.min(
          Math.round(
            (donutData.reduce((s, d) => s + d.amount, 0) /
              Math.max(
                groupCards.reduce((s, c) => s + c.budget, 0) || 1,
                1
              )) *
              100
          ),
          100
        )
      : 0;

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="재정 관리" contentMaxWidth="max-w-3xl" />

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {/* ── 1. Month Picker ───────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setMonth(prevMonth(month))}
            aria-label="이전 달"
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
            {formatMonthKR(month)}
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
          <HubSkeleton />
        ) : (
          <>
            {/* ── 2. Summary Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {/* 수입 */}
              <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-3 lg:p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 수입
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">
                  +₩{formatWon(summary.income)}
                </p>
                <span className="text-[10px] text-gray-400">원</span>
              </div>

              {/* 지출 */}
              <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-3 lg:p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-red-500" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 지출
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-red-500 dark:text-red-400 tabular-nums leading-tight">
                  -₩{formatWon(summary.expense)}
                </p>
                <span className="text-[10px] text-gray-400">원</span>
              </div>

              {/* 잔액 */}
              <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-3 lg:p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet size={14} className="text-[#1E3A5F] dark:text-blue-300" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    이번달 잔액
                  </span>
                </div>
                <p
                  className={`text-sm lg:text-base font-bold tabular-nums leading-tight ${
                    summary.balance >= 0
                      ? "text-[#1E3A5F] dark:text-blue-300"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {summary.balance >= 0 ? "+" : "-"}₩
                  {formatWon(Math.abs(summary.balance))}
                </p>
                <span className="text-[10px] text-gray-400">원</span>
              </div>
            </div>

            {/* ── 3. Donut Chart ───────────────────────────────────────── */}
            <div className="rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                그룹별 지출
              </p>
              <div className="flex items-center gap-4">
                <DonutChart
                  percent={totalDonutPercent}
                  size={100}
                  strokeWidth={10}
                  label="예산 대비"
                  color="#1E3A5F"
                  trackColor="#E5E7EB"
                />
                <div className="flex-1 space-y-2 min-w-0">
                  {donutData.map((d) => (
                    <div key={d.groupId} className="flex items-center gap-2">
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                        {d.title}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        ₩{formatWon(d.amount)}
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right">
                        {d.percent}%
                      </span>
                    </div>
                  ))}
                  {donutData.length === 0 && (
                    <p className="text-xs text-gray-400">지출 내역이 없습니다</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Group Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupCards.map((card) => {
                const progressColor = GROUP_PROGRESS_COLORS[card.groupId];
                return (
                  <Card
                    key={card.groupId}
                    onClick={() => router.push(`/finance/${card.groupId}`)}
                    className="space-y-2.5"
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="shrink-0 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {card.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                        {card.percentGuide}
                      </span>
                    </div>

                    {/* Budget vs actual */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      ₩{formatWon(card.actual)}{" "}
                      <span className="text-gray-300 dark:text-gray-600">/</span>{" "}
                      ₩{formatWon(card.budget)} 원
                    </p>

                    {/* Progress bar */}
                    <ProgressBar
                      percent={card.percent}
                      color={
                        card.percent > 100
                          ? "bg-red-500"
                          : card.percent >= 80
                          ? "bg-amber-400"
                          : progressColor ?? "bg-gray-400"
                      }
                      height="h-2"
                    />

                    {/* Percent label */}
                    <p
                      className={`text-[11px] font-medium tabular-nums ${
                        card.percent > 100
                          ? "text-red-500"
                          : card.percent >= 80
                          ? "text-amber-500"
                          : "text-gray-400"
                      }`}
                    >
                      ({card.percent}%)
                    </p>
                  </Card>
                );
              })}
            </div>

            {/* ── 5. Quick Shortcuts ───────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {[
                { href: "/finance/cashbook", icon: BookOpen, label: "출납부", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                { href: "/finance/budget", icon: ClipboardList, label: "예산", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
                { href: "/finance/installments", icon: CreditCard, label: "할부", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { href: "/finance/report", icon: BarChart2, label: "리포트", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                { href: "/finance/settings", icon: Settings, label: "설정", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
              ].map(({ href, icon: Icon, label, color, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="shrink-0 flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card hover:shadow-card-hover transition-all active:scale-[0.96] min-w-[64px]"
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon size={16} className={color} />
                  </span>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* ── 6. Today's Transactions ──────────────────────────────── */}
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
                <div className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-6 text-center space-y-3">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    아직 기록이 없어요
                  </p>
                  <button
                    onClick={openInput}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 active:scale-95 transition-transform"
                  >
                    <Plus size={12} />
                    지출 기록하기
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card overflow-hidden divide-y divide-gray-50 dark:divide-[#262c38]">
                  {todayTransactions.slice(0, 5).map((tx) => {
                    const badgeStyle = tx.group_id
                      ? GROUP_BADGE_STYLES[tx.group_id]
                      : null;
                    const isIncomeTx = tx.type === "income";
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-2 px-4 py-3"
                      >
                        {badgeStyle ? (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium ${badgeStyle}`}
                          >
                            {tx.group_id}
                          </span>
                        ) : isIncomeTx ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            수입
                          </span>
                        ) : null}
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate min-w-0">
                          {tx.description}
                        </span>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            isIncomeTx
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {isIncomeTx ? "+" : "-"}₩{formatWon(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── 7. FAB ───────────────────────────────────────────────────────── */}
      <button
        onClick={openInput}
        aria-label="거래 추가"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg flex items-center justify-center active:scale-90 transition-transform hover:opacity-90"
      >
        <Plus size={22} />
      </button>

      {/* ── Universal Input Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title="거래 입력"
      >
        <div className="space-y-4">
          {/* Segmented toggle: 지출 / 수입 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => {
                setIsIncome(false);
                setIncomeCategory(null);
              }}
              className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                !isIncome
                  ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              지출
            </button>
            <button
              onClick={() => {
                setIsIncome(true);
                setSelectedGroupId(null);
                setSelectedItemId(null);
              }}
              className={`flex-1 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                isIncome
                  ? "bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              수입
            </button>
          </div>

          {isIncome ? (
            /* ── Income flow ── */
            <>
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
                      className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
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
            </>
          ) : (
            /* ── Expense flow ── */
            <>
              {/* Group selection */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  그룹 선택
                </p>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const style = GROUP_CHIP_STYLES[g.id];
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setSelectedItemId(null);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
                          isSelected ? style.active : style.base
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : style.dot}`}
                        />
                        {g.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Item selection */}
              {selectedGroupId && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    항목 선택
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groups
                      .find((g) => g.id === selectedGroupId)
                      ?.items.map((item) => {
                        const style = GROUP_CHIP_STYLES[selectedGroupId];
                        const isSelected = selectedItemId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            className={`px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-all ${
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

          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              금액 (원)
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29]">
              <span className="text-sm text-gray-400">₩</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                placeholder="0"
                autoFocus
                className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none tabular-nums"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2">
              {[10000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setAmount(
                      ((parseCurrencyInput(amount) + v) || v).toLocaleString(
                        "ko-KR"
                      )
                    )
                  }
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 active:scale-95 transition-transform"
                >
                  +{formatWon(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              메모 (선택)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="내역 설명"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1f29] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
