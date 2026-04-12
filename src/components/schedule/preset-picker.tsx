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
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => { onSelect(p); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-warm-50 transition-colors"
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="flex-1 text-left text-warm-700">{p.title}</span>
            <span className="text-warm-400 text-sm">{p.duration}분</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => { onManual(); onClose(); }}
        className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-warm-200 text-warm-400"
      >
        + 직접 입력
      </button>
    </Modal>
  );
}
