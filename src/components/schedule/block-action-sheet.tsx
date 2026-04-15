"use client";

import { Modal } from "@/components/ui/modal";
import type { SchedulePlan } from "@/types/database";

interface BlockActionSheetProps {
  plan: SchedulePlan | null;
  onClose: () => void;
  onComplete: (plan: SchedulePlan) => void;
  onEditComplete: (plan: SchedulePlan) => void;
  onDelete: (planId: string) => void;
}

export function BlockActionSheet({
  plan,
  onClose,
  onComplete,
  onEditComplete,
  onDelete,
}: BlockActionSheetProps) {
  if (!plan) return null;

  return (
    <Modal isOpen={!!plan} onClose={onClose} title={plan.title}>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            onComplete(plan);
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-surplus-50 dark:bg-surplus-700/20 text-surplus-700 dark:text-surplus-300 font-medium hover:bg-surplus-100 dark:hover:bg-surplus-700/30 tap-press"
        >
          완료 (계획대로)
        </button>
        <button
          type="button"
          onClick={() => {
            onEditComplete(plan);
          }}
          className="w-full py-3 rounded-xl bg-primary-100 dark:bg-[#2a2e45] text-primary-600 dark:text-primary-200 font-medium hover:bg-primary-200 dark:hover:bg-[#343b58] tap-press"
        >
          수정 후 완료
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete(plan.id);
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-gray-100 dark:bg-[#1f242e] text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-[#262c38] tap-press"
        >
          삭제
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 text-gray-400 dark:text-gray-500 text-sm"
        >
          취소
        </button>
      </div>
    </Modal>
  );
}
