"use client";

import { ReactNode } from "react";

interface FinanceCardProps {
  children: ReactNode;
  groupColor?: string;
  className?: string;
  onClick?: () => void;
}

export function FinanceCard({ children, groupColor, className = "", onClick }: FinanceCardProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={[
        "relative overflow-hidden rounded-2xl bg-white dark:bg-[#1a2030] p-5 shadow-sm",
        "border border-gray-100 dark:border-[#2d3748]",
        onClick ? "cursor-pointer transition-transform active:scale-[0.98] hover:shadow-md" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {groupColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: groupColor }}
        />
      )}
      {children}
    </div>
  );
}
