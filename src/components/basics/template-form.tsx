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
              ? "bg-primary-100 dark:bg-[#2a2e45] text-primary-600 dark:text-primary-200"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          📖 영적
        </button>
        <button
          type="button"
          onClick={() => setCategory("physical")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === "physical"
              ? "bg-primary-100 dark:bg-[#2a2e45] text-primary-600 dark:text-primary-200"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
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
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
        required
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("check")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "check" ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          ✓ 체크
        </button>
        <button
          type="button"
          onClick={() => setType("number")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "number" ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
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
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <input
            type="number"
            step="0.5"
            placeholder="목표"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="w-24 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-semibold"
        >
          추가
        </button>
      </div>
    </form>
  );
}
