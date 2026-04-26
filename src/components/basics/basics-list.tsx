"use client";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { BasicsItem } from "./basics-item";
import { MeditationCard } from "./meditation-card";
import { BibleReadingCard } from "./bible-reading-card";
import type { UseMeditationReturn } from "@/lib/hooks/use-meditation";
import type { UseBibleReadingReturn } from "@/lib/hooks/use-bible-reading";
import { calcPercent } from "@/lib/utils/format";
import { BookOpen } from "lucide-react";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsListProps {
  templates: BasicsTemplate[];
  logs: BasicsLog[];
  meditation: UseMeditationReturn;
  reading: UseBibleReadingReturn;
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

export function BasicsList({
  templates,
  logs,
  meditation,
  reading,
  onToggle,
  onUpdateValue,
}: BasicsListProps) {
  const meditationActive = meditation.hasStartDate && !meditation.isFuture;
  const readingActive = reading.hasStartDate && !reading.isFuture;
  const meditationDone = meditationActive && meditation.completed;
  const readingDone =
    readingActive && reading.total > 0 && reading.checkedCount === reading.total;

  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");
  const baseCompleted = logs.filter((l) => l.completed).length;
  const spiritualBaseDone = spiritual.filter(
    (t) => logs.find((l) => l.template_id === t.id)?.completed,
  ).length;

  const extraSpiritualTotal =
    (meditationActive ? 1 : 0) + (readingActive ? 1 : 0);
  const extraSpiritualDone =
    (meditationDone ? 1 : 0) + (readingDone ? 1 : 0);

  const completedCount = baseCompleted + extraSpiritualDone;
  const totalCount = templates.length + extraSpiritualTotal;
  const percent = calcPercent(completedCount, totalCount);

  const spiritualTotal = spiritual.length + extraSpiritualTotal;
  const spiritualDone = spiritualBaseDone + extraSpiritualDone;

  function getLog(templateId: string) {
    return logs.find((l) => l.template_id === templateId);
  }

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={32} strokeWidth={1.5} />}
        title="아직 베이직이 없어요"
        description="하루의 기준이 되는 루틴을 설정에서 추가해 보세요"
      />
    );
  }

  const showSpiritualSection = spiritual.length > 0 || extraSpiritualTotal > 0;
  const showSpiritualEmpty =
    spiritual.length === 0 &&
    !meditation.hasStartDate &&
    !reading.hasStartDate;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            오늘 달성률
          </span>
          <span className="text-gray-800 dark:text-gray-100 font-semibold tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
        <ProgressBar percent={percent} />
        <p className="text-right text-sm text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
          {percent}%
        </p>
      </Card>

      {showSpiritualSection && (
        <Card>
          <h3 className="text-gray-700 dark:text-gray-200 font-semibold mb-3">
            📖 영적 베이직
            <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-2 tabular-nums">
              {spiritualDone}/{spiritualTotal}
            </span>
          </h3>
          <div className="space-y-3">
            {(meditation.hasStartDate || !showSpiritualEmpty) && (
              <div className="rounded-xl bg-gray-50/60 dark:bg-[#1a1f29]/60 p-3 border border-gray-100 dark:border-[#262c38]">
                <MeditationCard meditation={meditation} embedded />
              </div>
            )}
            {(reading.hasStartDate || !showSpiritualEmpty) && (
              <div className="rounded-xl bg-gray-50/60 dark:bg-[#1a1f29]/60 p-3 border border-gray-100 dark:border-[#262c38]">
                <BibleReadingCard reading={reading} embedded />
              </div>
            )}
            {spiritual.length > 0 && (
              <div className="space-y-2">
                {spiritual.map((t) => (
                  <BasicsItem
                    key={t.id}
                    template={t}
                    log={getLog(t.id)}
                    onToggle={onToggle}
                    onUpdateValue={onUpdateValue}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {physical.length > 0 && (
        <Card>
          <h3 className="text-gray-700 dark:text-gray-200 font-semibold mb-3">
            💪 신체적 베이직
            <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-2 tabular-nums">
              {physical.filter((t) => getLog(t.id)?.completed).length}/
              {physical.length}
            </span>
          </h3>
          <div className="space-y-2">
            {physical.map((t) => (
              <BasicsItem
                key={t.id}
                template={t}
                log={getLog(t.id)}
                onToggle={onToggle}
                onUpdateValue={onUpdateValue}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
