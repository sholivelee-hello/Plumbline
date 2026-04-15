interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: string;
}

export function ProgressBar({
  percent,
  color = "bg-primary-500",
  height = "h-2.5",
}: ProgressBarProps) {
  return (
    <div
      className={`w-full ${height} bg-gray-100 dark:bg-[#262c38] rounded-full overflow-hidden`}
      role="progressbar"
      aria-valuenow={Math.min(Math.max(percent, 0), 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${height} ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}
