"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NecessityDetailModal } from "./necessity-detail-modal";
import { formatWon, calcPercent } from "@/lib/utils/format";
import type { FinanceBudget, FinanceTransaction, FinanceCategory } from "@/types/database";

interface NecessitiesTrackerProps {
  budgets: FinanceBudget[];
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  onAddTransaction?: (tx: {
    category_id: string;
    amount: number;
    description: string | null;
    date: string;
    type: "expense";
  }) => void;
}

function getBarColor(percent: number): string {
  if (percent > 100) return "bg-obligation-400";
  if (percent >= 80) return "bg-debt-400";
  return "bg-necessity-500";
}

function getLabelColor(percent: number): string {
  if (percent > 100) return "text-obligation-500";
  if (percent >= 80) return "text-debt-500 dark:text-debt-300";
  return "text-necessity-600 dark:text-necessity-300";
}

export function NecessitiesTracker({
  budgets,
  transactions,
  categories,
  onAddTransaction,
}: NecessitiesTrackerProps) {
  const [selected, setSelected] = useState<FinanceCategory | null>(null);

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
        생활비 카테고리가 없어요
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        {categories.map((cat) => {
          const budget = budgets.find((b) => b.category_id === cat.id);
          const budgetAmount = budget?.amount ?? 0;
          const spent = transactions
            .filter((t) => t.category_id === cat.id && t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
          const percent = calcPercent(spent, budgetAmount);
          const count = transactions.filter(
            (t) => t.category_id === cat.id && t.type === "expense"
          ).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelected(cat)}
              className="w-full text-left rounded-card bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 tap-press hover:shadow-card-hover transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-1 h-4 rounded-full bg-necessity-400 shrink-0"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {cat.title}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
                      · {count}건
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-semibold tabular-nums ${getLabelColor(percent)}`}
                    >
                      {percent}%
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </div>
                </div>
                <ProgressBar percent={percent} color={getBarColor(percent)} height="h-2" />
                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                  <span>지출 ₩{formatWon(spent)}</span>
                  <span>예산 ₩{formatWon(budgetAmount)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <NecessityDetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        category={selected}
        budgetAmount={
          selected
            ? budgets.find((b) => b.category_id === selected.id)?.amount ?? 0
            : 0
        }
        transactions={transactions}
        onAdd={(tx) => {
          onAddTransaction?.(tx);
        }}
      />
    </>
  );
}
