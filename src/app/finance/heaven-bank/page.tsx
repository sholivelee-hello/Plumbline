"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { getCurrentMonth, prevMonth, nextMonth, formatMonthKR } from "@/lib/utils/date";
import { HeavenBankLedger } from "@/components/finance/heaven-bank-ledger";
import { HeavenBankForm } from "@/components/finance/heaven-bank-form";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { HeavenBankEntry } from "@/types/database";

export default function HeavenBankPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const { entries, monthlySow, monthlyReap, cumulativeSow, loading, addEntry } =
    useHeavenBank(month);

  async function handleSave(entry: Omit<HeavenBankEntry, "id" | "user_id">) {
    await addEntry(entry);
    setFormOpen(false);
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      <PageHeader title="하늘 은행" backHref="/finance" contentMaxWidth="max-w-5xl" />

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-white dark:bg-[#161a22] border border-gray-100 dark:border-[#262c38] rounded-card shadow-card px-4 py-3">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-900 dark:text-gray-100 font-semibold">{formatMonthKR(month)}</span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Ledger */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <HeavenBankLedger
            entries={entries}
            monthlySow={monthlySow}
            monthlyReap={monthlyReap}
            cumulativeSow={cumulativeSow}
          />
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 lg:right-8 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-primary-600 transition-colors z-40"
        aria-label="내역 추가"
      >
        +
      </button>

      {/* Form modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="하늘 은행 내역 추가"
      >
        <HeavenBankForm
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
