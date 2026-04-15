"use client";

import { useState } from "react";
import { useInstallments } from "@/lib/hooks/use-installments";
import { InstallmentCard } from "@/components/finance/installment-card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getCurrentMonth } from "@/lib/utils/date";

export default function InstallmentsPage() {
  const { installments, loading, addInstallment, payMonth } = useInstallments();
  const [addOpen, setAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [totalMonths, setTotalMonths] = useState("");
  const [startDate, setStartDate] = useState(getCurrentMonth());
  const [saving, setSaving] = useState(false);

  const active = installments.filter((i) => !i.is_completed);
  const completed = installments.filter((i) => i.is_completed);

  async function handleAdd() {
    const parsedTotal = Number(totalAmount);
    const parsedMonthly = Number(monthlyPayment);
    const parsedMonths = Number(totalMonths);
    if (!title.trim() || parsedTotal <= 0 || parsedMonthly <= 0 || parsedMonths <= 0) return;

    setSaving(true);
    await addInstallment(title.trim(), parsedTotal, parsedMonthly, parsedMonths, startDate);
    setSaving(false);
    setTitle("");
    setTotalAmount("");
    setMonthlyPayment("");
    setTotalMonths("");
    setStartDate(getCurrentMonth());
    setAddOpen(false);
  }

  function handleTotalAmountChange(total: string, months: string) {
    setTotalAmount(total);
    const t = Number(total);
    const m = Number(months);
    if (t > 0 && m > 0) {
      setMonthlyPayment(String(Math.ceil(t / m)));
    }
  }

  function handleTotalMonthsChange(months: string) {
    setTotalMonths(months);
    const t = Number(totalAmount);
    const m = Number(months);
    if (t > 0 && m > 0) {
      setMonthlyPayment(String(Math.ceil(t / m)));
    }
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      <PageHeader title="할부 관리" backHref="/finance" contentMaxWidth="max-w-5xl" />

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-4">
        {loading ? (
          <SkeletonCard />
        ) : (
          <>
            {active.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                진행 중인 할부가 없습니다
              </div>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {active.map((item) => (
                  <InstallmentCard
                    key={item.id}
                    installment={item}
                    onPayMonth={payMonth}
                  />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 font-medium py-2"
                >
                  <span>완납 항목 ({completed.length})</span>
                  {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showCompleted && (
                  <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                    {completed.map((item) => (
                      <InstallmentCard
                        key={item.id}
                        installment={item}
                        onPayMonth={payMonth}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 lg:right-8 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-40"
        aria-label="할부 추가"
      >
        <Plus size={24} />
      </button>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="할부 추가">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">항목명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 맥북 프로 할부"
              className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">총 금액 (원)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalAmountChange(e.target.value, totalMonths)}
              placeholder="0"
              min="0"
              className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">할부 개월</label>
              <input
                type="number"
                value={totalMonths}
                onChange={(e) => handleTotalMonthsChange(e.target.value)}
                placeholder="12"
                min="1"
                className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">월 납입액</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="자동 계산"
                min="0"
                className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">시작월</label>
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setAddOpen(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !totalAmount || !totalMonths || !monthlyPayment || saving}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
