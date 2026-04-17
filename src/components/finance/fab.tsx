"use client";

import { ReactNode } from "react";
import { Plus } from "lucide-react";

interface FabProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export function Fab({ onClick, icon, label = "추가" }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40",
        "flex items-center justify-center",
        "h-14 w-14 rounded-full",
        "bg-indigo-600 dark:bg-indigo-500 text-white",
        "shadow-lg shadow-indigo-600/30 dark:shadow-indigo-500/30",
        "transition-transform active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
      ].join(" ")}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {icon ?? <Plus size={24} strokeWidth={2.5} />}
    </button>
  );
}
