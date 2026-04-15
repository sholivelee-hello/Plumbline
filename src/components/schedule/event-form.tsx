"use client";

import { useState } from "react";
import type { Event } from "@/types/database";

const COLOR_PRESETS = ["#d4c4b0", "#c8d4e8", "#c8dcc8", "#f0d4b4", "#e0e8f0", "#f9e8d4"];

interface EventFormProps {
  mode: "add" | "edit";
  initial?: Partial<Pick<Event, "title" | "start_date" | "end_date" | "color" | "memo">>;
  defaultDate?: string;
  onSave: (data: {
    title: string;
    start_date: string;
    end_date: string;
    color: string;
    memo: string | null;
    start_time: string | null;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function EventForm({ mode, initial, defaultDate, onSave, onCancel, onDelete }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? defaultDate ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? defaultDate ?? "");
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [memo, setMemo] = useState(initial?.memo ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    if (endDate < startDate) return;
    onSave({
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      color,
      memo: memo.trim() ? memo.trim() : null,
      start_time: null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1 pl-1">시작 날짜</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 pl-1">종료 날짜</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm" required />
        </div>
      </div>

      <input type="text" placeholder="이벤트 제목" value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
        required autoFocus />

      <div>
        <label className="block text-xs text-gray-400 mb-2 pl-1">색상</label>
        <div className="flex gap-2">
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined,
              }}
              aria-label={`색상 ${c}`} />
          ))}
        </div>
      </div>

      <textarea placeholder="메모 (선택)" value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm resize-none" />

      <div className="flex gap-3 pt-1">
        {mode === "edit" && onDelete && (
          <button type="button" onClick={onDelete}
            className="px-4 py-2.5 rounded-xl text-red-500 border border-red-200 dark:border-red-800 text-sm">
            삭제
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300">
          취소
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium">
          저장
        </button>
      </div>
    </form>
  );
}
