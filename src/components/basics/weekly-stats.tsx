"use client";

import { useWeeklyStats } from "@/lib/hooks/use-weekly-stats";
import { AchievementCard } from "./achievement-card";
import { CategoryLineChart } from "./category-line-chart";
import { CheckTable } from "./check-table";
import { getLogicalDate } from "@/lib/utils/date";

interface WeeklyStatsProps {
  dayStartTime: string;
  showInactive: boolean;
}

export function WeeklyStatsView({ dayStartTime, showInactive }: WeeklyStatsProps) {
  const { weekDates, overallRate, spiritualRate, physicalRate, items, loading } = useWeeklyStats(dayStartTime, showInactive);
  const today = getLogicalDate(dayStartTime);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
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

  const spiritual = items.filter((i) => i.template.category === "spiritual");
  const physical = items.filter((i) => i.template.category === "physical");

  return (
    <div className="space-y-4">
      <AchievementCard title="이번 주 달성률" overallRate={overallRate} spiritualRate={spiritualRate} physicalRate={physicalRate} />
      <CategoryLineChart title="영적" items={spiritual} weekDates={weekDates} today={today} />
      <CategoryLineChart title="신체적" items={physical} weekDates={weekDates} today={today} />
      <CheckTable items={items} weekDates={weekDates} today={today} />
    </div>
  );
}
