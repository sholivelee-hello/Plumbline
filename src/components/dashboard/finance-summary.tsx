"use client";

import Link from "next/link";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { useObligations } from "@/lib/hooks/use-obligations";
import { useFinance } from "@/lib/hooks/use-finance";
import { Card } from "@/components/ui/card";
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
    return (
      <Card>
        <p className="text-warm-400 text-sm">불러오는 중...</p>
      </Card>
    );
  }

  const paidObligations = obligations.filter((o) => o.is_paid).length;
  const totalObligations = obligations.length;

  // Necessities: expense transactions in necessity categories
  const necessityBudgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
  const necessitySpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const necessityPercent = calcPercent(necessitySpent, necessityBudgetTotal);

  return (
    <Link href="/finance">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <h2 className="text-base font-semibold text-warm-700 mb-3">이번 달 재정</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-warm-500">천국은행 심은 금액</span>
            <span className="font-medium text-warm-700">₩{formatWon(monthlySow)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-500">고정지출 납부</span>
            <span className="font-medium text-warm-700">
              {paidObligations}/{totalObligations}건
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-500">생활비 사용</span>
            <span className="font-medium text-warm-700">
              ₩{formatWon(necessitySpent)}
              {necessityBudgetTotal > 0 && (
                <span className="text-warm-400 font-normal ml-1">
                  ({necessityPercent}%)
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-warm-500">잉여금 저축</span>
            <span className="font-medium text-warm-700">
              ₩{formatWon(surplusSaved)}
              {surplusGoal > 0 && (
                <span className="text-warm-400 font-normal ml-1">
                  / ₩{formatWon(surplusGoal)}
                </span>
              )}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
