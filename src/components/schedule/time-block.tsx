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
      className="absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden text-xs leading-tight"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: block.color + "40",
        borderLeft: `3px solid ${block.color}`,
      }}
    >
      <p className="font-medium truncate" style={{ color: block.color }}>
        {block.title}
      </p>
      {height > 30 && (
        <p className="opacity-60" style={{ color: block.color, fontSize: "10px" }}>
          {formatTime(block.start_time)}-{formatTime(block.end_time)}
        </p>
      )}
    </div>
  );
}
