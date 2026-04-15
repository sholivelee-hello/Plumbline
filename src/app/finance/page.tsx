"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { useObligations } from "@/lib/hooks/use-obligations";
import { useFinance } from "@/lib/hooks/use-finance";
import { useDebts } from "@/lib/hooks/use-debts";
import { useInstallments } from "@/lib/hooks/use-installments";
import { useWants } from "@/lib/hooks/use-wants";
import { getCurrentMonth } from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { demoNecessityCategories } from "@/lib/demo-data";
import { FINANCE_SECTIONS, type FinanceSectionId } from "@/lib/finance-sections";
import { NecessitiesTracker } from "@/components/finance/necessities-tracker";
import { WantsList } from "@/components/finance/wants-list";
import { SurplusTracker } from "@/components/finance/surplus-tracker";
import { PageHeader } from "@/components/ui/page-header";
import type { FinanceCategory } from "@/types/database";

function SectionHeader({
  sectionId,
  rightSlot,
  href,
}: {
  sectionId: FinanceSectionId;
  rightSlot?: React.ReactNode;
  href?: string;
}) {
  const section = FINANCE_SECTIONS[sectionId];
  const Icon = section.icon;

  const content = (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.iconBg}`}
        >
          <Icon size={16} className={section.iconColor} strokeWidth={2} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {section.label}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {section.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {rightSlot}
        {href && (
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

function LinkRow({
  sectionId,
  href,
  summary,
}: {
  sectionId: FinanceSectionId;
  href: string;
  summary: string;
}) {
  const section = FINANCE_SECTIONS[sectionId];
  const Icon = section.icon;
  return (
    <Link
      href={href}
      className="block rounded-card bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] shadow-card p-4 hover:shadow-card-hover transition-all tap-press"
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.iconBg}`}
        >
          <Icon size={18} className={section.iconColor} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {section.label}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {summary}
          </p>
        </div>
        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
      </div>
    </Link>
  );
}

export default function FinancePage() {
  const month = getCurrentMonth();

  const { monthlySow } = useHeavenBank(month);
  const { obligations } = useObligations(month);
  const { transactions, budgets, surplusGoal, surplusSaved, addTransaction } =
    useFinance(month);
  const { debts } = useDebts();
  const { installments } = useInstallments();
  const { wants, addWant, togglePurchased } = useWants();

  const [necessityCategories, setNecessityCategories] = useState<FinanceCategory[]>([]);

  useEffect(() => {
    async function fetchNecessityCategories() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("finance_categories")
          .select("*")
          .eq("type", "necessity")
          .order("sort_order");
        if (data && data.length > 0) {
          setNecessityCategories(data);
        } else {
          setNecessityCategories(demoNecessityCategories);
        }
      } catch {
        setNecessityCategories(demoNecessityCategories);
      }
    }
    fetchNecessityCategories();
  }, []);

  const paidCount = obligations.filter((o) => o.is_paid).length;
  const totalObligations = obligations.length;
  const activeDebtCount = debts.filter((d) => !d.is_completed).length;
  const activeInstallmentCount = installments.filter((i) => !i.is_completed).length;

  const [yearStr] = month.split("-");
  const monthNum = Number(month.split("-")[1]);
  const monthLabel = `${yearStr}년 ${monthNum}월`;

  return (
    <div className="min-h-screen pb-32 lg:pb-8 bg-gray-50/50 dark:bg-[#0b0d12]">
      <PageHeader title="재정 관리" subtitle={monthLabel} contentMaxWidth="max-w-5xl" />

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-5 lg:space-y-6">
        {/* 1. 하늘은행 */}
        <section className="space-y-2">
          <LinkRow
            sectionId="heaven"
            href="/finance/heaven-bank"
            summary={`이번 달 심은 것 ₩${formatWon(monthlySow)}`}
          />
        </section>

        {/* 2. 의무지출 */}
        <section className="space-y-2">
          <LinkRow
            sectionId="obligation"
            href="/finance/obligations"
            summary={`${paidCount} / ${totalObligations} 납부 완료`}
          />
        </section>

        {/* 3. 생활비 (drill-down) */}
        <section className="space-y-2">
          <SectionHeader sectionId="necessity" />
          <NecessitiesTracker
            budgets={budgets}
            transactions={transactions}
            categories={necessityCategories}
            onAddTransaction={addTransaction}
          />
        </section>

        {/* 4. 요망사항 */}
        <section className="space-y-2">
          <SectionHeader sectionId="want" />
          <WantsList wants={wants} onAdd={addWant} onToggle={togglePurchased} />
        </section>

        {/* 5. 여윳돈 */}
        <section className="space-y-2">
          <SectionHeader sectionId="surplus" />
          <SurplusTracker goal={surplusGoal} saved={surplusSaved} />
        </section>

        {/* 6. 할부 · 빚 */}
        <section className="space-y-2">
          <SectionHeader sectionId="debt" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LinkRow
              sectionId="debt"
              href="/finance/installments"
              summary={`할부 진행 중 ${activeInstallmentCount}건`}
            />
            <LinkRow
              sectionId="debt"
              href="/finance/debts"
              summary={`빚 진행 중 ${activeDebtCount}건`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
