import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-6 rounded-card bg-gray-50/50 dark:bg-[#1f242e]/50 border border-dashed border-gray-200 dark:border-[#262c38] animate-slide-up-fade ${className}`}
    >
      {icon && (
        <div className="mb-4 text-gray-300 dark:text-gray-600" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
