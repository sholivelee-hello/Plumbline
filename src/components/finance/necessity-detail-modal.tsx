"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatWon, calcPercent } from "@/lib/utils/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBasket, Plus } from "lucide-react";
import type { FinanceCategory, FinanceTransaction } from "@/types/database";

interface NecessityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: FinanceCategory | null;
  budgetAmount: number;
  transactions: FinanceTransaction[];
  onAdd: (tx: {
    category_id: string;
    amount: number;
    description: string | null;
    date: string;
    type: "expense";
  }) => void;
}

export function NecessityDetailModal({
  isOpen,
  onClose,
  category,
  budgetAmount,
  transactions,
  onAdd,
}: NecessityDetailModalProps) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  if (!category) return null;

  const items = transactions
    .filter((t) => t.category_id === category.id && t.type === "expense")
    .sort((a, b) => b.date.localeCompare(a.date));
  const spent = items.reduce((s, t) => s + t.amount, 0);
  const percent = calcPercent(spent, budgetAmount);

  // 날짜별 그룹핑
  const grouped = items.reduce<Record<string, FinanceTransaction[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort().reverse();

  function handleAdd() {
    if (!category) return;
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    onAdd({
      category_id: category.id,
      amount: parsed,
      description: memo.trim() || null,
      date,
      type: "expense",
    });
    setAmount("");
    setMemo("");
    setDate(new Date().toISOString().split("T")[0]);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${category.title} 지출 내역`}>
      <div className="space-y-5">
        {/* Summary */}
        <div className="rounded-xl bg-necessity-50/70 dark:bg-necessity-700/10 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              이번 달 예산 대비
            </span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                percent > 100
                  ? "text-obligation-500"
                  : percent >= 80
                  ? "text-debt-500"
                  : "text-necessity-600 dark:text-necessity-300"
              }`}
            >
              {percent}%
            </span>
          </div>
          <ProgressBar
            percent={percent}
            color={
              percent > 100
                ? "bg-obligation-400"
                : percent >= 80
                ? "bg-debt-400"
                : "bg-necessity-500"
            }
          />
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            <span>지출 ₩{formatWon(spent)}</span>
            <span>예산 ₩{formatWon(budgetAmount)}</span>
          </div>
        </div>

        {/* Input form */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            지출 추가
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#1f242e] px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-necessity-300"
              min="0"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#1f242e] px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-necessity-300"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#1f242e] px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-necessity-300"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!amount || Number(amount) <= 0}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-necessity-500 text-white text-sm font-semibold hover:bg-necessity-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed tap-press"
            >
              <Plus size={14} />
              추가
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <EmptyState
              icon={<ShoppingBasket size={28} strokeWidth={1.5} />}
              title="아직 지출 내역이 없어요"
              description="이번 달 첫 지출을 기록해 보세요"
            />
          ) : (
            sortedDates.map((d) => {
              const dayTotal = grouped[d].reduce((s, t) => s + t.amount, 0);
              return (
                <div key={d}>
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                    <span>{d}</span>
                    <span className="tabular-nums">
                      ₩{formatWon(dayTotal)}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {grouped[d].map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1f242e] border border-gray-100 dark:border-[#262c38]"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {t.description ?? "(메모 없음)"}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                          ₩{formatWon(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
