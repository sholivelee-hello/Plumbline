"use client";

import { shiftMonth } from "@/lib/finance-utils";

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
  maxMonth?: string;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

export function MonthPicker({ month, onChange, maxMonth }: MonthPickerProps) {
  const canGoForward = !maxMonth || month < maxMonth;

  function goBack() {
    onChange(shiftMonth(month, -1));
  }

  function goForward() {
    if (canGoForward) {
      onChange(shiftMonth(month, 1));
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={goBack}
        aria-label="이전 달"
        className="w-11 h-11 flex items-center justify-center rounded-xl
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-[#262c38]
          active:scale-[0.95] transition-transform"
      >
        ◀
      </button>

      <span className="text-base font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
        {formatMonthLabel(month)}
      </span>

      <button
        type="button"
        onClick={goForward}
        disabled={!canGoForward}
        aria-label="다음 달"
        className="w-11 h-11 flex items-center justify-center rounded-xl
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-[#262c38]
          active:scale-[0.95] transition-transform
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶
      </button>
    </div>
  );
}
