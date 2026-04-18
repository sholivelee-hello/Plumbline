"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWeeklyStats } from "@/lib/hooks/use-weekly-stats";
import { AchievementCard } from "./achievement-card";
import { CategoryLineChart } from "./category-line-chart";
import { CheckTable } from "./check-table";
import { getLogicalDate, getWeekStart, getWeekDates, toLocalDateString } from "@/lib/utils/date";

interface WeeklyStatsProps {
  dayStartTime: string;
  showInactive: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

function formatWeekRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[6] + "T00:00:00");
  const fm = first.getMonth() + 1;
  const fd = first.getDate();
  const lm = last.getMonth() + 1;
  const ld = last.getDate();
  if (fm === lm) return `${fm}월 ${fd}일 – ${ld}일`;
  return `${fm}/${fd} – ${lm}/${ld}`;
}

export function WeeklyStatsView({ dayStartTime, showInactive }: WeeklyStatsProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const todayBase = getLogicalDate(dayStartTime);
  const referenceDate = addDays(todayBase, weekOffset * 7);

  const { weekDates, overallRate, spiritualRate, physicalRate, items, loading } =
    useWeeklyStats(dayStartTime, showInactive, referenceDate);

  const today = getLogicalDate(dayStartTime);
  const isCurrentWeek = weekOffset === 0;
  const weekLabel = weekDates.length > 0 ? formatWeekRange(weekDates) : "";

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          aria-label="이전 주"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {isCurrentWeek ? `이번 주 · ${weekLabel}` : weekLabel}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={isCurrentWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="다음 주"
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
          <AchievementCard title={isCurrentWeek ? "이번 주 달성률" : "주간 달성률"} overallRate={overallRate} spiritualRate={spiritualRate} physicalRate={physicalRate} />
          {(() => {
            const spiritual = items.filter((i) => i.template.category === "spiritual");
            const physical = items.filter((i) => i.template.category === "physical");
            return (
              <>
                <CategoryLineChart title="영적" items={spiritual} weekDates={weekDates} today={today} />
                <CategoryLineChart title="신체적" items={physical} weekDates={weekDates} today={today} />
                <CheckTable items={items} weekDates={weekDates} today={today} />
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
