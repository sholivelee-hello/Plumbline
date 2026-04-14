"use client";

import { useState } from "react";
import { WeeklyStatsView } from "./weekly-stats";
import { MonthlyStatsView } from "./monthly-stats";

interface StatsViewProps {
  dayStartTime: string;
}

export function StatsView({ dayStartTime }: StatsViewProps) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod("weekly")}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            period === "weekly" ? "bg-primary-500 text-white" : "bg-[var(--surface-muted)] text-gray-500 dark:text-gray-400"
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setPeriod("monthly")}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            period === "monthly" ? "bg-primary-500 text-white" : "bg-[var(--surface-muted)] text-gray-500 dark:text-gray-400"
          }`}
        >
          월간
        </button>
      </div>

      {period === "weekly" ? (
        <WeeklyStatsView dayStartTime={dayStartTime} showInactive={showInactive} />
      ) : (
        <MonthlyStatsView dayStartTime={dayStartTime} showInactive={showInactive} />
      )}

      <button
        onClick={() => setShowInactive(!showInactive)}
        className="w-full text-center text-xs text-gray-400 dark:text-gray-500 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {showInactive ? "삭제된 항목 숨기기" : "삭제된 항목 보기"}
      </button>
    </div>
  );
}
