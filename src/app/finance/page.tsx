"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { useObligations } from "@/lib/hooks/use-obligations";
import { useFinance } from "@/lib/hooks/use-finance";
import { useDebts } from "@/lib/hooks/use-debts";
import { useWants } from "@/lib/hooks/use-wants";
import { getCurrentMonth } from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { NecessitiesTracker } from "@/components/finance/necessities-tracker";
import { WantsList } from "@/components/finance/wants-list";
import { SurplusTracker } from "@/components/finance/surplus-tracker";
import { Card } from "@/components/ui/card";
import type { FinanceCategory } from "@/types/database";

function SectionLink({
  href,
  label,
  summary,
}: {
  href: string;
  label: string;
  summary: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
        <span className="text-sm font-semibold text-warm-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-warm-400">{summary}</span>
          <span className="text-warm-300 text-sm">→</span>
        </div>
      </Card>
    </Link>
  );
}

export default function FinancePage() {
  const month = getCurrentMonth();

  const { monthlySow } = useHeavenBank(month);
  const { obligations } = useObligations(month);
  const { transactions, budgets, accounts, surplusGoal, surplusSaved } = useFinance(month);
  const { debts } = useDebts();
  const { wants, addWant, togglePurchased } = useWants();

  const [necessityCategories, setNecessityCategories] = useState<FinanceCategory[]>([]);

  useEffect(() => {
    async function fetchNecessityCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("type", "necessity")
        .order("sort_order");
      if (data) setNecessityCategories(data);
    }
    fetchNecessityCategories();
  }, []);

  const paidCount = obligations.filter((o) => o.is_paid).length;
  const totalObligations = obligations.length;
  const activeDebtCount = debts.filter((d) => !d.is_completed).length;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const [monthStr] = month.split("-");
  const monthNum = Number(month.split("-")[1]);
  const monthLabel = `${monthStr}년 ${monthNum}월`;

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 px-4 py-4">
        <h1 className="text-xl font-bold text-warm-700">재정 관리</h1>
        <p className="text-xs text-warm-400 mt-0.5">{monthLabel}</p>
      </div>

      <div className="p-4 space-y-4">

        {/* 1. 하늘은행 요약 */}
        <SectionLink
          href="/finance/heaven-bank"
          label="하늘 은행"
          summary={`이번 달 심은 것 ₩${formatWon(monthlySow)}`}
        />

        {/* 2. 의무사항 요약 */}
        <SectionLink
          href="/finance/obligations"
          label="의무 지출"
          summary={`${paidCount} / ${totalObligations} 납부 완료`}
        />

        {/* 3. 필요사항 (inline) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-warm-600 px-1">필요 사항</h2>
          </div>
          <NecessitiesTracker
            budgets={budgets}
            transactions={transactions}
            categories={necessityCategories}
          />
        </div>

        {/* 4. 요망사항 (inline) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-warm-600 px-1">요망 사항</h2>
          </div>
          <WantsList
            wants={wants}
            onAdd={addWant}
            onToggle={togglePurchased}
          />
        </div>

        {/* 5. 여윳돈 (inline) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-warm-600 px-1">여윳돈</h2>
          </div>
          <SurplusTracker goal={surplusGoal} saved={surplusSaved} />
        </div>

        {/* 6. 빚 관리 요약 */}
        <SectionLink
          href="/finance/debts"
          label="빚 관리"
          summary={`진행 중 ${activeDebtCount}건`}
        />

        {/* 7. 계좌 요약 */}
        <SectionLink
          href="/finance/accounts"
          label="계좌 관리"
          summary={`총 ₩${formatWon(totalBalance)}`}
        />
      </div>
    </div>
  );
}
