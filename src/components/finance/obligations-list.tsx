"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatWon } from "@/lib/utils/format";
import type { FinanceObligation } from "@/types/database";

interface ObligationsListProps {
  obligations: (FinanceObligation & { category_title: string })[];
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onUpdateAmount: (id: string, amount: number) => void;
}

interface EditingState {
  id: string;
  value: string;
}

export function ObligationsList({
  obligations,
  onTogglePaid,
  onUpdateAmount,
}: ObligationsListProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);

  const grandTotal = obligations.reduce((s, o) => s + o.amount, 0);
  const paidTotal = obligations
    .filter((o) => o.is_paid)
    .reduce((s, o) => s + o.amount, 0);
  const percent = grandTotal > 0 ? Math.round((paidTotal / grandTotal) * 100) : 0;

  function handleAmountTap(o: FinanceObligation & { category_title: string }) {
    setEditing({ id: o.id, value: String(o.amount) });
  }

  function handleAmountBlur(id: string) {
    if (!editing) return;
    const parsed = Number(editing.value);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateAmount(id, parsed);
    }
    setEditing(null);
  }

  function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") handleAmountBlur(id);
    if (e.key === "Escape") setEditing(null);
  }

  return (
    <div className="space-y-3">
      {obligations.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          이번 달 의무 지출이 없습니다
        </div>
      ) : (
        obligations.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={o.is_paid}
                onChange={(checked) => onTogglePaid(o.id, checked)}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    o.is_paid ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {o.category_title}
                </p>
              </div>
              <div className="flex-shrink-0">
                {editing?.id === o.id ? (
                  <input
                    type="number"
                    autoFocus
                    value={editing.value}
                    onChange={(e) =>
                      setEditing({ id: o.id, value: e.target.value })
                    }
                    onBlur={() => handleAmountBlur(o.id)}
                    onKeyDown={(e) => handleAmountKeyDown(e, o.id)}
                    className="w-28 text-right rounded-lg border border-gray-300 dark:border-[#363c48] bg-gray-50 dark:bg-[#1f242e] px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    min="0"
                  />
                ) : (
                  <button
                    onClick={() => handleAmountTap(o)}
                    className={`text-sm font-semibold tabular-nums px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors ${
                      o.is_paid ? "text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    ₩{formatWon(o.amount)}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}

      {/* Total row */}
      {obligations.length > 0 && (
        <Card className="bg-gray-50 dark:bg-[#1f242e]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">납부 현황</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                ₩{formatWon(paidTotal)}{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  / ₩{formatWon(grandTotal)}
                </span>
              </span>
            </div>
            <ProgressBar percent={percent} />
            <p className="text-right text-xs text-gray-400 dark:text-gray-500">{percent}% 완료</p>
          </div>
        </Card>
      )}
    </div>
  );
}
