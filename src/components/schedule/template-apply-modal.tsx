"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { WeeklyTemplate, WeeklyTemplateBlock } from "@/types/database";

interface TemplateApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WeeklyTemplate[];
  loadBlocks: (id: string) => Promise<WeeklyTemplateBlock[]>;
  targetWeekStart: string;
  hasExistingPlans: boolean;
  onApply: (
    blocks: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      title: string;
      color: string;
    }>,
    mode: "overwrite" | "merge"
  ) => Promise<void>;
}

export function TemplateApplyModal({
  isOpen,
  onClose,
  templates,
  loadBlocks,
  targetWeekStart,
  hasExistingPlans,
  onApply,
}: TemplateApplyModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<WeeklyTemplateBlock[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setBlocks([]);
      setConfirming(false);
    }
  }, [isOpen]);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setBlocks(await loadBlocks(id));
    setConfirming(hasExistingPlans);
  }

  async function apply(mode: "overwrite" | "merge") {
    if (!selectedId) return;
    await onApply(
      blocks.map((b) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        title: b.title,
        color: b.color,
      })),
      mode
    );
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={confirming ? "이 주에 이미 일정이 있어요" : `${targetWeekStart} 주에 템플릿 적용`}
    >
      {!selectedId && (
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              템플릿이 없어요. 먼저 만들어주세요.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] hover:bg-gray-50 dark:hover:bg-[#1f242e] text-sm"
              >
                {t.name}
              </button>
            ))
          )}
        </div>
      )}

      {selectedId && !confirming && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {blocks.length}개 블록을 이 주에 추가합니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => apply("merge")}
              className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm"
            >
              적용
            </button>
          </div>
        </div>
      )}

      {selectedId && confirming && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            기존 계획을 어떻게 처리할까요? (실제는 변경되지 않습니다.)
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => apply("overwrite")}
              className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-medium"
            >
              덮어쓰기 (기존 계획 전부 삭제 후 템플릿 적용)
            </button>
            <button
              type="button"
              onClick={() => apply("merge")}
              className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-medium"
            >
              합치기 (기존 계획 유지하고 템플릿 추가)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#262c38] text-gray-600 text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
