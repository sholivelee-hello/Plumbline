interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: string;
}

export function ProgressBar({
  percent,
  color = "bg-sage-300",
  height = "h-2.5",
}: ProgressBarProps) {
  return (
    <div className={`w-full ${height} bg-warm-100 rounded-full overflow-hidden`}>
      <div
        className={`${height} ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
