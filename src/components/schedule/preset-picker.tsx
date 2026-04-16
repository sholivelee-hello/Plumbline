"use client";

import { Modal } from "@/components/ui/modal";
import type { SchedulePreset } from "@/types/database";

interface PresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  presets: SchedulePreset[];
  onSelect: (preset: SchedulePreset) => void;
  onManual: () => void;
}

export function PresetPicker({ isOpen, onClose, presets, onSelect, onManual }: PresetPickerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="활동 선택">
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {presets.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
            즐겨찾기한 활동이 없어요
          </p>
        ) : (
          presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors tap-press"
            >
              <span className="flex-1 text-left text-gray-900 dark:text-gray-100 text-sm">
                {p.title}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">
                {p.duration}분
              </span>
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onManual();
          onClose();
        }}
        className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#262c38] text-gray-500 dark:text-gray-400 text-sm tap-press"
      >
        + 직접 입력
      </button>
    </Modal>
  );
}
