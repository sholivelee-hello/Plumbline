"use client";

import Link from "next/link";
import { useFinanceHub } from "@/lib/hooks/use-finance-hub";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { formatWon } from "@/lib/utils/format";
import { getCurrentMonth } from "@/lib/utils/date";

export function FinanceSummary() {
  const month = getCurrentMonth();
  const { groupCards, summary, loading } = useFinanceHub(month);

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <Link href="/finance" className="block">
      <Card className="hover:shadow-card-hover transition-shadow">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          이번 달 재정
        </h2>
        <ul className="space-y-2.5">
          {groupCards.map((g) => (
            <li key={g.groupId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: g.color }}
                    aria-hidden
                  />
                  <span className="text-gray-600 dark:text-gray-400 truncate">
                    {g.title}
                  </span>
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                  ₩{formatWon(g.actual)}
                  {g.budget > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                      / ₩{formatWon(g.budget)}
                    </span>
                  )}
                </span>
              </div>
              {g.budget > 0 && (
                <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(g.percent, 100)}%`,
                      backgroundColor: g.color,
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        {summary.income > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>수입 ₩{formatWon(summary.income)}</span>
            <span>잔액 ₩{formatWon(summary.balance)}</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
