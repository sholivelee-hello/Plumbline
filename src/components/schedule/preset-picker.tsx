"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { SchedulePreset } from "@/types/database";

interface PresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  presets: SchedulePreset[];
  onSelect: (preset: SchedulePreset) => void;
  onManual: () => void;
  onUpdate?: (id: string, patch: { title?: string; duration?: number }) => void;
  onDelete?: (id: string) => void;
}

export function PresetPicker({ isOpen, onClose, presets, onSelect, onManual, onUpdate, onDelete }: PresetPickerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDuration, setEditDuration] = useState(30);

  function startEdit(p: SchedulePreset) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDuration(p.duration);
  }

  function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    onUpdate?.(editingId, { title: editTitle.trim(), duration: editDuration });
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="활동 선택">
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {presets.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
            즐겨찾기한 활동이 없어요
          </p>
        ) : (
          presets.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1f242e]">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#161a22] text-sm"
                  autoFocus
                />
                <input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#161a22] text-sm text-right"
                  min={5}
                  step={5}
                />
                <span className="text-xs text-gray-400">분</span>
                <button type="button" onClick={saveEdit} className="p-1 text-primary-500 hover:text-primary-600">
                  <Check size={16} />
                </button>
                <button type="button" onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div key={p.id} className="flex items-center gap-1 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1f242e] transition-colors group">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    onClose();
                  }}
                  className="flex-1 text-left tap-press"
                >
                  <span className="text-gray-900 dark:text-gray-100 text-sm">
                    {p.title}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums ml-2">
                    {p.duration}분
                  </span>
                </button>
                {onUpdate && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="편집"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`"${p.title}" 즐겨찾기를 삭제할까요?`)) onDelete(p.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          )
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
