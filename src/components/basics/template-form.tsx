"use client";

import { useState } from "react";
import type { BasicCategory, BasicType } from "@/types/database";

export interface TemplateFormValues {
  category: BasicCategory;
  title: string;
  type: BasicType;
  unit: string | null;
  target_value: number | null;
  step_value: number | null;
}

interface TemplateFormProps {
  initialValues?: Partial<TemplateFormValues>;
  submitLabel?: string;
  onSave: (data: TemplateFormValues) => void;
  onCancel: () => void;
}

export function TemplateForm({
  initialValues,
  submitLabel = "추가",
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [category, setCategory] = useState<BasicCategory>(
    initialValues?.category ?? "spiritual",
  );
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [type, setType] = useState<BasicType>(initialValues?.type ?? "check");
  const [unit, setUnit] = useState(initialValues?.unit ?? "");
  const [targetValue, setTargetValue] = useState(
    initialValues?.target_value != null ? String(initialValues.target_value) : "",
  );
  const [stepValue, setStepValue] = useState(
    initialValues?.step_value != null ? String(initialValues.step_value) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      category,
      title,
      type,
      unit: type === "number" ? unit : null,
      target_value:
        type === "number" && targetValue ? parseFloat(targetValue) : null,
      step_value:
        type === "number" && stepValue ? parseFloat(stepValue) : null,
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
            type === "check"
              ? "bg-primary-500 text-white"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          ✓ 체크
        </button>
        <button
          type="button"
          onClick={() => setType("number")}
          className={`flex-1 py-2 rounded-xl text-sm ${
            type === "number"
              ? "bg-primary-500 text-white"
              : "bg-gray-100 dark:bg-[#1f242e] text-gray-400 dark:text-gray-500"
          }`}
        >
          🔢 수치
        </button>
      </div>

      {type === "number" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              단위
            </label>
            <input
              type="text"
              placeholder="분, 시간, 잔, 회 등"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                목표
              </label>
              <input
                type="number"
                step="any"
                placeholder="예: 60"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <span className="pb-3 text-base font-medium text-gray-700 dark:text-gray-200 min-w-[2.5rem]">
              {unit || "—"}
            </span>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                +/- 증감 단위
              </label>
              <input
                type="number"
                step="any"
                placeholder="예: 10"
                value={stepValue}
                onChange={(e) => setStepValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <span className="pb-3 text-base font-medium text-gray-700 dark:text-gray-200 min-w-[2.5rem]">
              {unit || "—"}
            </span>
          </div>
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
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
