import type { SchedulePlan, ScheduleActual } from "@/types/database";
import { formatTime } from "@/lib/utils/format";

interface TimeBlockProps {
  block: SchedulePlan | ScheduleActual;
  timeUnit: number;
  dayStartTime: string;
  onClick: () => void;
}

export function TimeBlock({ block, timeUnit, dayStartTime, onClick }: TimeBlockProps) {
  const [startH, startM] = block.start_time.split(":").map(Number);
  const [endH, endM] = block.end_time.split(":").map(Number);
  const [dayH, dayM] = dayStartTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM - (dayH * 60 + dayM);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const pixelsPerMinute = 48 / timeUnit;

  const top = startMinutes * pixelsPerMinute;
  const height = Math.max(durationMinutes * pixelsPerMinute, 20);

  return (
    <div
      onClick={onClick}
      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden text-xs leading-tight bg-primary-50 dark:bg-[#2a2e45] border-l-[3px] border-primary-500"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <p className="font-medium truncate text-primary-600 dark:text-primary-200">
        {block.title}
      </p>
      {height > 30 && (
        <p className="text-primary-400 dark:text-primary-300 opacity-60" style={{ fontSize: "10px" }}>
          {formatTime(block.start_time)}-{formatTime(block.end_time)}
        </p>
      )}
    </div>
  );
}
