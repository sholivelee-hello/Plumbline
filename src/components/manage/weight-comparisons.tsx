"use client";

import type { Comparison } from "@/lib/weight-utils";

interface Props {
  comparisons: {
    w1: Comparison;
    m1: Comparison;
    m3: Comparison;
    y1: Comparison;
  };
}

const CELLS: Array<{ key: keyof Props["comparisons"]; label: string }> = [
  { key: "w1", label: "1주 전 대비" },
  { key: "m1", label: "1달 전 대비" },
  { key: "m3", label: "3달 전 대비" },
  { key: "y1", label: "1년 전 대비" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, "0")} 기준`;
}

export function WeightComparisons({ comparisons }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CELLS.map(({ key, label }) => {
        const c = comparisons[key];
        const isEmpty = c.diffKg == null;
        const color = isEmpty
          ? "text-gray-400"
          : c.diffKg! < 0
          ? "text-blue-600 dark:text-blue-400"
          : c.diffKg! > 0
          ? "text-red-500 dark:text-red-400"
          : "text-gray-500";
        return (
          <div key={key} className="rounded-2xl p-4 bg-white dark:bg-[#1a2030] border border-gray-100 dark:border-[#2d3748]">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold tabular-nums ${color}`}>
              {isEmpty
                ? "—"
                : `${c.diffKg! > 0 ? "+" : ""}${c.diffKg!.toFixed(1)} kg`}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {isEmpty ? "기록 부족" : formatDate(c.refDate)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
