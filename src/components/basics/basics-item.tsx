"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import { NumberInput } from "@/components/ui/number-input";
import { useToast, vibrate } from "@/components/ui/toast";
import type { BasicsTemplate, BasicsLog } from "@/types/database";

interface BasicsItemProps {
  template: BasicsTemplate;
  log: BasicsLog | undefined;
  onToggle: (logId: string, completed: boolean) => void;
  onUpdateValue: (logId: string, value: number, target: number | null) => void;
}

const ENCOURAGE = [
  "잘하고 있어요",
  "오늘의 한 걸음 완료",
  "좋은 습관 착착",
  "계속 이어가요",
  "꾸준함이 멋져요",
];

function pickEncouragement() {
  return ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
}

export function BasicsItem({ template, log, onToggle, onUpdateValue }: BasicsItemProps) {
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();

  if (!log) return null;

  function handleCheckToggle() {
    const nextDone = !log!.completed;
    onToggle(log!.id, nextDone);
    if (nextDone) {
      vibrate(18);
      toast(pickEncouragement());
    }
  }

  function handleTap() {
    if (template.type === "check") {
      handleCheckToggle();
    } else {
      setShowInput(true);
    }
  }

  // 시간 단위 항목은 편집할 때만 분 단위로 변환해서 다루기 쉽게 함
  const isHourUnit = template.unit === "시간";
  const isMinUnit = template.unit === "분";
  const targetInMinutes = template.target_value
    ? isHourUnit
      ? template.target_value * 60
      : template.target_value
    : 0;
  const editStep =
    isHourUnit || isMinUnit
      ? targetInMinutes >= 300
        ? 60
        : 10
      : template.target_value && template.target_value >= 30
        ? 5
        : 1;
  const editValue = isHourUnit
    ? Math.round(((log.value ?? 0) * 60) / editStep) * editStep
    : (log.value ?? 0);
  const editTarget =
    isHourUnit && template.target_value
      ? template.target_value * 60
      : template.target_value;
  const editUnit = isHourUnit ? "분" : (template.unit ?? "");

  function handleValueSave(v: number) {
    const finalValue = isHourUnit ? Math.round((v / 60) * 100) / 100 : v;
    const completed = template.target_value
      ? finalValue >= template.target_value
      : finalValue > 0;
    onUpdateValue(log!.id, finalValue, template.target_value);
    setShowInput(false);
    if (completed && !log!.completed) {
      vibrate(18);
      toast(pickEncouragement());
    }
  }

  const completed = log.completed;
  const isInProgress =
    !completed &&
    template.type === "number" &&
    template.target_value &&
    (log.value ?? 0) > 0;
  const progressPercent =
    isInProgress && template.target_value
      ? Math.min(100, ((log.value ?? 0) / template.target_value) * 100)
      : 0;

  return (
    <>
      <div
        onClick={handleTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTap();
          }
        }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors tap-press ${
          completed
            ? "bg-primary-50 dark:bg-[#2a2e45]"
            : isInProgress
            ? "bg-amber-50 dark:bg-amber-900/10"
            : "bg-gray-50 dark:bg-[#1f242e] hover:bg-gray-100 dark:hover:bg-[#262c38]"
        }`}
      >
        <Toggle
          checked={completed}
          onChange={handleCheckToggle}
          size="md"
          ariaLabel={`${template.title} 완료`}
        />
        <div className="flex-1 min-w-0">
          <span
            className={`${
              completed
                ? "text-gray-400 dark:text-gray-500 line-through"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {template.title}
          </span>
          {isInProgress && (
            <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 dark:bg-amber-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
        {template.type === "number" && (
          <span
            className={`text-sm tabular-nums whitespace-nowrap ${
              completed
                ? "text-primary-500"
                : isInProgress
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {log.value ?? 0}{template.unit}
            {template.target_value && ` / ${template.target_value}`}
          </span>
        )}
      </div>

      <Modal isOpen={showInput} onClose={() => setShowInput(false)} title={template.title}>
        <NumberInput
          value={editValue}
          unit={editUnit}
          target={editTarget}
          onSave={handleValueSave}
          onClose={() => setShowInput(false)}
          step={editStep}
        />
      </Modal>
    </>
  );
}
