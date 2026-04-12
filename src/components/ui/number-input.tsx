"use client";

import { useState } from "react";

interface NumberInputProps {
  value: number | null;
  unit: string;
  target: number | null;
  onSave: (value: number) => void;
  onClose: () => void;
}

export function NumberInput({ value, unit, target, onSave, onClose }: NumberInputProps) {
  const [input, setInput] = useState(value?.toString() ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.5"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 text-center text-lg focus:outline-none focus:ring-2 focus:ring-warm-300"
          autoFocus
        />
        <span className="text-warm-500">{unit}</span>
      </div>
      {target && (
        <p className="text-sm text-warm-400 text-center">목표: {target}{unit}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-500"
        >
          취소
        </button>
        <button
          onClick={() => { if (input) onSave(parseFloat(input)); }}
          className="flex-1 py-2.5 rounded-xl bg-warm-500 text-white font-medium"
        >
          저장
        </button>
      </div>
    </div>
  );
}
