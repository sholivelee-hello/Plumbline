"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/finance/bottom-sheet";
import { calcWeeklyPace } from "@/lib/weight-utils";
import type { WeightGoal } from "@/types/database";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentKg: number | null;
  initial: WeightGoal | null;
  onSubmit: (target_kg: number, deadline: string) => Promise<void> | void;
  saving?: boolean;
}

const TOMORROW = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
};

export function WeightGoalSheet({ isOpen, onClose, currentKg, initial, onSubmit, saving }: Props) {
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState(TOMORROW());

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      setTarget(initial.target_kg.toFixed(1));
      setDeadline(initial.deadline);
    } else {
      setTarget("");
      setDeadline(TOMORROW());
    }
  }, [isOpen, initial]);

  const parsed = parseFloat(target);
  const valid =
    Number.isFinite(parsed) &&
    parsed >= 20 &&
    parsed <= 300 &&
    deadline > new Date().toLocaleDateString("sv-SE");

  const preview = useMemo(() => {
    if (!valid || currentKg == null) return null;
    const pace = calcWeeklyPace(currentKg, parsed, deadline);
    const daysLeft = Math.round((new Date(deadline + "T00:00:00").getTime() - Date.now()) / 86_400_000);
    const remain = Math.round((currentKg - parsed) * 10) / 10;
    return { pace, daysLeft, remain };
  }, [valid, parsed, deadline, currentKg]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="목표 설정">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">목표 체중 (kg)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="62.0"
            autoFocus
            className="w-full min-h-[56px] px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">달성 목표일</p>
          <input
            type="date"
            value={deadline}
            min={TOMORROW()}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2d3748] bg-white dark:bg-[#1a2030] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        {preview && (
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-3 text-xs text-indigo-800 dark:text-indigo-200">
            📊 지금 {currentKg?.toFixed(1)}kg → {preview.remain > 0 ? `${preview.remain.toFixed(1)}kg 감량` : `유지`} /{" "}
            {preview.daysLeft}일{preview.pace ? ` · 주 ${preview.pace.toFixed(2)}kg 필요` : ""}
          </div>
        )}

        <button
          type="button"
          onClick={() => valid && onSubmit(parsed, deadline)}
          disabled={!valid || saving}
          className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </BottomSheet>
  );
}
