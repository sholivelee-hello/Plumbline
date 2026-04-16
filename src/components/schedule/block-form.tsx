"use client";

import { useState } from "react";

const DEFAULT_COLOR = "#7575D8";

interface BlockFormProps {
  onSave: (data: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    color: string;
    saveAsPreset: boolean;
    asActual: boolean;
  }) => void;
  onCancel: () => void;
  timeSlots: string[];
  defaultDate: string;           // 필수: YYYY-MM-DD
  defaultStartTime?: string;
  defaultTitle?: string;
  defaultColor?: string;
  defaultDurationMinutes?: number;
  defaultAsActual?: boolean;     // 기본 false (계획)
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.min(23, Math.max(0, Math.floor(total / 60)));
  const nm = Math.max(0, total % 60);
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function BlockForm({
  onSave,
  onCancel,
  timeSlots,
  defaultDate,
  defaultStartTime,
  defaultTitle,
  defaultColor,
  defaultDurationMinutes,
  defaultAsActual,
}: BlockFormProps) {
  const defaultStart = defaultStartTime ?? timeSlots[0] ?? "09:00";
  const defaultEnd = defaultDurationMinutes
    ? addMinutes(defaultStart, defaultDurationMinutes)
    : (() => {
        const idx = timeSlots.indexOf(defaultStart);
        const nextIdx = Math.min(idx + 1, timeSlots.length - 1);
        return timeSlots[nextIdx] ?? timeSlots[timeSlots.length - 1] ?? "10:00";
      })();

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const color = defaultColor ?? DEFAULT_COLOR;
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [asActual, setAsActual] = useState(defaultAsActual ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date,
      start_time: startTime,
      end_time: endTime,
      color,
      saveAsPreset,
      asActual,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1 pl-1">
          날짜
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
        />
      </div>

      <input
        type="text"
        placeholder="활동 이름 (예: 기도, 독서, 운동)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
        required
        autoFocus
      />

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1 pl-1">
            시작
          </label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
        <span className="text-gray-300 dark:text-gray-600 mt-5">—</span>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1 pl-1">
            종료
          </label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsPreset}
          onChange={(e) => setSaveAsPreset(e.target.checked)}
          className="w-4 h-4 rounded accent-primary-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          즐겨찾기에 저장
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={asActual}
          onChange={(e) => setAsActual(e.target.checked)}
          className="w-4 h-4 rounded accent-primary-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          실제로 기록 (계획이 아닌 완료된 일로 저장)
        </span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 dark:text-gray-300 tap-press"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium tap-press"
        >
          추가
        </button>
      </div>
    </form>
  );
}
