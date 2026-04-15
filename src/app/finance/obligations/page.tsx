"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useObligations } from "@/lib/hooks/use-obligations";
import { getCurrentMonth, prevMonth, nextMonth, formatMonthKR } from "@/lib/utils/date";
import { ObligationsList } from "@/components/finance/obligations-list";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";

export default function ObligationsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { obligations, loading, togglePaid, updateAmount } = useObligations(month);

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      <PageHeader title="의무 지출" backHref="/finance" contentMaxWidth="max-w-5xl" />

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] rounded-card shadow-card px-4 py-3">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-900 dark:text-gray-100 font-semibold">
            {formatMonthKR(month)}
          </span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Obligations list */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <ObligationsList
            obligations={obligations}
            onTogglePaid={togglePaid}
            onUpdateAmount={updateAmount}
          />
        )}
      </div>
    </div>
  );
}
