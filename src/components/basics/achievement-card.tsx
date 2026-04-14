"use client";

import { ProgressBar } from "@/components/ui/progress-bar";

interface AchievementCardProps {
  title: string; // "이번 주 달성률" or "이번 달 달성률"
  overallRate: number;
  spiritualRate: number;
  physicalRate: number;
}

export function AchievementCard({ title, overallRate, spiritualRate, physicalRate }: AchievementCardProps) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-4xl font-bold text-primary-500">
        {Math.round(overallRate)}%
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">영적</span>
            <span className="text-gray-500">{Math.round(spiritualRate)}%</span>
          </div>
          <ProgressBar percent={spiritualRate} color="bg-primary-300" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">신체적</span>
            <span className="text-gray-500">{Math.round(physicalRate)}%</span>
          </div>
          <ProgressBar percent={physicalRate} color="bg-primary-500" />
        </div>
      </div>
    </div>
  );
}
