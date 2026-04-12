import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BasicsItem } from "./basics-item";
import { calcPercent } from "@/lib/utils/format";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsListProps {
  templates: BasicsTemplate[];
  logs: BasicsLog[];
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

export function BasicsList({ templates, logs, onToggle, onUpdateValue }: BasicsListProps) {
  const spiritual = templates.filter((t) => t.category === "spiritual");
  const physical = templates.filter((t) => t.category === "physical");
  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = templates.length;
  const percent = calcPercent(completedCount, totalCount);

  function getLog(templateId: string) {
    return logs.find((l) => l.template_id === templateId);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-warm-500 text-sm">오늘 달성률</span>
          <span className="text-warm-600 font-semibold">{completedCount}/{totalCount}</span>
        </div>
        <ProgressBar percent={percent} />
        <p className="text-right text-sm text-warm-400 mt-1">{percent}%</p>
      </Card>

      {spiritual.length > 0 && (
        <Card>
          <h3 className="text-warm-600 font-semibold mb-3">
            📖 영적 베이직
            <span className="text-warm-400 font-normal text-sm ml-2">
              {spiritual.filter((t) => getLog(t.id)?.completed).length}/{spiritual.length}
            </span>
          </h3>
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
        </Card>
      )}

      {physical.length > 0 && (
        <Card>
          <h3 className="text-warm-600 font-semibold mb-3">
            💪 신체적 베이직
            <span className="text-warm-400 font-normal text-sm ml-2">
              {physical.filter((t) => getLog(t.id)?.completed).length}/{physical.length}
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
