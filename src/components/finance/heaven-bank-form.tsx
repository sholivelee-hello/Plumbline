"use client";

import { useState } from "react";
import type { HeavenBankEntry } from "@/types/database";

const SOW_TARGETS = ["가난한 자", "선교", "하늘나라 프로젝트"] as const;

interface HeavenBankFormProps {
  onSave: (entry: Omit<HeavenBankEntry, "id" | "user_id">) => void;
  onClose: () => void;
}

export function HeavenBankForm({ onSave, onClose }: HeavenBankFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [type, setType] = useState<"sow" | "reap">("sow");
  const [target, setTarget] = useState<string>(SOW_TARGETS[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  function handleSave() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    onSave({
      date,
      type,
      target: type === "sow" ? target : null,
      description: type === "reap" ? description.trim() || null : null,
      amount: parsedAmount,
    });
  }

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2 bg-warm-100 rounded-xl p-1">
        <button
          onClick={() => setType("sow")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            type === "sow"
              ? "bg-white text-warm-700 shadow-sm"
              : "text-warm-400"
          }`}
        >
          🌱 심음 (Sow)
        </button>
        <button
          onClick={() => setType("reap")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            type === "reap"
              ? "bg-white text-warm-700 shadow-sm"
              : "text-warm-400"
          }`}
        >
          🌾 거둠 (Reap)
        </button>
      </div>

      {/* Target or description */}
      {type === "sow" ? (
        <div>
          <label className="block text-warm-600 text-sm font-medium mb-1">
            대상
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300"
          >
            {SOW_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-warm-600 text-sm font-medium mb-1">
            내용
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="거둠 내용을 입력하세요"
            className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300 placeholder:text-warm-300"
          />
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-warm-600 text-sm font-medium mb-1">
          금액 (원)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="0"
          className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300 placeholder:text-warm-300"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-warm-600 text-sm font-medium mb-1">
          날짜
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-warm-700 text-sm focus:outline-none focus:ring-2 focus:ring-warm-300"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-500 text-sm font-medium hover:bg-warm-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl bg-warm-600 text-white text-sm font-medium hover:bg-warm-700 transition-colors"
        >
          저장
        </button>
      </div>
    </div>
  );
}
