"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 dark:border-[#262c38] bg-white dark:bg-[#1f242e] text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-[#262c38] tap-press ${className}`}
    >
      {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}
