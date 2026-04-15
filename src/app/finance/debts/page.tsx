"use client";

import { useState } from "react";
import { useDebts } from "@/lib/hooks/use-debts";
import { DebtCard } from "@/components/finance/debt-card";
import { DebtPaymentForm } from "@/components/finance/debt-payment-form";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

export default function DebtsPage() {
  const { debts, loading, addDebt, addPayment } = useDebts();
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const activeDebts = debts.filter((d) => !d.is_completed);
  const completedDebts = debts.filter((d) => d.is_completed);

  async function handleAddDebt() {
    const parsed = Number(newAmount);
    if (!newTitle.trim() || !parsed || parsed <= 0) return;
    await addDebt(newTitle.trim(), parsed);
    setNewTitle("");
    setNewAmount("");
    setAddDebtOpen(false);
  }

  async function handleSavePayment(debtId: string, amount: number, memo: string) {
    await addPayment(debtId, amount, memo);
    setPaymentDebtId(null);
  }

  const payingDebt = debts.find((d) => d.id === paymentDebtId);

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      <PageHeader title="부채 관리" backHref="/finance" contentMaxWidth="max-w-5xl" />

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-4">
        {loading ? (
          <SkeletonCard />
        ) : (
          <>
            {activeDebts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">진행 중인 부채가 없습니다</div>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {activeDebts.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} onAddPayment={(id) => setPaymentDebtId(id)} />
                ))}
              </div>
            )}

            {completedDebts.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 font-medium py-2"
                >
                  <span>완료된 부채 ({completedDebts.length})</span>
                  {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showCompleted &&
                  completedDebts.map((debt) => (
                    <DebtCard key={debt.id} debt={debt} onAddPayment={(id) => setPaymentDebtId(id)} />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setAddDebtOpen(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 lg:right-8 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-40"
        aria-label="빚 추가"
      >
        <Plus size={24} />
      </button>

      <Modal isOpen={addDebtOpen} onClose={() => setAddDebtOpen(false)} title="빚 추가">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">항목명</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="예: 전세 대출"
              className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">총 금액 (원)</label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setAddDebtOpen(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAddDebt}
              disabled={!newTitle.trim() || !newAmount || Number(newAmount) <= 0}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={paymentDebtId !== null}
        onClose={() => setPaymentDebtId(null)}
        title={payingDebt ? `${payingDebt.title} 상환 기록` : "상환 기록"}
      >
        {paymentDebtId !== null && (
          <DebtPaymentForm
            debtId={paymentDebtId}
            onSave={handleSavePayment}
            onClose={() => setPaymentDebtId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
