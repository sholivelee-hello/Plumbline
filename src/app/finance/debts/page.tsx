"use client";

import { useState } from "react";
import Link from "next/link";
import { useDebts } from "@/lib/hooks/use-debts";
import { DebtCard } from "@/components/finance/debt-card";
import { DebtPaymentForm } from "@/components/finance/debt-payment-form";
import { Modal } from "@/components/ui/modal";

export default function DebtsPage() {
  const { debts, loading, addDebt, addPayment } = useDebts();
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // New debt form state
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
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 px-4 py-4 flex items-center gap-3">
        <Link
          href="/finance"
          className="text-warm-400 hover:text-warm-600 transition-colors text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-warm-700 flex-1">부채 관리</h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-warm-400 text-sm">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* Active debts */}
            {activeDebts.length === 0 ? (
              <div className="text-center py-12 text-warm-400 text-sm">
                진행 중인 부채가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {activeDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onAddPayment={(id) => setPaymentDebtId(id)}
                  />
                ))}
              </div>
            )}

            {/* Completed debts collapsible */}
            {completedDebts.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between text-sm text-warm-500 font-medium py-2"
                >
                  <span>완료된 부채 ({completedDebts.length})</span>
                  <span className="text-warm-400">
                    {showCompleted ? "▲" : "▼"}
                  </span>
                </button>
                {showCompleted &&
                  completedDebts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onAddPayment={(id) => setPaymentDebtId(id)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setAddDebtOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-warm-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-warm-700 transition-colors z-40"
        aria-label="빚 추가"
      >
        +
      </button>

      {/* Add debt modal */}
      <Modal
        isOpen={addDebtOpen}
        onClose={() => setAddDebtOpen(false)}
        title="빚 추가"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-warm-600 text-sm font-medium mb-1">
              항목명
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="예: 전세 대출"
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300 placeholder:text-warm-300"
            />
          </div>
          <div>
            <label className="block text-warm-600 text-sm font-medium mb-1">
              총 금액 (원)
            </label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300 placeholder:text-warm-300"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setAddDebtOpen(false)}
              className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-500 text-sm font-medium hover:bg-warm-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAddDebt}
              disabled={!newTitle.trim() || !newAmount || Number(newAmount) <= 0}
              className="flex-1 py-3 rounded-xl bg-warm-600 text-white text-sm font-medium hover:bg-warm-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment modal */}
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
