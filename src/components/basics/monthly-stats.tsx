"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonthlyStats } from "@/lib/hooks/use-monthly-stats";
import { AchievementCard } from "./achievement-card";
import { CalendarHeatmap } from "./calendar-heatmap";
import { WeeklyComparison } from "./weekly-comparison";
import { DailyTable } from "./daily-table";
import { getCurrentMonth, prevMonth, nextMonth, formatMonthKR } from "@/lib/utils/date";

interface MonthlyStatsProps {
  showInactive: boolean;
}

export function MonthlyStatsView({ showInactive }: MonthlyStatsProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

  const currentMonth = getCurrentMonth();
  const isCurrentMonth = selectedMonth === currentMonth;

  const { month, monthDates, today, overallRate, spiritualRate, physicalRate, dailyRates, weekComparisons, items, loading } =
    useMonthlyStats(showInactive, selectedMonth);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setSelectedMonth((m) => prevMonth(m))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {isCurrentMonth ? `이번 달 · ${formatMonthKR(selectedMonth)}` : formatMonthKR(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth((m) => nextMonth(m))}
          disabled={isCurrentMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="다음 달"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface)] p-8 border border-[var(--border)] text-center text-gray-400">
          아직 항목이 없어요. 체크 탭에서 항목을 추가해보세요
        </div>
      ) : (
        <>
          <AchievementCard title={isCurrentMonth ? "이번 달 달성률" : "월간 달성률"} overallRate={overallRate} spiritualRate={spiritualRate} physicalRate={physicalRate} />
          <CalendarHeatmap month={month} dailyRates={dailyRates} today={today} />
          <WeeklyComparison data={weekComparisons} />
          <DailyTable items={items} monthDates={monthDates} today={today} />
        </>
      )}
    </div>
  );
}
