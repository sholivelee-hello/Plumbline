"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import { NumberInput } from "@/components/ui/number-input";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsItemProps {
  template: BasicsTemplate;
  log: BasicsLog | undefined;
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

export function BasicsItem({ template, log, onToggle, onUpdateValue }: BasicsItemProps) {
  const [showInput, setShowInput] = useState(false);

  if (!log) return null;

  function handleTap() {
    if (template.type === "check") {
      onToggle(log!.id, !log!.completed);
    } else {
      setShowInput(true);
    }
  }

  return (
    <>
      <div
        onClick={handleTap}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${
          log.completed ? "bg-sage-50" : "bg-warm-50"
        }`}
      >
        <Toggle checked={log.completed} onChange={() => handleTap()} size="md" />
        <span className={`flex-1 ${log.completed ? "text-warm-400 line-through" : "text-warm-700"}`}>
          {template.title}
        </span>
        {template.type === "number" && (
          <span className="text-sm text-warm-400">
            {log.value ?? 0}{template.unit}
            {template.target_value && ` / ${template.target_value}`}
          </span>
        )}
      </div>

      <Modal isOpen={showInput} onClose={() => setShowInput(false)} title={template.title}>
        <NumberInput
          value={log.value}
          unit={template.unit ?? ""}
          target={template.target_value}
          onSave={(v) => {
            onUpdateValue(log!.id, v, template.target_value);
            setShowInput(false);
          }}
          onClose={() => setShowInput(false)}
        />
      </Modal>
    </>
  );
}
