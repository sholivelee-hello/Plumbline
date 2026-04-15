"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: number | null;
  unit: string;
  target: number | null;
  onSave: (value: number) => void;
  onClose: () => void;
  step?: number;
}

export function NumberInput({
  value,
  unit,
  target,
  onSave,
  onClose,
  step = 1,
}: NumberInputProps) {
  const [input, setInput] = useState<string>(value?.toString() ?? "0");

  function update(next: number) {
    const clamped = Math.max(0, next);
    setInput(String(clamped));
  }

  const numeric = Number.isFinite(parseFloat(input)) ? parseFloat(input) : 0;
  const progress = target && target > 0 ? Math.min(100, Math.round((numeric / target) * 100)) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => update(numeric - step)}
          aria-label="감소"
          className="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#1f242e] text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#262c38] tap-press"
        >
          <Minus size={18} />
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={step}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-24 text-center text-2xl font-semibold rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
            autoFocus
            inputMode="numeric"
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => update(numeric + step)}
          aria-label="증가"
          className="w-11 h-11 rounded-full bg-primary-100 dark:bg-[#2a2e45] text-primary-600 dark:text-primary-200 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-[#343b58] tap-press"
        >
          <Plus size={18} />
        </button>
      </div>

      {target && (
        <div className="space-y-1.5">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 tabular-nums">
            목표: {target}{unit}
            {progress != null && ` · ${progress}%`}
          </p>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#1f242e] overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-500 dark:text-gray-400 tap-press"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => {
            if (Number.isFinite(numeric)) onSave(numeric);
          }}
          disabled={!Number.isFinite(numeric)}
          className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed tap-press"
        >
          저장
        </button>
      </div>
    </div>
  );
}
