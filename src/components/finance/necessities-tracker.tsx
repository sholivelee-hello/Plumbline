"use client";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatWon, calcPercent } from "@/lib/utils/format";
import type { FinanceBudget, FinanceTransaction, FinanceCategory } from "@/types/database";

interface NecessitiesTrackerProps {
  budgets: FinanceBudget[];
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
}

function getBarColor(percent: number): string {
  if (percent > 100) return "bg-rose-400";
  if (percent >= 80) return "bg-warm-400";
  return "bg-sage-300";
}

function getLabelColor(percent: number): string {
  if (percent > 100) return "text-rose-500";
  if (percent >= 80) return "text-warm-500";
  return "text-sage-500";
}

export function NecessitiesTracker({
  budgets,
  transactions,
  categories,
}: NecessitiesTrackerProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-warm-400 text-sm">
        필요사항 카테고리가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const budget = budgets.find((b) => b.category_id === cat.id);
        const budgetAmount = budget?.amount ?? 0;
        const spent = transactions
          .filter((t) => t.category_id === cat.id && t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);
        const percent = calcPercent(spent, budgetAmount);

        return (
          <Card key={cat.id}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-warm-700">
                  {cat.title}
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums ${getLabelColor(percent)}`}
                >
                  {percent}%
                </span>
              </div>
              <ProgressBar
                percent={percent}
                color={getBarColor(percent)}
              />
              <div className="flex items-center justify-between text-xs text-warm-400 tabular-nums">
                <span>지출 ₩{formatWon(spent)}</span>
                <span>예산 ₩{formatWon(budgetAmount)}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
