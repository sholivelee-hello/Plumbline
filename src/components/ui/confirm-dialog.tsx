"use client";

import { useId } from "react";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const descId = useId();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} role="alertdialog" ariaDescribedBy={description ? descId : undefined}>
      <div className="space-y-5">
        {description && (
          <p id={descId} className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-[#262c38] text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1f29] transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 ${
              variant === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-900 dark:bg-white dark:text-gray-900 hover:opacity-90"
            }`}
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
