"use client";

import { useState } from "react";
import type { BasicCategory, BasicType } from "@/types/database";

interface TemplateFormProps {
  onSave: (data: {
    category: BasicCategory;
    title: string;
    type: BasicType;
    unit: string | null;
    target_value: number | null;
  }) => void;
  onCancel: () => void;
}

export function TemplateForm({ onSave, onCancel }: TemplateFormProps) {
  const [category, setCategory] = useState<BasicCategory>("spiritual");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BasicType>("check");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      category,
      title,
      type,
      unit: type === "number" ? unit : null,
      target_value: type === "number" && targetValue ? parseFloat(targetValue) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCategory("spiritual")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === "spiritual"
              ? "bg-sky-200 text-sky-600"
              : "bg-warm-100 text-warm-400"
          }`}
        >
          📖 영적
        </button>
        <button
          type="button"
          onClick={() => setCategory("physical")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === "physical"
              ? "bg-sage-200 text-sage-600"
              : "bg-warm-100 text-warm-400"
          }`}
        >
          💪 신체적
        </button>
      </div>

      <input
        type="text"
        placeholder="항목 이름 (예: 기도, 버터 먹기)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
        required
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("check")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "check" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          ✓ 체크
        </button>
        <button
          type="button"
          onClick={() => setType("number")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "number" ? "bg-warm-500 text-white" : "bg-warm-100 text-warm-400"
          }`}
        >
          🔢 수치
        </button>
      </div>

      {type === "number" && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="단위 (시간, 잔 등)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
          />
          <input
            type="number"
            step="0.5"
            placeholder="목표"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="w-24 px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-500"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-warm-500 text-white font-medium"
        >
          추가
        </button>
      </div>
    </form>
  );
}
