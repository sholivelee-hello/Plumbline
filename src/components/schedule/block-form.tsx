"use client";

import { useState } from "react";

const COLOR_PRESETS = ["#d4c4b0", "#c8d4e8", "#c8dcc8", "#f0d4b4", "#e0e8f0", "#f9e8d4"];

interface BlockFormProps {
  onSave: (data: {
    title: string;
    start_time: string;
    end_time: string;
    color: string;
    saveAsPreset: boolean;
  }) => void;
  onCancel: () => void;
  timeSlots: string[];
  defaultStartTime?: string;
}

export function BlockForm({ onSave, onCancel, timeSlots, defaultStartTime }: BlockFormProps) {
  const defaultStart = defaultStartTime ?? timeSlots[0] ?? "09:00";
  const defaultEndIndex = Math.min(
    timeSlots.indexOf(defaultStart) + 1,
    timeSlots.length - 1
  );
  const defaultEnd = timeSlots[defaultEndIndex] ?? timeSlots[timeSlots.length - 1] ?? "10:00";

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), start_time: startTime, end_time: endTime, color, saveAsPreset });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <input
        type="text"
        placeholder="활동 이름 (예: 기도, 독서, 운동)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
        required
        autoFocus
      />

      {/* Time selectors */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="block text-xs text-warm-400 mb-1 pl-1">시작</label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-300 text-sm"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
        <span className="text-warm-300 mt-5">—</span>
        <div className="flex-1">
          <label className="block text-xs text-warm-400 mb-1 pl-1">종료</label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-300 text-sm"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs text-warm-400 mb-2 pl-1">색상</label>
        <div className="flex gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: c,
                border: color === c ? `2px solid ${c}` : "2px solid transparent",
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
              }}
              aria-label={`색상 ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Save as preset */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsPreset}
          onChange={(e) => setSaveAsPreset(e.target.checked)}
          className="w-4 h-4 rounded accent-warm-500"
        />
        <span className="text-sm text-warm-500">즐겨찾기에 저장</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
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
