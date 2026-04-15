interface DonutChartProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  valueLabel?: string;
  color?: string;
  trackColor?: string;
  className?: string;
}

export function DonutChart({
  percent,
  size = 120,
  strokeWidth = 12,
  label,
  valueLabel,
  color = "var(--primary, #7575d8)",
  trackColor = "var(--primary-light, #E0E0F5)",
  className = "",
}: DonutChartProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% 달성`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          className="opacity-70"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {valueLabel ?? `${clamped}%`}
        </span>
        {label && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
