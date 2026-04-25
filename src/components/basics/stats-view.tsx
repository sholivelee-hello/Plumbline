"use client";

import { useState } from "react";
import { WeeklyStatsView } from "./weekly-stats";
import { MonthlyStatsView } from "./monthly-stats";

export function StatsView() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center rounded-lg bg-[var(--surface-muted)] p-0.5">
        <button
          onClick={() => setPeriod("weekly")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
            period === "weekly"
              ? "bg-[var(--surface)] text-gray-800 dark:text-gray-100 shadow-sm"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setPeriod("monthly")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
            period === "monthly"
              ? "bg-[var(--surface)] text-gray-800 dark:text-gray-100 shadow-sm"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          월간
        </button>
      </div>

      {period === "weekly" ? (
        <WeeklyStatsView showInactive={showInactive} />
      ) : (
        <MonthlyStatsView showInactive={showInactive} />
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
