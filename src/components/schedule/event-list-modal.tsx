"use client";

import { Modal } from "@/components/ui/modal";
import type { Event } from "@/types/database";

interface EventListModalProps {
  date: string | null;
  events: Event[];
  onClose: () => void;
  onEdit: (event: Event) => void;
  onAddNew: (date: string) => void;
}

export function EventListModal({ date, events, onClose, onEdit, onAddNew }: EventListModalProps) {
  if (!date) return null;
  const visible = events.filter((e) => e.start_date <= date && e.end_date >= date);

  return (
    <Modal isOpen={!!date} onClose={onClose} title={`${date} 이벤트`}>
      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">이벤트가 없어요</p>
        ) : (
          visible.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onEdit(ev)}
              className="w-full text-left rounded-xl px-3 py-2 flex items-center gap-2 tap-press bg-primary-50 dark:bg-[#2a2e45]"
            >
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                {ev.title}
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {ev.start_date}
                {ev.start_date !== ev.end_date && ` ~ ${ev.end_date}`}
              </span>
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => onAddNew(date)}
          className="w-full py-2.5 rounded-xl border border-dashed border-primary-300 text-primary-600 text-sm font-medium"
        >
          + 새 이벤트
        </button>
      </div>
    </Modal>
  );
}
