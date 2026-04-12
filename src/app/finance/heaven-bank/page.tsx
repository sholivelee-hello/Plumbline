"use client";

import { useState } from "react";
import Link from "next/link";
import { useHeavenBank } from "@/lib/hooks/use-heaven-bank";
import { getCurrentMonth } from "@/lib/utils/date";
import { HeavenBankLedger } from "@/components/finance/heaven-bank-ledger";
import { HeavenBankForm } from "@/components/finance/heaven-bank-form";
import { Modal } from "@/components/ui/modal";
import type { HeavenBankEntry } from "@/types/database";

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
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 px-4 py-4 flex items-center gap-3">
        <Link
          href="/finance"
          className="text-warm-400 hover:text-warm-600 transition-colors text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-warm-700 flex-1">하늘 은행</h1>
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
          <span className="text-warm-700 font-semibold">{formatMonthKR(month)}</span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="text-warm-400 hover:text-warm-600 transition-colors px-2 py-1 text-lg"
          >
            →
          </button>
        </div>

        {/* Ledger */}
        {loading ? (
          <div className="text-center py-12 text-warm-400 text-sm">
            불러오는 중...
          </div>
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
        className="fixed bottom-24 right-5 w-14 h-14 bg-warm-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-warm-700 transition-colors z-40"
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
