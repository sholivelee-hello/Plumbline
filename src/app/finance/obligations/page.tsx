"use client";

import { useState } from "react";
import Link from "next/link";
import { useObligations } from "@/lib/hooks/use-obligations";
import { getCurrentMonth } from "@/lib/utils/date";
import { ObligationsList } from "@/components/finance/obligations-list";

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthKR(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function ObligationsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { obligations, loading, togglePaid, updateAmount } = useObligations(month);

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 px-4 py-4 flex items-center gap-3">
        <Link
          href="/finance"
          className="text-warm-400 hover:text-warm-600 transition-colors text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-warm-700 flex-1">의무 지출</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white rounded-card shadow-card px-4 py-3">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="text-warm-400 hover:text-warm-600 transition-colors px-2 py-1 text-lg"
          >
            ←
          </button>
          <span className="text-warm-700 font-semibold">
            {formatMonthKR(month)}
          </span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="text-warm-400 hover:text-warm-600 transition-colors px-2 py-1 text-lg"
          >
            →
          </button>
        </div>

        {/* Obligations list */}
        {loading ? (
          <div className="text-center py-12 text-warm-400 text-sm">
            불러오는 중...
          </div>
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
