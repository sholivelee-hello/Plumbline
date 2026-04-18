"use client";

import type { WeightEntry } from "@/types/database";

interface Props {
  entries: WeightEntry[];
  onTap: (entry: WeightEntry) => void;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, "0")} (${DOW[d.getDay()]})`;
}

export function WeightLogList({ entries, onTap }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        📅 기록
      </p>
      <ul className="rounded-2xl overflow-hidden bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748] divide-y divide-gray-100 dark:divide-[#2d3748]">
        {entries.map((e, i) => {
          const next = entries[i + 1];
          const diff = next ? Math.round((e.weight_kg - next.weight_kg) * 10) / 10 : null;
          const diffColor =
            diff == null
              ? "text-gray-400"
              : diff < 0
              ? "text-blue-600 dark:text-blue-400"
              : diff > 0
              ? "text-red-500 dark:text-red-400"
              : "text-gray-400";
          const diffLabel =
            diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}${diff < 0 ? "↓" : diff > 0 ? "↑" : ""}`;
          return (
            <li key={e.id}>
              <button
                onClick={() => onTap(e)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#262c38] transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                  {formatDate(e.weighed_on)}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {e.weight_kg.toFixed(1)} kg
                </span>
                <span className={`text-xs font-medium tabular-nums ${diffColor} w-16 text-right`}>
                  {diffLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
