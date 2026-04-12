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

export function BlockActionSheet({ plan, onClose, onComplete, onEditComplete, onDelete }: BlockActionSheetProps) {
  if (!plan) return null;

  return (
    <Modal isOpen={!!plan} onClose={onClose} title={plan.title}>
      <div className="space-y-2">
        <button
          onClick={() => { onComplete(plan); onClose(); }}
          className="w-full py-3 rounded-xl bg-sage-100 text-sage-600 font-medium hover:bg-sage-200"
        >
          완료 (계획대로)
        </button>
        <button
          onClick={() => { onEditComplete(plan); }}
          className="w-full py-3 rounded-xl bg-sky-100 text-sky-600 font-medium hover:bg-sky-200"
        >
          수정 후 완료
        </button>
        <button
          onClick={() => { onDelete(plan.id); onClose(); }}
          className="w-full py-3 rounded-xl bg-warm-100 text-warm-500 font-medium hover:bg-warm-200"
        >
          삭제
        </button>
        <button onClick={onClose} className="w-full py-2 text-warm-400 text-sm">
          취소
        </button>
      </div>
    </Modal>
  );
}
