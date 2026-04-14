"use client";

import { DailyRate } from "@/lib/hooks/use-monthly-stats";
import { formatMonthKR } from "@/lib/utils/date";

interface CalendarHeatmapProps {
  month: string;
  dailyRates: DailyRate[];
  today: string;
}

function getRateColor(rate: number): string {
  if (rate === 0) return "bg-gray-100 dark:bg-gray-800";
  if (rate <= 25) return "bg-primary-500/20";
  if (rate <= 50) return "bg-primary-500/40";
  if (rate <= 75) return "bg-primary-500/60";
  return "bg-primary-500/90";
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function CalendarHeatmap({ month, dailyRates, today }: CalendarHeatmapProps) {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday-based

  const rateMap = new Map(dailyRates.map((d) => [d.date, d.rate]));

  const cells: Array<{ date: string | null; day: number | null; rate: number | null; isFuture: boolean }> = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ date: null, day: null, rate: null, isFuture: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ date: dateStr, day: d, rate: rateMap.get(dateStr) ?? null, isFuture: dateStr > today });
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{formatMonthKR(month)} 달성 히트맵</p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => (
          <div key={idx} className={`aspect-square rounded-md flex items-center justify-center text-xs transition-colors ${
            cell.date === null ? ""
            : cell.isFuture ? "bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-600"
            : cell.rate !== null ? `${getRateColor(cell.rate)} text-gray-700 dark:text-gray-200`
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
          } ${cell.date === today ? "ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-900" : ""}`}
          title={cell.date && cell.rate !== null ? `${cell.date}: ${Math.round(cell.rate)}%` : undefined}>
            {cell.day}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-gray-400">
        <span>낮음</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/20" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/40" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/60" />
        <div className="w-3 h-3 rounded-sm bg-primary-500/90" />
        <span>높음</span>
      </div>
    </div>
  );
}
