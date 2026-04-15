"use client";

import { useSettings } from "@/lib/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/theme-provider";
import { Moon, Sun } from "lucide-react";
import type { ScheduleTimeUnit } from "@/types/database";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

const TIME_UNITS: { label: string; value: ScheduleTimeUnit }[] = [
  { label: "10분", value: 10 },
  { label: "15분", value: 15 },
  { label: "30분", value: 30 },
  { label: "1시간", value: 60 },
];

export default function SettingsPage() {
  const { settings, update, loading } = useSettings();
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (loading || !settings) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <PageHeader title="설정" backHref="/" />
      <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                테마
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {isDark ? "다크 모드" : "라이트 모드"}
              </p>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 dark:bg-[#2a2e45] transition-colors tap-press"
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#161a22] shadow transition-transform ${
                  isDark ? "translate-x-7" : "translate-x-1"
                }`}
              >
                {isDark ? (
                  <Moon size={12} className="text-primary-300" />
                ) : (
                  <Sun size={12} className="text-primary-500" />
                )}
              </span>
            </button>
          </div>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            하루 시작 시간
          </label>
          <select
            className="w-full border border-gray-200 dark:border-[#262c38] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1f242e] focus:outline-none focus:ring-2 focus:ring-primary-300"
            value={settings.day_start_time}
            onChange={(e) => update({ day_start_time: e.target.value })}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            하루 종료 시간
          </label>
          <select
            className="w-full border border-gray-200 dark:border-[#262c38] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1f242e] focus:outline-none focus:ring-2 focus:ring-primary-300"
            value={settings.day_end_time}
            onChange={(e) => update({ day_end_time: e.target.value })}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            시간 단위
          </p>
          <div className="flex gap-2">
            {TIME_UNITS.map(({ label, value }) => (
              <button
                key={value}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors tap-press ${
                  settings.time_unit === value
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-gray-50 dark:bg-[#1f242e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#262c38] hover:bg-gray-100 dark:hover:bg-[#262c38]"
                }`}
                onClick={() => update({ time_unit: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            월급일
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={31}
              value={settings.salary_day ?? 25}
              onChange={(e) =>
                update({ salary_day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
              }
              className="w-20 border border-gray-200 dark:border-[#262c38] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1f242e] focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">일</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            예산 사이클을 이 날짜를 기준으로 계산해요.
          </p>
        </Card>
      </div>
    </div>
  );
}
