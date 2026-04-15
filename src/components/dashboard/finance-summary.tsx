"use client";

import Link from "next/link";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { useObligations } from "@/lib/hooks/use-obligations";
import { useFinance } from "@/lib/hooks/use-finance";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { formatWon, calcPercent } from "@/lib/utils/format";
import { getCurrentMonth } from "@/lib/utils/date";

export function FinanceSummary() {
  const month = getCurrentMonth();
  const { monthlySow, loading: heavenLoading } = useHeavenBank(month);
  const { obligations, loading: obligationsLoading } = useObligations(month);
  const { transactions, budgets, surplusSaved, surplusGoal, loading: financeLoading } =
    useFinance(month);

  const loading = heavenLoading || obligationsLoading || financeLoading;

  if (loading) {
    return <SkeletonCard />;
  }

  const paidObligations = obligations.filter((o) => o.is_paid).length;
  const totalObligations = obligations.length;

  const necessityBudgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
  const necessitySpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const necessityPercent = calcPercent(necessitySpent, necessityBudgetTotal);

  const rows: {
    label: string;
    value: string;
    hint?: string;
    accent: string;
  }[] = [
    {
      label: "하늘은행 심은 금액",
      value: `₩${formatWon(monthlySow)}`,
      accent: "bg-heaven-400",
    },
    {
      label: "의무지출 납부",
      value: `${paidObligations}/${totalObligations}건`,
      accent: "bg-obligation-400",
    },
    {
      label: "생활비 사용",
      value: `₩${formatWon(necessitySpent)}`,
      hint: necessityBudgetTotal > 0 ? `${necessityPercent}%` : undefined,
      accent: "bg-necessity-400",
    },
    {
      label: "여윳돈 저축",
      value: `₩${formatWon(surplusSaved)}`,
      hint: surplusGoal > 0 ? `/ ₩${formatWon(surplusGoal)}` : undefined,
      accent: "bg-surplus-400",
    },
  ];

  return (
    <Link href="/finance" className="block">
      <Card className="hover:shadow-card-hover transition-shadow">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          이번 달 재정
        </h2>
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full ${row.accent} shrink-0`} aria-hidden />
                <span className="text-gray-600 dark:text-gray-400 truncate">
                  {row.label}
                </span>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                {row.value}
                {row.hint && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                    {row.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  );
}
