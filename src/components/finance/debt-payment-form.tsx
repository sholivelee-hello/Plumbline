"use client";

import { useState } from "react";

interface DebtPaymentFormProps {
  debtId: string;
  onSave: (debtId: string, amount: number, memo: string) => void;
  onClose: () => void;
}

export function DebtPaymentForm({ debtId, onSave, onClose }: DebtPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  function handleSave() {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    onSave(debtId, parsed, memo.trim());
  }

  return (
    <div className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-1">
          상환 금액 (원)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="0"
          className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
        />
      </div>

      {/* Memo */}
      <div>
        <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-1">
          메모 (선택)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모를 입력하세요"
          className="w-full rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] px-4 py-3 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={!amount || Number(amount) <= 0}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          저장
        </button>
      </div>
    </div>
  );
}
