"use client";

import Link from "next/link";
import { useBasics } from "@/lib/hooks/use-basics";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calcPercent } from "@/lib/utils/format";

interface BasicsSummaryProps {
  dayStartTime?: string;
}

export function BasicsSummary({ dayStartTime }: BasicsSummaryProps) {
  const { templates, logs, loading } = useBasics(dayStartTime);

  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = templates.length;
  const percent = calcPercent(completedCount, totalCount);

  const logsByTemplateId = new Map(logs.map((l) => [l.template_id, l]));

  const spiritualItems = templates.filter((t) => t.category === "spiritual");
  const physicalItems = templates.filter((t) => t.category === "physical");

  if (loading) {
    return (
      <Card>
        <p className="text-warm-400 text-sm">불러오는 중...</p>
      </Card>
    );
  }

  return (
    <Link href="/basics">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-warm-700">오늘의 베이직</h2>
          <span className="text-sm font-medium text-warm-500">
            {completedCount}/{totalCount}
          </span>
        </div>
        <ProgressBar percent={percent} color="bg-sage-300" />
        <div className="mt-3 space-y-3">
          {spiritualItems.length > 0 && (
            <div>
              <p className="text-xs text-warm-400 mb-1">영적</p>
              <ul className="space-y-1">
                {spiritualItems.map((t) => {
                  const log = logsByTemplateId.get(t.id);
                  const done = log?.completed ?? false;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span className={done ? "text-sage-400" : "text-warm-200"}>
                        {done ? "✓" : "○"}
                      </span>
                      <span className={done ? "text-warm-600 line-through" : "text-warm-700"}>
                        {t.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {physicalItems.length > 0 && (
            <div>
              <p className="text-xs text-warm-400 mb-1">신체</p>
              <ul className="space-y-1">
                {physicalItems.map((t) => {
                  const log = logsByTemplateId.get(t.id);
                  const done = log?.completed ?? false;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span className={done ? "text-sage-400" : "text-warm-200"}>
                        {done ? "✓" : "○"}
                      </span>
                      <span className={done ? "text-warm-600 line-through" : "text-warm-700"}>
                        {t.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {totalCount === 0 && (
            <p className="text-sm text-warm-400">베이직 항목이 없습니다</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
