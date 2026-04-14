"use client";

import { useMonthlyStats } from "@/lib/hooks/use-monthly-stats";
import { AchievementCard } from "./achievement-card";
import { CalendarHeatmap } from "./calendar-heatmap";
import { WeeklyComparison } from "./weekly-comparison";
import { DailyTable } from "./daily-table";

interface MonthlyStatsProps {
  dayStartTime: string;
  showInactive: boolean;
}

export function MonthlyStatsView({ dayStartTime, showInactive }: MonthlyStatsProps) {
  const { month, monthDates, today, overallRate, spiritualRate, physicalRate, dailyRates, weekComparisons, items, loading } = useMonthlyStats(dayStartTime, showInactive);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] p-8 border border-[var(--border)] text-center text-gray-400">
        아직 항목이 없어요. 체크 탭에서 항목을 추가해보세요
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AchievementCard title="이번 달 달성률" overallRate={overallRate} spiritualRate={spiritualRate} physicalRate={physicalRate} />
      <CalendarHeatmap month={month} dailyRates={dailyRates} today={today} />
      <WeeklyComparison data={weekComparisons} />
      <DailyTable items={items} monthDates={monthDates} today={today} />
    </div>
  );
}
