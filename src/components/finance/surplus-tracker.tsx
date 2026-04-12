import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatWon, calcPercent } from "@/lib/utils/format";

interface SurplusTrackerProps {
  goal: number;
  saved: number;
}

export function SurplusTracker({ goal, saved }: SurplusTrackerProps) {
  const percent = calcPercent(saved, goal);

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-warm-700">여윳돈 모으기</h3>
          <span className="text-xs font-semibold text-sage-500 tabular-nums">
            {percent}%
          </span>
        </div>

        <ProgressBar percent={percent} color="bg-sage-300" />

        <div className="flex items-center justify-between text-xs text-warm-400 tabular-nums">
          <span>모은 금액 ₩{formatWon(saved)}</span>
          <span>목표 ₩{formatWon(goal)}</span>
        </div>
      </div>
    </Card>
  );
}
