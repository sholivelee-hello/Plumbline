"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatWon } from "@/lib/utils/format";
import type { FinanceDebt, FinanceDebtPayment } from "@/types/database";

interface DebtWithProgress extends FinanceDebt {
  total_paid: number;
  percent: number;
  payments: FinanceDebtPayment[];
}

interface DebtCardProps {
  debt: DebtWithProgress;
  onAddPayment: (debtId: string) => void;
}

export function DebtCard({ debt, onAddPayment }: DebtCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const remaining = debt.total_amount - debt.total_paid;

  return (
    <Card className={debt.is_completed ? "opacity-60" : ""}>
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {debt.is_completed && (
              <span className="text-sage-500 text-lg flex-shrink-0">✓</span>
            )}
            <h3
              className={`font-semibold truncate ${
                debt.is_completed
                  ? "text-warm-400 line-through"
                  : "text-warm-700"
              }`}
            >
              {debt.title}
            </h3>
          </div>
          {debt.is_completed && (
            <span className="flex-shrink-0 text-xs bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full font-medium">
              완료
            </span>
          )}
        </div>

        {/* Amount info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-warm-50 rounded-xl p-3">
            <p className="text-warm-400 text-xs mb-1">총 부채</p>
            <p className="font-semibold text-warm-700 tabular-nums">
              ₩{formatWon(debt.total_amount)}
            </p>
          </div>
          <div className="bg-warm-50 rounded-xl p-3">
            <p className="text-warm-400 text-xs mb-1">
              {debt.is_completed ? "상환 완료" : "남은 금액"}
            </p>
            <p
              className={`font-semibold tabular-nums ${
                debt.is_completed ? "text-sage-500" : "text-rose-400"
              }`}
            >
              ₩{formatWon(debt.is_completed ? debt.total_paid : remaining)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <ProgressBar
            percent={debt.percent}
            color={debt.is_completed ? "bg-sage-300" : "bg-warm-400"}
          />
          <div className="flex justify-between text-xs text-warm-400">
            <span>납부 ₩{formatWon(debt.total_paid)}</span>
            <span>{debt.percent}%</span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 pt-1">
          {!debt.is_completed && (
            <button
              onClick={() => onAddPayment(debt.id)}
              className="flex-1 py-2.5 rounded-xl bg-warm-600 text-white text-sm font-medium hover:bg-warm-700 transition-colors"
            >
              상환 기록
            </button>
          )}
          {debt.payments.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`py-2.5 px-4 rounded-xl border border-warm-200 text-warm-500 text-sm font-medium hover:bg-warm-50 transition-colors ${
                debt.is_completed ? "flex-1" : ""
              }`}
            >
              {showHistory ? "숨기기" : `내역 (${debt.payments.length})`}
            </button>
          )}
        </div>

        {/* Payment history */}
        {showHistory && debt.payments.length > 0 && (
          <div className="border-t border-warm-100 pt-3 space-y-2">
            <p className="text-xs font-medium text-warm-500 mb-2">상환 내역</p>
            {debt.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-warm-300 text-xs flex-shrink-0">
                    {p.date}
                  </span>
                  {p.memo && (
                    <span className="text-warm-400 truncate text-xs">
                      {p.memo}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-warm-700 tabular-nums flex-shrink-0 ml-2">
                  ₩{formatWon(p.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
