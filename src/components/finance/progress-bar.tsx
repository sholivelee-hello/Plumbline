"use client";

interface FinanceProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showPercent?: boolean;
  height?: "sm" | "md" | "lg";
}

const HEIGHT_MAP = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function FinanceProgressBar({
  value,
  max,
  color,
  showPercent = false,
  height = "md",
}: FinanceProgressBarProps) {
  const ratio = max > 0 ? value / max : 0;
  const percent = Math.min(ratio * 100, 100);

  let barColor: string;
  if (ratio >= 1.0) {
    barColor = "#DC2626";
  } else if (ratio >= 0.8) {
    barColor = "#F59E0B";
  } else {
    barColor = color ?? "#9CA3AF";
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${HEIGHT_MAP[height]}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
      {showPercent && (
        <span className="flex-shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400 w-8 text-right">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
