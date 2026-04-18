"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/finance/bottom-sheet";

interface WeightInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initial?: { weight_kg: number; weighed_on: string };
  onSubmit: (weight_kg: number, weighed_on: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saving?: boolean;
}

const TODAY = () => new Date().toLocaleDateString("sv-SE");

export function WeightInputSheet({
  isOpen,
  onClose,
  mode,
  initial,
  onSubmit,
  onDelete,
  saving,
}: WeightInputSheetProps) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(TODAY());
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDel(false);
      return;
    }
    if (initial) {
      setWeight(initial.weight_kg.toFixed(1));
      setDate(initial.weighed_on);
    } else {
      setWeight("");
      setDate(TODAY());
    }
  }, [isOpen, initial]);

  const parsed = parseFloat(weight);
  const valid =
    Number.isFinite(parsed) && parsed >= 20 && parsed <= 300 && date <= TODAY();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={mode === "edit" ? "기록 수정" : "체중 입력"}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">체중 (kg)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="67.3"
            autoFocus
            className="w-full min-h-[56px] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">날짜</p>
          <input
            type="date"
            value={date}
            max={TODAY()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => valid && onSubmit(parsed, date)}
            disabled={!valid || saving}
            className="flex-1 min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirmDel) {
                  onDelete();
                } else {
                  setConfirmDel(true);
                }
              }}
              disabled={saving}
              className={`min-h-[48px] px-4 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                confirmDel
                  ? "bg-red-500 text-white"
                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              }`}
            >
              {confirmDel ? "정말 삭제" : "삭제"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
