"use client";

import Link from "next/link";
import { useBasics } from "@/lib/hooks/use-basics";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calcPercent } from "@/lib/utils/format";
import { SkeletonCard } from "@/components/ui/skeleton";

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
    return <SkeletonCard />;
  }

  return (
    <Link href="/basics" className="block h-full">
      <Card className="h-full min-h-[220px] flex flex-col hover:shadow-card-hover transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            오늘의 베이직
          </h2>
          <span className="text-sm font-medium text-primary-500 dark:text-primary-300 tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
        <ProgressBar percent={percent} color="bg-primary-500" />
        <div className="mt-3 space-y-3 flex-1">
          {spiritualItems.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">영적</p>
              <ul className="space-y-1">
                {spiritualItems.map((t) => {
                  const log = logsByTemplateId.get(t.id);
                  const done = log?.completed ?? false;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={
                          done
                            ? "text-primary-600 dark:text-primary-300"
                            : "text-gray-200 dark:text-gray-600"
                        }
                      >
                        {done ? "✓" : "○"}
                      </span>
                      <span
                        className={
                          done
                            ? "text-gray-500 dark:text-gray-500 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }
                      >
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
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">신체</p>
              <ul className="space-y-1">
                {physicalItems.map((t) => {
                  const log = logsByTemplateId.get(t.id);
                  const done = log?.completed ?? false;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={
                          done
                            ? "text-primary-600 dark:text-primary-300"
                            : "text-gray-200 dark:text-gray-600"
                        }
                      >
                        {done ? "✓" : "○"}
                      </span>
                      <span
                        className={
                          done
                            ? "text-gray-500 dark:text-gray-500 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }
                      >
                        {t.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {totalCount === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              베이직 항목이 없습니다
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
