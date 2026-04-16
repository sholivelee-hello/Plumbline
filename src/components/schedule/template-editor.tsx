"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { WeeklyTemplateBlock } from "@/types/database";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_COLOR = "#7575D8";

interface TemplateEditorProps {
  templateId: string;
  loadBlocks: (id: string) => Promise<WeeklyTemplateBlock[]>;
  onAdd: (block: Omit<WeeklyTemplateBlock, "id">) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<WeeklyTemplateBlock, "id" | "template_id">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TemplateEditor({ templateId, loadBlocks, onAdd, onUpdate, onDelete }: TemplateEditorProps) {
  const [blocks, setBlocks] = useState<WeeklyTemplateBlock[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WeeklyTemplateBlock | null>(null);
  const [initDay, setInitDay] = useState<number>(0);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    (async () => setBlocks(await loadBlocks(templateId)))();
  }, [templateId, loadBlocks]);

  async function refresh() {
    setBlocks(await loadBlocks(templateId));
  }

  function openAddForDay(day: number) {
    setEditing(null);
    setInitDay(day);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setOpen(true);
  }

  function openEdit(b: WeeklyTemplateBlock) {
    setEditing(b);
    setInitDay(b.day_of_week);
    setTitle(b.title);
    setStartTime(b.start_time.slice(0, 5));
    setEndTime(b.end_time.slice(0, 5));
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (editing) {
      await onUpdate(editing.id, {
        day_of_week: initDay,
        start_time: startTime,
        end_time: endTime,
        title: title.trim(),
        color: editing.color || DEFAULT_COLOR,
      });
    } else {
      await onAdd({
        template_id: templateId,
        day_of_week: initDay,
        start_time: startTime,
        end_time: endTime,
        title: title.trim(),
        color: DEFAULT_COLOR,
      });
    }
    setOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!editing) return;
    await onDelete(editing.id);
    setOpen(false);
    await refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 dark:text-gray-500">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((_, day) => {
          const dayBlocks = blocks
            .filter((b) => b.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <button
              key={day}
              type="button"
              onClick={() => openAddForDay(day)}
              className="min-h-[140px] rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 space-y-1 text-left"
            >
              {dayBlocks.length === 0 && (
                <span className="text-[10px] text-gray-300">+ 추가</span>
              )}
              {dayBlocks.map((b) => (
                <div
                  key={b.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(b);
                  }}
                  className="rounded-md px-1.5 py-1 text-[10px] font-medium cursor-pointer bg-primary-50 text-primary-600 dark:bg-[#2a2e45] dark:text-primary-200"
                >
                  <div className="tabular-nums">
                    {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                  </div>
                  <div className="truncate">{b.title}</div>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "블록 편집" : "블록 추가"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1 pl-1">요일</label>
            <select
              value={initDay}
              onChange={(e) => setInitDay(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
            >
              {DAY_LABELS.map((d, i) => (
                <option key={i} value={i}>
                  {d}요일
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] bg-gray-50 dark:bg-[#1f242e] text-sm"
            />
          </div>
          <div className="flex gap-3 pt-1">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl text-red-500 border border-red-200 dark:border-red-800 text-sm"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm"
            >
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
