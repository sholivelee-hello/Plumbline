"use client";

import { useBasicsStats } from "@/lib/hooks/use-basics-stats";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export function BasicsStats() {
  const { stats, loading } = useBasicsStats();

  if (loading) return <p className="text-gray-400 dark:text-gray-500 text-center text-sm">통계 로딩 중...</p>;

  const spiritual = stats.filter((s) => s.category === "spiritual");
  const physical = stats.filter((s) => s.category === "physical");
  const avgWeekly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.weeklyRate, 0) / stats.length)
    : 0;
  const avgMonthly = stats.length > 0
    ? Math.round(stats.reduce((a, s) => a + s.monthlyRate, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">달성률</h3>
        <div className="flex gap-4 mb-3">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgWeekly}%</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">주간</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgMonthly}%</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">월간</p>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
              <span>영적</span>
              <span>{spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0}%</span>
            </div>
            <ProgressBar percent={spiritual.length > 0 ? Math.round(spiritual.reduce((a, s) => a + s.weeklyRate, 0) / spiritual.length) : 0} color="bg-primary-300" />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
              <span>신체적</span>
              <span>{physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0}%</span>
            </div>
            <ProgressBar percent={physical.length > 0 ? Math.round(physical.reduce((a, s) => a + s.weeklyRate, 0) / physical.length) : 0} color="bg-primary-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}
