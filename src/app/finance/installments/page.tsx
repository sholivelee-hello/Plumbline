"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { useInstallments } from "@/lib/hooks/use-installments";
import { useFinanceTransactions } from "@/lib/hooks/use-finance-transactions";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FinanceCard } from "@/components/finance/finance-card";
import { FinanceProgressBar } from "@/components/finance/progress-bar";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { AmountInput } from "@/components/finance/amount-input";
import { GroupPageSkeleton } from "@/components/finance/finance-skeleton";
import { formatCurrency, parseCurrencyInput, getCurrentMonth } from "@/lib/finance-utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function computePayoffDate(startDate: string, totalMonths: number): string {
  const start = new Date(startDate);
  const payoff = new Date(start.getFullYear(), start.getMonth() + totalMonths, 1);
  return `${payoff.getFullYear()}년 ${payoff.getMonth() + 1}월`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InstallmentsPage() {
  const { installments, loading, addInstallment, payMonth, deleteInstallment } = useInstallments();
  const { addTransaction } = useFinanceTransactions(getCurrentMonth());
  const { toast } = useToast();

  // ── Section state ────────────────────────────────────────────────────────
  const [showCompleted, setShowCompleted] = useState(false);

  // ── Add sheet ────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addTotal, setAddTotal] = useState("");
  const [addMonthly, setAddMonthly] = useState("");
  const [addMonths, setAddMonths] = useState("");
  const [addStart, setAddStart] = useState(() => getCurrentMonth());
  const [addSaving, setAddSaving] = useState(false);

  // ── Pay confirm dialog ───────────────────────────────────────────────────
  const [payConfirmId, setPayConfirmId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // ── Delete confirm dialog ────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Derived lists ────────────────────────────────────────────────────────
  const active = installments.filter((i) => !i.is_completed);
  const completed = installments.filter((i) => i.is_completed);

  const totalMonthlyDue = active.reduce((s, i) => s + i.monthly_payment, 0);

  // ── Add form helpers ─────────────────────────────────────────────────────
  function handleTotalChange(val: string) {
    setAddTotal(val);
    const t = parseCurrencyInput(val);
    const m = Number(addMonths);
    if (t > 0 && m > 0) setAddMonthly(String(Math.ceil(t / m)));
  }

  function handleMonthsChange(val: string) {
    setAddMonths(val);
    const t = parseCurrencyInput(addTotal);
    const m = Number(val);
    if (t > 0 && m > 0) setAddMonthly(String(Math.ceil(t / m)));
  }

  const parsedTotal = parseCurrencyInput(addTotal);
  const parsedMonthly = parseCurrencyInput(addMonthly);
  const parsedMonths = Number(addMonths);
  const mismatch =
    parsedTotal > 0 && parsedMonthly > 0 && parsedMonths > 0 &&
    parsedMonthly * parsedMonths !== parsedTotal;
  const canSave =
    addTitle.trim().length > 0 && parsedTotal > 0 && parsedMonthly > 0 && parsedMonths > 0;

  const handleAdd = useCallback(async () => {
    if (!canSave) return;
    setAddSaving(true);
    const result = await addInstallment(
      addTitle.trim(),
      parsedTotal,
      parsedMonthly,
      parsedMonths,
      addStart
    );
    setAddSaving(false);
    if (!result.ok) {
      toast(result.error ?? "추가에 실패했습니다", "error");
      return;
    }
    toast("할부가 추가되었습니다", "success");
    setAddOpen(false);
    setAddTitle("");
    setAddTotal("");
    setAddMonthly("");
    setAddMonths("");
    setAddStart(getCurrentMonth());
  }, [canSave, addTitle, parsedTotal, parsedMonthly, parsedMonths, addStart, addInstallment, toast]);

  // ── Pay handler ──────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!payConfirmId) return;
    const item = installments.find((i) => i.id === payConfirmId);
    if (!item) return;

    setPaying(true);
    const payResult = await payMonth(payConfirmId);
    if (!payResult.ok) {
      toast(payResult.error ?? "납부 처리에 실패했습니다", "error");
      setPaying(false);
      setPayConfirmId(null);
      return;
    }

    // Dual-write: record in cashbook
    const nextPaid = item.paid_months + 1;
    const txResult = await addTransaction({
      type: "expense",
      amount: item.monthly_payment,
      description: `${item.title} 할부 ${nextPaid}/${item.total_months}회`,
      date: new Date().toLocaleDateString("sv-SE"),
      group_id: "obligation",
      item_id: "installment",
      source: "installment",
    });
    if (!txResult.ok) {
      toast("가계부 연동 실패 (납부는 기록됨)", "error");
    }

    setPaying(false);
    setPayConfirmId(null);

    if (payResult.isCompleted) {
      toast(`${item.title} 완납 축하합니다!`, "success");
    } else {
      toast(`${nextPaid}/${item.total_months}회 납부 완료`, "success");
    }
  }, [payConfirmId, installments, payMonth, addTransaction, toast]);

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    const result = await deleteInstallment(deleteConfirmId);
    setDeleting(false);
    setDeleteConfirmId(null);
    if (!result.ok) {
      toast(result.error ?? "삭제에 실패했습니다", "error");
    } else {
      toast("삭제되었습니다", "success");
    }
  }, [deleteConfirmId, deleteInstallment, toast]);

  // ── Pay confirm target info ──────────────────────────────────────────────
  const payTarget = payConfirmId ? installments.find((i) => i.id === payConfirmId) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32 bg-gray-50/50 dark:bg-[#0b0d12]">

      {/* Header */}
      <div className="bg-white dark:bg-[#1a2030] border-b border-gray-100 dark:border-[#2d3748]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/finance"
            aria-label="뒤로가기"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262c38] transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100">할부</h1>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-medium
              bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300
              hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors active:scale-95"
            aria-label="할부 추가"
          >
            <Plus size={16} />
            <span>할부 추가</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
        {loading ? (
          <GroupPageSkeleton />
        ) : (
          <>
            {/* ── Summary Card ────────────────────────────────────────────── */}
            <FinanceCard groupColor="#4F46E5">
              <div className="pl-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  할부 현황
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">활성 할부</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {active.length}건
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">월 총 납부액</p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
                      {formatCurrency(totalMonthlyDue)}원
                    </p>
                  </div>
                </div>
              </div>
            </FinanceCard>

            {/* ── Active installments ──────────────────────────────────────── */}
            {active.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                진행 중인 할부가 없습니다
              </div>
            ) : (
              <section className="space-y-3">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                  납부 중 ({active.length}건)
                </p>
                {active.map((item) => (
                  <FinanceCard key={item.id} groupColor="#4F46E5">
                    <div className="pl-2 space-y-3">
                      {/* Title + progress label */}
                      <div className="flex items-start justify-between">
                        <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                          {item.title}
                        </p>
                        <span className="shrink-0 ml-2 text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
                          {item.percent}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <FinanceProgressBar
                        value={item.paid_months}
                        max={item.total_months}
                        color="#4F46E5"
                        height="md"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-1">
                        {item.paid_months}/{item.total_months}회 납부
                      </p>

                      {/* Details grid 2x2 */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">총액</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                            {formatCurrency(item.total_amount)}원
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">월 납부액</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                            {formatCurrency(item.monthly_payment)}원
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">납부 완료</p>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(item.paid_amount)}원
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">남은 회차</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                            {item.remaining_months}회
                          </p>
                        </div>
                      </div>

                      {/* Payoff date */}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        완납 예정: {computePayoffDate(item.start_date, item.total_months)}
                      </p>

                      {/* Pay button */}
                      <button
                        type="button"
                        onClick={() => setPayConfirmId(item.id)}
                        className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
                          bg-indigo-600 dark:bg-indigo-500 hover:opacity-90
                          transition-opacity active:scale-[0.98]"
                      >
                        이번 달 납부하기
                      </button>
                    </div>
                  </FinanceCard>
                ))}
              </section>
            )}

            {/* ── Completed installments (collapsible) ─────────────────────── */}
            {completed.length > 0 && (
              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between px-1 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <span>완료된 할부 ({completed.length}건)</span>
                  {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showCompleted && (
                  <div className="space-y-3">
                    {completed.map((item) => (
                      <FinanceCard key={item.id} className="opacity-60">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                              {item.total_months}회 완납 · {formatCurrency(item.total_amount)}원
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                              완납
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              aria-label="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <FinanceProgressBar value={item.total_months} max={item.total_months} color="#4F46E5" height="sm" />
                      </FinanceCard>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Add Installment BottomSheet ──────────────────────────────────────── */}
      <BottomSheet isOpen={addOpen} onClose={() => setAddOpen(false)} title="할부 추가">
        <div className="space-y-5">
          {/* Title */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">항목명</p>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="예: 맥북 프로 할부"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          {/* Total amount */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">총 금액</p>
            <AmountInput value={addTotal} onChange={handleTotalChange} placeholder="총 할부 금액" />
          </div>

          {/* Months + monthly */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">총 회차</p>
              <input
                type="number"
                value={addMonths}
                onChange={(e) => handleMonthsChange(e.target.value)}
                placeholder="12"
                min="1"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                  bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">월 납부액</p>
              <AmountInput value={addMonthly} onChange={setAddMonthly} placeholder="자동 계산" />
            </div>
          </div>

          {/* Interest warning */}
          {mismatch && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl">
              이자 포함 금액인가요? (월납 × 회차 ≠ 총액)
            </p>
          )}

          {/* Start date */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">시작일</p>
            <input
              type="month"
              value={addStart}
              onChange={(e) => setAddStart(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748]
                bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canSave || addSaving}
            className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white
              bg-indigo-600 dark:bg-indigo-500 hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-opacity active:scale-[0.98]"
          >
            {addSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Pay confirm dialog ───────────────────────────────────────────────── */}
      {payTarget && (
        <ConfirmDialog
          isOpen={payConfirmId !== null}
          onClose={() => setPayConfirmId(null)}
          onConfirm={handlePay}
          title="납부 기록"
          description={`${payTarget.title} ${payTarget.paid_months + 1}/${payTarget.total_months}회 납부를 기록할까요?`}
          confirmLabel="납부 완료"
          loading={paying}
        />
      )}

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="할부 삭제"
        description="이 할부 항목을 삭제할까요? 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
